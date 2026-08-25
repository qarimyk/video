import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Unlock, 
  X, 
  Eye, 
  EyeOff, 
  Play, 
  Upload, 
  Trash2, 
  RotateCcw, 
  KeyRound, 
  Settings, 
  AlertTriangle, 
  HardDrive, 
  Sparkles, 
  FileText, 
  Music, 
  Video as VideoIcon,
  CheckCircle2,
  FolderLock
} from 'lucide-react';
import { DecryptedVaultItem, VaultConfig } from '../types';
import { 
  unlockVault, 
  lockVault, 
  isVaultUnlocked, 
  getCurrentVaultProfile, 
  getDecryptedVaultItems, 
  importDirectToVault, 
  unvaultVideo, 
  deleteVaultItem,
  getVaultConfig,
  updateVaultConfig,
  changeVaultPin
} from '../services/vault';

interface PrivacyVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayMedia?: (media: any) => void;
  onItemRestored?: () => void;
}

export const PrivacyVaultModal: React.FC<PrivacyVaultModalProps> = ({
  isOpen,
  onClose,
  onPlayMedia,
  onItemRestored,
}) => {
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<'master' | 'decoy' | null>(null);
  const [items, setItems] = useState<DecryptedVaultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'media' | 'notes' | 'settings'>('media');
  
  // Settings state
  const [config, setConfig] = useState<VaultConfig | null>(null);
  const [newMasterPin, setNewMasterPin] = useState('');
  const [newDecoyPin, setNewDecoyPin] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);

  // Direct import
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Active playing preview
  const [activePlaybackItem, setActivePlaybackItem] = useState<DecryptedVaultItem | null>(null);

  useEffect(() => {
    if (isOpen) {
      const unlocked = isVaultUnlocked();
      setIsUnlocked(unlocked);
      setCurrentProfile(getCurrentVaultProfile());
      if (unlocked) {
        loadItems();
      } else {
        setPin('');
        setPinError(false);
      }
    }
  }, [isOpen]);

  // Global panic key listener (Escape key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isUnlocked) {
        handlePanicLock();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isUnlocked]);

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const data = await getDecryptedVaultItems();
      setItems(data);
      const cfg = await getVaultConfig();
      setConfig(cfg);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinInput = async (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setPinError(false);

    if (newPin.length === 4) {
      const profile = await unlockVault(newPin);
      if (profile) {
        setIsUnlocked(true);
        setCurrentProfile(profile);
        setPin('');
        loadItems();
      } else {
        setPinError(true);
        setTimeout(() => {
          setPin('');
          setPinError(false);
        }, 800);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setPinError(false);
  };

  const handlePanicLock = () => {
    lockVault();
    setIsUnlocked(false);
    setCurrentProfile(null);
    setActivePlaybackItem(null);
    setPin('');
    onClose();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        await importDirectToVault(files[i]);
      }
      await loadItems();
    } catch (err) {
      console.error('Import to vault failed:', err);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUnvault = async (itemId: string) => {
    try {
      await unvaultVideo(itemId);
      await loadItems();
      onItemRestored?.();
    } catch (err) {
      console.error('Failed to restore from vault:', err);
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      await deleteVaultItem(itemId);
      await loadItems();
    } catch (err) {
      console.error('Failed to delete vault item:', err);
    }
  };

  const handleSaveSettings = async () => {
    try {
      if (newMasterPin.length === 4) {
        await changeVaultPin(newMasterPin, false);
      }
      if (newDecoyPin.length === 4) {
        await changeVaultPin(newDecoyPin, true);
      }
      if (config) {
        await updateVaultConfig(config);
      }
      setSettingsSuccess('Vault security preferences saved.');
      setTimeout(() => setSettingsSuccess(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in"
      onClick={handlePanicLock}
    >
      <div 
        className="w-full max-w-2xl max-h-[92vh] bg-white rounded-[32px] p-5 sm:p-8 shadow-2xl border border-neutral-200 flex flex-col text-neutral-900 animate-in zoom-in-95 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Stealth Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isUnlocked ? (currentProfile === 'master' ? 'bg-black text-white' : 'bg-neutral-800 text-neutral-300') : 'bg-neutral-100 text-neutral-700'
            }`}>
              <FolderLock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-neutral-950 uppercase font-mono">
                  {isUnlocked 
                    ? (currentProfile === 'master' ? 'SECURE VAULT' : 'PERSONAL ARCHIVE') 
                    : 'SECURITY ACCESS'}
                </h2>
                {isUnlocked && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-bold ${
                    currentProfile === 'master' ? 'bg-black text-white' : 'bg-neutral-200 text-neutral-700'
                  }`}>
                    {currentProfile === 'master' ? 'AES-256' : 'SAFE'}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 font-normal">
                {isUnlocked ? `${items.length} encrypted items · Zero-knowledge storage` : 'Enter 4-digit PIN to authenticate'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isUnlocked && (
              <button
                onClick={handlePanicLock}
                className="px-3 py-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-red-200"
                title="Panic Lock (Esc)"
              >
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                <span>Panic Lock</span>
              </button>
            )}

            <button
              onClick={handlePanicLock}
              className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 1. LOCKED STATE: PIN PAD */}
        {!isUnlocked ? (
          <div className="flex-1 flex flex-col items-center justify-center py-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-3xl bg-neutral-100 text-neutral-900 flex items-center justify-center mx-auto mb-3 border border-neutral-200">
                <Lock className="w-6 h-6 stroke-[2]" />
              </div>
              <h3 className="text-sm font-semibold tracking-wide text-neutral-900 uppercase font-mono">
                Authentication Required
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Default Master PIN: <span className="font-mono text-neutral-700 font-semibold">7777</span> · Decoy: <span className="font-mono text-neutral-700 font-semibold">0000</span>
              </p>
            </div>

            {/* PIN Dots Display */}
            <div className="flex items-center gap-4 mb-8">
              {[0, 1, 2, 3].map((i) => {
                const filled = pin.length > i;
                return (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                      pinError 
                        ? 'border-red-500 bg-red-500 animate-bounce'
                        : filled
                        ? 'border-black bg-black scale-110'
                        : 'border-neutral-300 bg-transparent'
                    }`}
                  />
                );
              })}
            </div>

            {/* Keypad Grid */}
            <div className="grid grid-cols-3 gap-3 w-64">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handlePinInput(digit)}
                  className="w-18 h-14 rounded-2xl bg-neutral-50 hover:bg-neutral-100 active:bg-neutral-200 border border-neutral-200/80 text-lg font-mono font-semibold text-neutral-900 flex items-center justify-center transition-all active:scale-95"
                >
                  {digit}
                </button>
              ))}
              <div />
              <button
                onClick={() => handlePinInput('0')}
                className="w-18 h-14 rounded-2xl bg-neutral-50 hover:bg-neutral-100 active:bg-neutral-200 border border-neutral-200/80 text-lg font-mono font-semibold text-neutral-900 flex items-center justify-center transition-all active:scale-95"
              >
                0
              </button>
              <button
                onClick={handleBackspace}
                className="w-18 h-14 rounded-2xl bg-neutral-50 hover:bg-neutral-100 active:bg-neutral-200 border border-neutral-200/80 text-xs font-mono font-semibold text-neutral-500 flex items-center justify-center transition-all active:scale-95"
              >
                DEL
              </button>
            </div>
          </div>
        ) : (
          /* 2. UNLOCKED STATE: VAULT BROWSER */
          <div className="flex-1 flex flex-col min-h-0 pt-3">
            {/* Tabs */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5 flex-shrink-0">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveTab('media')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    activeTab === 'media' ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  Private Media ({items.length})
                </button>
                <button
                  onClick={() => setActiveTab('notes')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    activeTab === 'notes' ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  Secure Notes
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                    activeTab === 'settings' ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Vault Settings</span>
                </button>
              </div>

              {/* Direct Import Button */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportFile}
                  multiple
                  accept="video/*,audio/*"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-full bg-black text-white hover:bg-neutral-800 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import File</span>
                </button>
              </div>
            </div>

            {/* Tab 1: Private Media */}
            {activeTab === 'media' && (
              <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
                {items.length === 0 ? (
                  <div className="py-16 text-center text-neutral-400">
                    <ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-30 stroke-[1.5]" />
                    <p className="text-sm font-semibold text-neutral-700">Vault is empty</p>
                    <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
                      Use the "Add to Vault" option from the Universal Library cards or click "Import File" above to encrypt media.
                    </p>
                  </div>
                ) : (
                  items.map((item) => (
                    <div 
                      key={item.id}
                      className="p-3.5 rounded-2xl border border-neutral-200/90 bg-white hover:border-neutral-300 transition-all flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0 border border-neutral-200 text-neutral-700">
                          {item.type === 'audio' ? <Music className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs sm:text-sm font-semibold text-neutral-900 truncate">{item.title}</h4>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-500 font-mono">
                            <span>.{item.format}</span>
                            <span>·</span>
                            <span>{item.fileSizeFormatted}</span>
                            <span>·</span>
                            <span>{item.durationFormatted}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => setActivePlaybackItem(item)}
                          className="px-3 py-1.5 rounded-full bg-black text-white hover:bg-neutral-800 text-xs font-semibold flex items-center gap-1 transition-all"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Play</span>
                        </button>
                        
                        <button
                          onClick={() => handleUnvault(item.id)}
                          className="p-2 rounded-full hover:bg-neutral-100 text-neutral-600 transition-colors"
                          title="Restore to public library"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 rounded-full hover:bg-red-50 text-neutral-400 hover:text-red-600 transition-colors"
                          title="Permanently Shred"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 2: Secure Notes */}
            {activeTab === 'notes' && (
              <div className="flex-1 overflow-y-auto py-4 space-y-3">
                <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-neutral-700" />
                    <h4 className="text-xs font-bold uppercase font-mono">Zero-Knowledge Hardware Enclave</h4>
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Media files in the Vault are encrypted using 256-bit AES-GCM encryption with keys derived on-the-fly from your PIN via PBKDF2. Vaulted media is completely isolated from normal search indexes, gallery apps, and system storage scrapers.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 3: Settings */}
            {activeTab === 'settings' && config && (
              <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                <div className="p-4 rounded-2xl border border-neutral-200 space-y-3">
                  <h4 className="text-xs font-bold uppercase font-mono text-neutral-900">PIN Configuration</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-neutral-600 block mb-1">New Master PIN (4 digits)</label>
                      <input
                        type="password"
                        maxLength={4}
                        placeholder="Current: 7777"
                        value={newMasterPin}
                        onChange={(e) => setNewMasterPin(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-mono focus:outline-none focus:border-black"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-neutral-600 block mb-1">New Decoy PIN (4 digits)</label>
                      <input
                        type="password"
                        maxLength={4}
                        placeholder="Current: 0000"
                        value={newDecoyPin}
                        onChange={(e) => setNewDecoyPin(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-mono focus:outline-none focus:border-black"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-neutral-200 space-y-3">
                  <h4 className="text-xs font-bold uppercase font-mono text-neutral-900">Auto-Lock & Security</h4>
                  <div className="space-y-2">
                    <label className="flex items-center justify-between text-xs text-neutral-700 cursor-pointer">
                      <span>Lock immediately on window blur / tab switch</span>
                      <input
                        type="checkbox"
                        checked={config.lockOnBlur}
                        onChange={(e) => setConfig({ ...config, lockOnBlur: e.target.checked })}
                        className="w-4 h-4 rounded text-black focus:ring-black"
                      />
                    </label>

                    <label className="flex items-center justify-between text-xs text-neutral-700 cursor-pointer">
                      <span>Enable Emergency Panic Key (Escape key)</span>
                      <input
                        type="checkbox"
                        checked={config.panicKeyEnabled}
                        onChange={(e) => setConfig({ ...config, panicKeyEnabled: e.target.checked })}
                        className="w-4 h-4 rounded text-black focus:ring-black"
                      />
                    </label>
                  </div>
                </div>

                {settingsSuccess && (
                  <p className="text-xs text-green-700 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{settingsSuccess}</span>
                  </p>
                )}

                <button
                  onClick={handleSaveSettings}
                  className="px-5 py-2.5 rounded-full bg-black text-white hover:bg-neutral-800 text-xs font-semibold transition-all shadow-xs"
                >
                  Save Security Preferences
                </button>
              </div>
            )}
          </div>
        )}

        {/* Private In-Vault Video Player Sub-Modal */}
        {activePlaybackItem && (
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="w-full max-w-2xl bg-neutral-950 rounded-3xl p-5 border border-neutral-800 text-white flex flex-col animate-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-neutral-400" />
                  <span className="text-xs font-mono font-semibold uppercase truncate max-w-xs sm:max-w-md">
                    {activePlaybackItem.title}
                  </span>
                </div>
                <button
                  onClick={() => setActivePlaybackItem(null)}
                  className="w-7 h-7 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                {activePlaybackItem.type === 'audio' ? (
                  <div className="text-center p-6">
                    <div className="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto mb-3">
                      <Music className="w-8 h-8 text-neutral-400 animate-pulse" />
                    </div>
                    <audio
                      src={activePlaybackItem.blobUrl}
                      controls
                      autoPlay
                      className="w-full max-w-md mx-auto"
                    />
                  </div>
                ) : (
                  <video
                    src={activePlaybackItem.blobUrl}
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
