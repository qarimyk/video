export interface VideoFormat {
  itag: string;
  quality: string;
  qualityLabel: string;
  container: string;
  mimeType: string;
  hasVideo: boolean;
  hasAudio: boolean;
  approxSize?: string;
  contentLength?: string;
  fps?: number;
  width?: number;
  height?: number;
  bitrate?: number;
  url?: string;
}

export interface VideoInfo {
  id: string;
  title: string;
  author: string;
  duration: number;
  durationFormatted: string;
  thumbnail: string;
  viewCount?: string;
  description?: string;
  url: string;
  type: 'youtube' | 'direct' | 'sample' | 'local' | 'vimeo' | 'dailymotion';
  notice?: string;
  formats: VideoFormat[];
}

export interface SubtitleTrack {
  id: string;
  label: string;
  language: string;
  cues: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

export interface DownloadedVideo {
  id: string;
  sourceUrl: string;
  title: string;
  author: string;
  artist?: string;
  album?: string;
  duration: number;
  durationFormatted: string;
  thumbnailUrl?: string;
  thumbnailBlob?: Blob;
  videoBlob: Blob;
  format: 'mp4' | 'webm' | 'mp3' | 'm4a' | 'wav' | 'aac' | 'mkv' | 'mov' | 'avi' | string;
  quality: string;
  resolution?: string; // e.g. 1920x1080, 1280x720, 3840x2160 (4K)
  fps?: number;
  bitrate?: number | string;
  fileSize: number;
  fileSizeFormatted: string;
  downloadedAt: number;
  isFavorite?: boolean;
  tags?: string[];
  type: 'video' | 'audio';
  category?: 'video' | 'audio' | 'music' | 'image' | 'converted';
  folder?: string; // 'Downloads' | 'Converted' | 'Imported' | custom folder name
  isMusic?: boolean;
  isConverted?: boolean;
  isImported?: boolean;
  isVaulted?: boolean;
  playCount?: number;
  lastPlayedAt?: number;
  lastPosition?: number;
  subtitles?: SubtitleTrack[];
  notes?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverThumbnail?: string;
  videoIds: string[];
  createdAt: number;
  updatedAt: number;
  isSmart?: boolean;
  smartType?: 'recent' | 'favorites' | 'most-played' | 'audio-only' | 'videos-only' | 'converted';
}

export interface MediaFolder {
  id: string;
  name: string;
  isDefault?: boolean;
  icon?: string;
  createdAt: number;
  itemCount?: number;
  totalSizeBytes?: number;
  formattedSize?: string;
}

export type DownloadStatus = 'queued' | 'downloading' | 'paused' | 'saving' | 'completed' | 'error' | 'cancelled';

export interface DownloadTask {
  id: string;
  videoInfo: VideoInfo;
  format: VideoFormat;
  progress: number; // 0 to 100
  downloadedBytes: number;
  totalBytes: number;
  speed: number; // bytes per second
  speedFormatted: string;
  eta: string;
  status: DownloadStatus;
  error?: string;
  addedAt: number;
  completedAt?: number;
  priority?: number;
  retryCount?: number;
  abortController?: AbortController;
  blob?: Blob;
  targetFolder?: string;
}

export interface StorageStats {
  usedBytes: number;
  quotaBytes: number;
  percentUsed: number;
  formattedUsed: string;
  formattedQuota: string;
  videoCount: number;
  audioCount: number;
  musicCount?: number;
  convertedCount?: number;
  totalDurationFormatted: string;
}

export type PlaybackRepeatMode = 'off' | 'all' | 'one';

export interface PlayerQueueItem {
  id: string;
  video: DownloadedVideo;
  addedAt: number;
}

export type MediaFormat = 'mp4' | 'mkv' | 'mov' | 'avi' | 'webm' | 'mp3' | 'wav' | 'aac' | string;
export type ConversionResolution = '4K' | '1080p' | '720p' | '480p' | '360p' | '240p' | 'original';
export type ConversionBitrate = 'high' | 'balanced' | 'compact' | 'ultra-low' | 'audio-320k' | 'audio-256k' | 'audio-128k' | string;
export type ConversionFps = '60' | '30' | '24' | 'original' | 60 | 30 | 24;
export type LibraryCategoryFilter = 'all' | 'videos' | 'audio' | 'music' | 'favorites' | 'playlists' | 'folders' | 'recent';
export type SortOption = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'size-desc' | 'size-asc' | 'duration-desc' | 'duration-asc' | 'play-count';

export interface ConversionConfig {
  targetFormat: 'mp4' | 'mkv' | 'mov' | 'avi' | 'webm' | 'mp3' | 'wav' | 'aac' | string;
  targetResolution?: ConversionResolution;
  targetFps?: ConversionFps;
  targetBitrate?: ConversionBitrate;
  compressionRatio?: number; // 0 (original) to 80 (% reduction)
  isAudioOnly?: boolean;
  customOutputName?: string;
  targetFolder?: string;
}

export interface ConversionTask {
  id: string;
  sourceVideoId: string;
  sourceVideoTitle: string;
  sourceVideoThumb?: string;
  config: ConversionConfig;
  status: 'queued' | 'converting' | 'completed' | 'error' | 'cancelled';
  progress: number;
  currentMessage?: string;
  startedAt: number;
  completedAt?: number;
  error?: string;
  resultVideo?: DownloadedVideo;
}

export interface ProcessingOptions {
  // Trim options
  startTime?: number;
  endTime?: number;
  
