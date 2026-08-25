import { getDB, formatBytes, formatDuration, deleteDownloadedVideo, saveDownloadedVideo } from './storage';
import { DownloadedVideo, EncryptedVaultItem, DecryptedVaultItem, VaultConfig } from '../types';

const DEFAULT_VAULT_CONFIG: VaultConfig = {
  isConfigured: true,
  pinHash: '', // default hash will be computed for '7777'
  decoyPinHash: '', // default hash will be computed for '0000'
  autoLockMinutes: 1,
  lockOnBlur: true,
  panicKeyEnabled: true,
  secretCode: '#vault',
};

// In-memory active decrypted state (never saved to disk unencrypted)
let activeKey: CryptoKey | null = null;
let currentProfile: 'master' | 'decoy' | null = null;
let activeDecryptedItems: DecryptedVaultItem[] = [];
let autoLockTimeoutId: any = null;
let vaultListeners: Set<(isUnlocked: boolean, profile: 'master' | 'decoy' | null) => void> = new Set();

/**
 * Computes SHA-256 hash of a string PIN
 */
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Derives an AES-GCM 256-bit encryption key from PIN and salt using PBKDF2
 */
async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts an ArrayBuffer with AES-GCM
 */
async function encryptBuffer(
  buffer: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array
): Promise<ArrayBuffer> {
  return crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
    },
    key,
    buffer
  );
}

/**
 * Decrypts an ArrayBuffer with AES-GCM
 */
async function decryptBuffer(
  encryptedBuffer: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array
): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
    },
    key,
    encryptedBuffer
  );
}

// ----------------- CONFIG & INITIALIZATION -----------------

export async function getVaultConfig(): Promise<VaultConfig> {
  try {
    const db = await getDB();
    const config = await db.get('vault_config', 'config');
    if (config) return config;

    // Initialize defaults with default master PIN 7777 and decoy PIN 0000
    const masterHash = await hashPin('7777');
    const decoyHash = await hashPin('0000');
    const initConfig: VaultConfig = {
      ...DEFAULT_VAULT_CONFIG,
      pinHash: masterHash,
      decoyPinHash: decoyHash,
    };
    await db.put('vault_config', initConfig, 'config');
    return initConfig;
  } catch (e) {
    return DEFAULT_VAULT_CONFIG;
  }
}

export async function updateVaultConfig(updates: Partial<VaultConfig>): Promise<VaultConfig> {
  const current = await getVaultConfig();
  const updated = { ...current, ...updates };
  const db = await getDB();
  await db.put('vault_config', updated, 'config');
  return updated;
}

export async function changeVaultPin(newPin: string, isDecoy: boolean = false): Promise<void> {
  const hash = await hashPin(newPin);
  if (isDecoy) {
    await updateVaultConfig({ decoyPinHash: hash });
  } else {
    await updateVaultConfig({ pinHash: hash });
  }
}

// ----------------- AUTHENTICATION -----------------

export function isVaultUnlocked(): boolean {
  return activeKey !== null && currentProfile !== null;
}

export function getCurrentVaultProfile(): 'master' | 'decoy' | null {
  return currentProfile;
}

export function subscribeVaultState(listener: (isUnlocked: boolean, profile: 'master' | 'decoy' | null) => void): () => void {
  vaultListeners.add(listener);
  listener(isVaultUnlocked(), currentProfile);
  return () => {
    vaultListeners.delete(listener);
  };
}

function notifyVaultState() {
  const unlocked = isVaultUnlocked();
  vaultListeners.forEach((l) => l(unlocked, currentProfile));
}

export function resetAutoLockTimer() {
  if (autoLockTimeoutId) clearTimeout(autoLockTimeoutId);
  autoLockTimeoutId = setTimeout(() => {
    lockVault();
  }, 60 * 1000); // 1 minute inactivity default
}

/**
 * Unlocks the vault given a PIN. Returns 'master' | 'decoy' on success, or null on bad PIN.
 */
export async function unlockVault(pin: string): Promise<'master' | 'decoy' | null> {
  const config = await getVaultConfig();
  const inputHash = await hashPin(pin);

  let profile: 'master' | 'decoy' | null = null;
  if (inputHash === config.pinHash) {
    profile = 'master';
  } else if (inputHash === config.decoyPinHash) {
    profile = 'decoy';
  }

  if (!profile) {
    return null;
  }

  // Derive encryption key from PIN and fixed salt
  const enc = new TextEncoder();
  const salt = enc.encode(`vault-salt-${profile}-${pin}`);
  activeKey = await deriveKey(pin, salt);
  currentProfile = profile;

  resetAutoLockTimer();
  notifyVaultState();

  return profile;
}

/**
 * Panic / Instant Lock: scrubs memory and invalidates all decrypted Object URLs
 */
