import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { 
  DownloadedVideo, 
  StorageStats, 
  Playlist, 
  AppSettings, 
  SubtitleTrack 
} from '../types';

interface VideoDB extends DBSchema {
  videos: {
    key: string;
    value: DownloadedVideo;
    indexes: {
      'by-date': number;
      'by-favorite': number;
      'by-type': string;
      'by-plays': number;
    };
  };
  playlists: {
    key: string;
    value: Playlist;
    indexes: {
      'by-date': number;
      'by-name': string;
    };
  };
  settings: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'offline_media_downloader_db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<VideoDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<VideoDB>> {
  if (!dbPromise) {
    dbPromise = openDB<VideoDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains('videos')) {
          const store = db.createObjectStore('videos', { keyPath: 'id' });
          store.createIndex('by-date', 'downloadedAt');
          store.createIndex('by-favorite', 'isFavorite');
          store.createIndex('by-type', 'type');
          store.createIndex('by-plays', 'playCount');
        }

        if (!db.objectStoreNames.contains('playlists')) {
          const playlistStore = db.createObjectStore('playlists', { keyPath: 'id' });
          playlistStore.createIndex('by-date', 'createdAt');
          playlistStore.createIndex('by-name', 'name');
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      },
    });
  }
  return dbPromise;
}

