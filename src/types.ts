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
  duration: number;
  durationFormatted: string;
  thumbnailUrl?: string;
  thumbnailBlob?: Blob;
  videoBlob: Blob;
  format: 'mp4' | 'webm' | 'mp3' | 'm4a' | 'wav' | 'aac' | 'mkv' | string;
  quality: string;
  resolution?: string; // e.g. 1920x1080, 1280x720
  fps?: number;
  fileSize: number;
  fileSizeFormatted: string;
  downloadedAt: number;
  isFavorite?: boolean;
  tags?: string[];
  type: 'video' | 'audio';
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
  smartType?: 'recent' | 'favorites' | 'most-played' | 'audio-only' | 'videos-only';
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
  priority?: number; // Higher is processed first
  retryCount?: number;
  abortController?: AbortController;
  blob?: Blob;
}

export interface StorageStats {
  usedBytes: number;
  quotaBytes: number;
  percentUsed: number;
  formattedUsed: string;
  formattedQuota: string;
  videoCount: number;
  audioCount: number;
  totalDurationFormatted: string;
}

export type PlaybackRepeatMode = 'off' | 'all' | 'one';

export interface PlayerQueueItem {
  id: string;
  video: DownloadedVideo;
  addedAt: number;
}

export interface ProcessingOptions {
  // Trim options
  startTime?: number;
  endTime?: number;
  
  // Compression options
  compressionLevel?: 'low' | 'balanced' | 'max'; // low = high quality, max = small size
  targetBitrate?: number;
  
  // Audio extraction
  audioFormat?: 'mp3' | 'wav' | 'aac';
  
  // Transform options
  rotation?: 0 | 90 | 180 | 270;
  cropAspect?: 'original' | '16:9' | '9:16' | '1:1' | '4:3';
  targetResolution?: '1080p' | '720p' | '480p' | '360p' | 'original';
  targetFps?: 24 | 30 | 60 | 'original';
  
  // Merge / Split
  mergeVideoIds?: string[];
  splitChunkDuration?: number; // seconds
  
  // Frames
  frameInterval?: number;
  frameCount?: number;
}

export interface ProcessingTask {
  id: string;
  toolType: 'trim' | 'compress' | 'extract-audio' | 'rotate' | 'crop' | 'change-res-fps' | 'merge' | 'split' | 'extract-frames' | 'subtitles';
  sourceVideoId: string;
  sourceVideoTitle: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  options: ProcessingOptions;
  resultVideo?: DownloadedVideo;
  extractedFrames?: string[]; // Blob URLs or data URLs
  error?: string;
  startedAt: number;
  finishedAt?: number;
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
}