export function lockVault(): void {
  // Revoke any created blob URLs
  activeDecryptedItems.forEach((item) => {
    if (item.blobUrl) URL.revokeObjectURL(item.blobUrl);
    if (item.thumbnailUrl && item.thumbnailUrl.startsWith('blob:')) {
      URL.revokeObjectURL(item.thumbnailUrl);
    }
  });

  activeDecryptedItems = [];
  activeKey = null;
  currentProfile = null;

  if (autoLockTimeoutId) {
    clearTimeout(autoLockTimeoutId);
    autoLockTimeoutId = null;
  }

  notifyVaultState();
}

// ----------------- ITEM OPERATIONS -----------------

/**
 * Adds an existing downloaded video into the encrypted vault
 */
export async function vaultVideo(video: DownloadedVideo, pin: string = '7777'): Promise<void> {
  const profile = currentProfile || 'master';
  const enc = new TextEncoder();
  const salt = enc.encode(`vault-salt-${profile}-${pin}`);
  const key = activeKey || (await deriveKey(pin, salt));

  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Convert video blob to array buffer
  const videoBuffer = await video.videoBlob.arrayBuffer();
  const encryptedVideoBuffer = await encryptBuffer(videoBuffer, key, iv);
  const encryptedVideoBlob = new Blob([encryptedVideoBuffer], { type: 'application/octet-stream' });

  // Encrypt metadata
  const metaObject = {
    title: video.title,
    author: video.author,
    duration: video.duration,
    durationFormatted: video.durationFormatted,
    format: video.format,
    quality: video.quality,
    resolution: video.resolution,
    type: video.type,
    tags: video.tags || [],
    notes: video.notes,
  };

  const metaBuffer = enc.encode(JSON.stringify(metaObject)).buffer;
  const encryptedMetaBuffer = await encryptBuffer(metaBuffer, key, iv);
  const ivBase64 = btoa(String.fromCharCode(...iv));
  const saltBase64 = btoa(String.fromCharCode(...salt));
  const metaBase64 = btoa(String.fromCharCode(...new Uint8Array(encryptedMetaBuffer)));

  const encryptedItem: EncryptedVaultItem = {
    id: `vault-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    encryptedBlob: encryptedVideoBlob,
    encryptedMeta: metaBase64,
    iv: ivBase64,
    salt: saltBase64,
    type: video.type || 'video',
    vaultedAt: Date.now(),
    fileSizeBytes: encryptedVideoBlob.size,
    fileSizeFormatted: formatBytes(encryptedVideoBlob.size),
    profileId: profile,
  };

  const db = await getDB();
  await db.put('vault_items', encryptedItem);

  // Remove from normal public library
  await deleteDownloadedVideo(video.id);
}

/**
 * Imports a local file directly into the encrypted vault
 */
export async function importDirectToVault(file: File, pin: string = '7777'): Promise<void> {
  const profile = currentProfile || 'master';
  const enc = new TextEncoder();
  const salt = enc.encode(`vault-salt-${profile}-${pin}`);
  const key = activeKey || (await deriveKey(pin, salt));

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const fileBuffer = await file.arrayBuffer();
  const encryptedBuffer = await encryptBuffer(fileBuffer, key, iv);
  const encryptedBlob = new Blob([encryptedBuffer], { type: 'application/octet-stream' });

  const isAudio = file.type.startsWith('audio') || file.name.endsWith('.mp3') || file.name.endsWith('.wav');
  const metaObject = {
    title: file.name.replace(/\.[^/.]+$/, ''),
    author: 'Encrypted Import',
    duration: 180,
    durationFormatted: '03:00',
    format: isAudio ? 'mp3' : 'mp4',
    quality: 'Original Vault Encrypted',
    type: isAudio ? 'audio' : 'video',
    tags: ['Private', 'Encrypted Direct Import'],
  };

  const metaBuffer = enc.encode(JSON.stringify(metaObject)).buffer;
  const encryptedMetaBuffer = await encryptBuffer(metaBuffer, key, iv);
  const ivBase64 = btoa(String.fromCharCode(...iv));
  const saltBase64 = btoa(String.fromCharCode(...salt));
  const metaBase64 = btoa(String.fromCharCode(...new Uint8Array(encryptedMetaBuffer)));

  const encryptedItem: EncryptedVaultItem = {
    id: `vault-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    encryptedBlob,
    encryptedMeta: metaBase64,
    iv: ivBase64,
    salt: saltBase64,
    type: isAudio ? 'audio' : 'video',
    vaultedAt: Date.now(),
    fileSizeBytes: encryptedBlob.size,
    fileSizeFormatted: formatBytes(encryptedBlob.size),
    profileId: profile,
  };

  const db = await getDB();
  await db.put('vault_items', encryptedItem);
}

/**
 * Retrieves and decrypts all vault items for the currently unlocked profile
 */