export function formatBytes(bytes: number): string {
  if (isNaN(bytes) || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i > 1 ? 1 : 0)} ${sizes[i]}`;
}

export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (h > 0) {
    return `${h}:${remM.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ----------------- VIDEOS / MEDIA -----------------

export async function saveDownloadedVideo(video: DownloadedVideo): Promise<void> {
  const db = await getDB();
  const enhancedVideo: DownloadedVideo = {
    ...video,
    playCount: video.playCount || 0,
    lastPlayedAt: video.lastPlayedAt || undefined,
    lastPosition: video.lastPosition || 0,
  };
  await db.put('videos', enhancedVideo);
}

export async function getAllDownloadedVideos(): Promise<DownloadedVideo[]> {
  try {
    const db = await getDB();
    const videos = await db.getAllFromIndex('videos', 'by-date');
    return videos.reverse(); // newest first
  } catch (err) {
    console.error('Failed to retrieve offline videos:', err);
    return [];
  }
}

export async function getDownloadedVideo(id: string): Promise<DownloadedVideo | undefined> {
  const db = await getDB();
  return db.get('videos', id);
}

export async function deleteDownloadedVideo(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('videos', id);

  // Also remove from any playlists
  const playlists = await getAllPlaylists();
  for (const pl of playlists) {
    if (pl.videoIds.includes(id)) {
      pl.videoIds = pl.videoIds.filter((vId) => vId !== id);
      pl.updatedAt = Date.now();
      await db.put('playlists', pl);
    }
  }
}

export async function toggleFavoriteVideo(id: string): Promise<boolean> {
  const db = await getDB();
  const video = await db.get('videos', id);
  if (video) {
    video.isFavorite = !video.isFavorite;
    await db.put('videos', video);
    return video.isFavorite;
  }
  return false;
}

export async function updateVideoMetadata(
  id: string,
  updates: Partial<DownloadedVideo>
): Promise<DownloadedVideo | undefined> {
  const db = await getDB();
  const video = await db.get('videos', id);
  if (video) {
    const updated = { ...video, ...updates };
    await db.put('videos', updated);
    return updated;
  }
  return undefined;
}

export async function recordVideoPlayback(id: string, positionSeconds?: number): Promise<void> {
  try {
    const db = await getDB();
    const video = await db.get('videos', id);
    if (video) {
      video.playCount = (video.playCount || 0) + 1;
      video.lastPlayedAt = Date.now();
      if (positionSeconds !== undefined) {
        video.lastPosition = positionSeconds;
      }
      await db.put('videos', video);
    }
  } catch (e) {
    console.error('Failed to record playback:', e);
  }
}

export async function addSubtitlesToVideo(id: string, subtitle: SubtitleTrack): Promise<void> {
  const db = await getDB();
  const video = await db.get('videos', id);
  if (video) {
    const subs = video.subtitles || [];
    video.subtitles = [...subs.filter(s => s.id !== subtitle.id), subtitle];
    await db.put('videos', video);
  }
}

export async function removeSubtitlesFromVideo(id: string, subtitleId: string): Promise<void> {
  const db = await getDB();
  const video = await db.get('videos', id);
  if (video && video.subtitles) {
    video.subtitles = video.subtitles.filter(s => s.id !== subtitleId);
    await db.put('videos', video);
  }
}

// ----------------- PLAYLISTS -----------------

export async function getAllPlaylists(): Promise<Playlist[]> {
  try {
    const db = await getDB();
    const playlists = await db.getAllFromIndex('playlists', 'by-date');
    return playlists.reverse();
  } catch (err) {
    console.error('Failed to get playlists:', err);
    return [];
  }
}

export async function getPlaylist(id: string): Promise<Playlist | undefined> {
  const db = await getDB();
  return db.get('playlists', id);
}

export async function createPlaylist(name: string, description?: string, initialVideoIds: string[] = []): Promise<Playlist> {
  const db = await getDB();
  const newPlaylist: Playlist = {
    id: `playlist-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim(),
    description: description?.trim() || '',
    videoIds: initialVideoIds,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await db.put('playlists', newPlaylist);
  return newPlaylist;
}

export async function updatePlaylist(id: string, updates: Partial<Playlist>): Promise<Playlist | undefined> {
  const db = await getDB();
  const pl = await db.get('playlists', id);
  if (pl) {
    const updated: Playlist = { ...pl, ...updates, updatedAt: Date.now() };
    await db.put('playlists', updated);
    return updated;
  }
  return undefined;
}

export async function deletePlaylist(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('playlists', id);
}

export async function addVideoToPlaylist(playlistId: string, videoId: string): Promise<void> {
  const db = await getDB();
  const pl = await db.get('playlists', playlistId);
  if (pl && !pl.videoIds.includes(videoId)) {
    pl.videoIds.push(videoId);
    pl.updatedAt = Date.now();
    await db.put('playlists', pl);
  }
}

export async function removeVideoFromPlaylist(playlistId: string, videoId: string): Promise<void> {
  const db = await getDB();
  const pl = await db.get('playlists', playlistId);
  if (pl) {
    pl.videoIds = pl.videoIds.filter((vId) => vId !== videoId);
    pl.updatedAt = Date.now();
    await db.put('playlists', pl);
  }
}

// ----------------- SETTINGS & STATS -----------------

const DEFAULT_SETTINGS: AppSettings = {
  defaultQuality: '1080p',
  defaultFormat: 'mp4',
  maxConcurrentDownloads: 2,
  enableNotifications: true,
  enableBackgroundTasks: true,
  autoResumeDownloads: true,
  cloudWorkerBackup: true,
  hardwareAcceleration: true,
};

export async function getAppSettings(): Promise<AppSettings> {
  try {
    const db = await getDB();
    const settings = await db.get('settings', 'app_config');
    return settings ? { ...DEFAULT_SETTINGS, ...settings } : DEFAULT_SETTINGS;
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

export async function saveAppSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getAppSettings();
  const updated = { ...current, ...settings };
  const db = await getDB();
  await db.put('settings', updated, 'app_config');
  return updated;
}

export async function getStorageStats(): Promise<StorageStats> {
  try {
    const videos = await getAllDownloadedVideos();
    let totalVideoBytes = 0;
    let totalSecs = 0;
    let videoCount = 0;
    let audioCount = 0;

    for (const v of videos) {
      totalVideoBytes += v.fileSize || v.videoBlob?.size || 0;
      totalSecs += v.duration || 0;
      if (v.type === 'audio') {
        audioCount++;
      } else {
        videoCount++;
      }
    }

    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || totalVideoBytes;
      const quota = estimate.quota || 10 * 1024 * 1024 * 1024; // Default 10GB
      const percent = quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;

      return {
        usedBytes: used,
        quotaBytes: quota,
        percentUsed: percent,
        formattedUsed: formatBytes(used),
        formattedQuota: formatBytes(quota),
        videoCount,
        audioCount,
        totalDurationFormatted: formatDuration(totalSecs),
      };
    }

    return {
      usedBytes: totalVideoBytes,
      quotaBytes: 10 * 1024 * 1024 * 1024,
      percentUsed: 1,
      formattedUsed: formatBytes(totalVideoBytes),
      formattedQuota: '10 GB (est.)',
      videoCount,
      audioCount,
      totalDurationFormatted: formatDuration(totalSecs),
    };
  } catch (e) {
    return {
      usedBytes: 0,
      quotaBytes: 10 * 1024 * 1024 * 1024,
      percentUsed: 0,
      formattedUsed: '0 MB',
      formattedQuota: 'Unknown',
      videoCount: 0,
      audioCount: 0,
      totalDurationFormatted: '0:00',
    };
  }
}

export async function seedDefaultVideosIfEmpty(): Promise<DownloadedVideo[]> {
  try {
    const existing = await getAllDownloadedVideos();
    if (existing.length > 0) return existing;

    // Seed curated items matching Nothing CMF design philosophy
    const defaultSeeds: Omit<DownloadedVideo, 'videoBlob'>[] = [
      {
        id: 'seed-minimal-design',
        sourceUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        title: 'Minimal Design Inspiration',
        author: 'Industrial Design Studio',
        duration: 272,
        durationFormatted: '04:32',
        thumbnailUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80',
        format: 'mp4',
        quality: '1080p',
        resolution: '1920x1080',
        fps: 60,
        fileSize: 52.1 * 1024 * 1024,
        fileSizeFormatted: '52.1 MB',
        downloadedAt: Date.now() - 3600 * 1000 * 2,
        isFavorite: true,
        playCount: 14,
        tags: ['Design', 'Minimalism', 'Industrial'],
        type: 'video',
      },
      {
        id: 'seed-interview-designers',
        title: 'Interview with Designers',
        sourceUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        author: 'Nothing CMF Labs',
        duration: 195,
        durationFormatted: '03:15',
        thumbnailUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&auto=format&fit=crop&q=80',
        format: 'mp4',
        quality: '720p',
        resolution: '1280x720',
        fps: 30,
        fileSize: 32.4 * 1024 * 1024,
        fileSizeFormatted: '32.4 MB',
        downloadedAt: Date.now() - 3600 * 1000 * 5,
        isFavorite: false,
        playCount: 8,
        tags: ['Interview', 'CMF', 'Nothing'],
        type: 'video',
      },
      {
        id: 'seed-future-technology',
        title: 'Future of Technology',
        sourceUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
        author: 'Hardware Future Collective',
        duration: 307,
        durationFormatted: '05:07',
        thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
        format: 'mp4',
        quality: '1080p',
        resolution: '1920x1080',
        fps: 60,
        fileSize: 61.3 * 1024 * 1024,
        fileSizeFormatted: '61.3 MB',
        downloadedAt: Date.now() - 3600 * 1000 * 24,
        isFavorite: false,
        playCount: 5,
        tags: ['Technology', 'Hardware', 'Futurism'],
        type: 'video',
      },
      {
        id: 'seed-ambient-audio',
        title: 'Industrial Ambient Beats (CMF OST)',
        sourceUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        author: 'Minimal Audio Lab',
        duration: 195,
        durationFormatted: '03:15',
        thumbnailUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
        format: 'mp3',
        quality: '320kbps MP3',
        fileSize: 4.8 * 1024 * 1024,
        fileSizeFormatted: '4.8 MB',
        downloadedAt: Date.now() - 3600 * 1000 * 12,
        isFavorite: true,
        playCount: 22,
        tags: ['Audio', 'Ambient', 'Soundtrack'],
        type: 'audio',
      }
    ];

    const db = await getDB();
    for (const item of defaultSeeds) {
      const blob = new Blob(['sample-media-binary-data'], { type: item.type === 'audio' ? 'audio/mp3' : 'video/mp4' });
      const videoData: DownloadedVideo = {
        ...item,
        videoBlob: blob,
      };
      await db.put('videos', videoData);
    }

    // Seed default smart playlists
    const defaultPlaylists: Playlist[] = [
      {
        id: 'pl-favorites',
        name: 'Starred Favorites',
        description: 'Your favorite offline tracks & videos',
        videoIds: ['seed-minimal-design', 'seed-ambient-audio'],
        createdAt: Date.now() - 3600 * 1000 * 24,
        updatedAt: Date.now(),
        isSmart: true,
        smartType: 'favorites',
      },
      {
        id: 'pl-design-collection',
        name: 'Design & Engineering',
        description: 'Hardware, CMF and product design talks',
        videoIds: ['seed-minimal-design', 'seed-interview-designers', 'seed-future-technology'],
        createdAt: Date.now() - 3600 * 1000 * 10,
        updatedAt: Date.now(),
      }
    ];

    for (const pl of defaultPlaylists) {
      await db.put('playlists', pl);
    }

    return getAllDownloadedVideos();
  } catch (e) {
    console.error('Failed to seed default videos:', e);
    return [];
  }
}

export function exportVideoToFile(video: DownloadedVideo): void {
  const ext = video.format || (video.type === 'audio' ? 'mp3' : 'mp4');
  const safeTitle = video.title.replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'video';
  const filename = `${safeTitle}.${ext}`;

  const url = URL.createObjectURL(video.videoBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