  // Compression options
  compressionLevel?: 'low' | 'balanced' | 'max';
  targetBitrate?: number;
  
  // Audio extraction
  audioFormat?: 'mp3' | 'wav' | 'aac';
  
  // Transform options
  rotation?: 0 | 90 | 180 | 270;
  cropAspect?: 'original' | '16:9' | '9:16' | '1:1' | '4:3';
  targetResolution?: '4K' | '1080p' | '720p' | '480p' | '360p' | '240p' | 'original';
  targetFps?: 24 | 30 | 60 | 'original';
  
  // Merge / Split
  mergeVideoIds?: string[];
  splitChunkDuration?: number;
  
  // Frames
  frameInterval?: number;
  frameCount?: number;
}

export interface ProcessingTask {
  id: string;
  toolType: 'trim' | 'compress' | 'extract-audio' | 'rotate' | 'crop' | 'change-res-fps' | 'merge' | 'split' | 'extract-frames' | 'subtitles' | 'convert';
  sourceVideoId: string;
  sourceVideoTitle: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  options: ProcessingOptions;
  resultVideo?: DownloadedVideo;
  extractedFrames?: string[];
  error?: string;
  startedAt: number;
  finishedAt?: number;
}

// ----------------- SLEEP TIMER -----------------
export type SleepTimerDuration = '15m' | '30m' | '45m' | '60m' | 'end-of-media' | 'end-of-playlist' | 'custom';

export interface SleepTimerState {
  isActive: boolean;
  durationMode: SleepTimerDuration;
  totalSeconds: number;
  remainingSeconds: number;
  fadeOutVolume: boolean; // Optional volume fade out over final 30s
  targetEndTime: number | null;
  targetTrigger?: 'time' | 'end-of-media' | 'end-of-playlist';
}

// ----------------- PRIVACY VAULT -----------------
export interface EncryptedVaultItem {
  id: string;
  encryptedBlob: Blob; // AES-GCM 256 encrypted payload
  encryptedMeta: string; // AES-GCM 256 encrypted JSON string (title, author, tags, duration, etc.)
  iv: string; // Base64 initialization vector
  salt: string; // Base64 salt for PBKDF2 key derivation
  type: 'video' | 'audio' | 'note';
  vaultedAt: number;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  profileId: string; // 'master' or 'decoy'
}

export interface DecryptedVaultItem {
  id: string;
  title: string;
  author: string;
  duration: number;
  durationFormatted: string;
  type: 'video' | 'audio' | 'note';
  format: string;
  quality: string;
  fileSizeFormatted: string;
  videoBlob: Blob;
  blobUrl?: string;
  thumbnailUrl?: string;
  vaultedAt: number;
  profileId: string;
  tags?: string[];
}

export interface VaultConfig {
  isConfigured: boolean;
  pinHash?: string; // SHA-256 hash of Master PIN (default: 7777)
  decoyPinHash?: string; // SHA-256 hash of Decoy PIN (default: 0000)
  autoLockMinutes: number; // 1, 5, 10, or 0 (disabled)
  lockOnBlur: boolean;
  panicKeyEnabled: boolean;
  secretCode: string; // e.g. '#vault' or '*#777#*'
}

export interface AppSettings {
  defaultQuality: string;
  defaultFormat: string;
  maxConcurrentDownloads: number;
  enableNotifications: boolean;
  enableBackgroundTasks: boolean;
  autoResumeDownloads: boolean;
  cloudWorkerBackup: boolean;
  hardwareAcceleration: boolean;
  defaultFolder: string;
  autoOrganizeMusic: boolean;
}