export async function getDecryptedVaultItems(): Promise<DecryptedVaultItem[]> {
  if (!activeKey || !currentProfile) return [];

  resetAutoLockTimer();

  try {
    const db = await getDB();
    const allEncrypted: EncryptedVaultItem[] = await db.getAll('vault_items');
    const profileItems = allEncrypted.filter((item) => item.profileId === currentProfile);

    // If decoy profile and empty, generate harmless decoy files
    if (currentProfile === 'decoy' && profileItems.length === 0) {
      return [
        {
          id: 'decoy-1',
          title: 'Personal Financial Budget Notes',
          author: 'Encrypted Archive',
          duration: 60,
          durationFormatted: '01:00',
          type: 'audio',
          format: 'mp3',
          quality: 'Protected Audio Note',
          fileSizeFormatted: '1.2 MB',
          videoBlob: new Blob(['decoy-audio-data'], { type: 'audio/mp3' }),
          vaultedAt: Date.now() - 86400000 * 3,
          profileId: 'decoy',
          tags: ['Personal', 'Archive'],
        }
      ];
    }

    const decryptedList: DecryptedVaultItem[] = [];

    for (const item of profileItems) {
      try {
        const iv = new Uint8Array(
          atob(item.iv)
            .split('')
            .map((c) => c.charCodeAt(0))
        );

        // Decrypt metadata
        const metaBytes = new Uint8Array(
          atob(item.encryptedMeta)
            .split('')
            .map((c) => c.charCodeAt(0))
        );
        const decMetaBuffer = await decryptBuffer(metaBytes.buffer, activeKey, iv);
        const decMetaStr = new TextDecoder().decode(decMetaBuffer);
        const meta = JSON.parse(decMetaStr);

        // Decrypt video blob
        const encBlobBuffer = await item.encryptedBlob.arrayBuffer();
        const decVideoBuffer = await decryptBuffer(encBlobBuffer, activeKey, iv);
        const mime = item.type === 'audio' ? 'audio/mp3' : 'video/mp4';
        const videoBlob = new Blob([decVideoBuffer], { type: mime });
        const blobUrl = URL.createObjectURL(videoBlob);

        decryptedList.push({
          id: item.id,
          title: meta.title || 'Untitled Private Media',
          author: meta.author || 'Encrypted Author',
          duration: meta.duration || 0,
          durationFormatted: meta.durationFormatted || formatDuration(meta.duration || 0),
          type: item.type,
          format: meta.format || 'mp4',
          quality: meta.quality || 'Encrypted HD',
          fileSizeFormatted: item.fileSizeFormatted,
          videoBlob,
          blobUrl,
          vaultedAt: item.vaultedAt,
          profileId: item.profileId,
          tags: meta.tags || [],
        });
      } catch (err) {
        console.warn('Failed to decrypt vault item:', item.id, err);
      }
    }

    activeDecryptedItems = decryptedList;
    return decryptedList;
  } catch (e) {
    console.error('Failed to get vault items:', e);
    return [];
  }
}

/**
 * Restores a vaulted item back to the public Downloaded Library
 */
export async function unvaultVideo(vaultItemId: string): Promise<DownloadedVideo | null> {
  if (!activeKey || !currentProfile) throw new Error('Vault is locked');

  const db = await getDB();
  const encryptedItem: EncryptedVaultItem = await db.get('vault_items', vaultItemId);
  if (!encryptedItem) return null;

  const iv = new Uint8Array(
    atob(encryptedItem.iv)
      .split('')
      .map((c) => c.charCodeAt(0))
  );

  // Decrypt metadata & video
  const metaBytes = new Uint8Array(
    atob(encryptedItem.encryptedMeta)
      .split('')
      .map((c) => c.charCodeAt(0))
  );
  const decMetaBuffer = await decryptBuffer(metaBytes.buffer, activeKey, iv);
  const meta = JSON.parse(new TextDecoder().decode(decMetaBuffer));

  const encBlobBuffer = await encryptedItem.encryptedBlob.arrayBuffer();
  const decVideoBuffer = await decryptBuffer(encBlobBuffer, activeKey, iv);
  const mime = encryptedItem.type === 'audio' ? 'audio/mp3' : 'video/mp4';
  const videoBlob = new Blob([decVideoBuffer], { type: mime });

  const restoredVideo: DownloadedVideo = {
    id: `restored-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sourceUrl: 'https://vault.restored/item',
    title: meta.title || 'Restored Video',
    author: meta.author || 'Universal Library',
    duration: meta.duration || 10,
    durationFormatted: meta.durationFormatted || formatDuration(meta.duration || 10),
    videoBlob,
    format: meta.format || 'mp4',
    quality: meta.quality || '1080p',
    fileSize: videoBlob.size,
    fileSizeFormatted: formatBytes(videoBlob.size),
    downloadedAt: Date.now(),
    isFavorite: false,
    tags: [...(meta.tags || []), 'Restored from Vault'],
    type: encryptedItem.type === 'audio' ? 'audio' : 'video',
    folder: 'Downloads',
    category: encryptedItem.type === 'audio' ? 'audio' : 'video',
  };

  await saveDownloadedVideo(restoredVideo);
  await db.delete('vault_items', vaultItemId);

  return restoredVideo;
}

/**
 * Permanently deletes an item from the vault
 */
export async function deleteVaultItem(vaultItemId: string): Promise<void> {
  const db = await getDB();
  await db.delete('vault_items', vaultItemId);
}
