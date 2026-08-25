import { VideoInfo, VideoFormat, DownloadedVideo, DownloadTask } from '../types';
import { saveDownloadedVideo, formatBytes } from './storage';

export async function fetchVideoInfo(url: string): Promise<VideoInfo> {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    throw new Error('Please enter a valid video URL or YouTube link');
  }

  const response = await fetch('/api/video/info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: trimmedUrl }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to fetch video information (HTTP ${response.status})`
    );
  }

  const data: VideoInfo = await response.json();
  return data;
}

export async function fetchSampleVideos(): Promise<VideoInfo[]> {
  try {
    const res = await fetch('/api/samples');
    if (!res.ok) return [];
    const data = await res.json();
    return data.samples || [];
  } catch (e) {
    console.error('Failed to load samples:', e);
    return [];
  }
}

export function formatSecondsToETA(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return 'Calculating...';
  if (seconds < 60) return `${Math.ceil(seconds)}s left`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs}s left`;
}

export async function downloadAndSaveVideo(
  videoInfo: VideoInfo,
  format: VideoFormat,
  onProgress: (task: DownloadTask) => void,
  abortSignal?: AbortSignal
): Promise<DownloadedVideo> {
  const isAudio = !format.hasVideo || format.container === 'mp3' || format.quality.toLowerCase().includes('audio');
  const targetFormat = isAudio ? 'mp3' : (format.container || 'mp4');

  const downloadUrl = `/api/video/download?url=${encodeURIComponent(videoInfo.url)}&itag=${encodeURIComponent(format.itag)}&format=${targetFormat}&title=${encodeURIComponent(videoInfo.title)}`;

  const task: DownloadTask = {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    videoInfo,
    format,
    progress: 0,
    downloadedBytes: 0,
    totalBytes: 0,
    speed: 0,
    speedFormatted: '0 KB/s',
    eta: 'Starting...',
    status: 'downloading',
    addedAt: Date.now(),
    priority: 0,
  };

  onProgress({ ...task });

  const startTime = Date.now();
  let lastTime = startTime;
  let lastBytes = 0;

  const response = await fetch(downloadUrl, {
    signal: abortSignal,
  });

  if (!response.ok) {
    throw new Error(`Server returned HTTP ${response.status} during download`);
  }

  const contentLengthHeader = response.headers.get('content-length');
  let totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
  if (isNaN(totalBytes) || totalBytes <= 0) {
    // If not provided in header, try estimated format size
    if (format.contentLength) {
      totalBytes = parseInt(format.contentLength, 10);
    }
  }

  task.totalBytes = totalBytes;

  if (!response.body) {
    throw new Error('ReadableStream not supported by browser response body');
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let downloadedBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value) {
        chunks.push(value);
        downloadedBytes += value.length;

        const now = Date.now();
        const timeDiff = (now - lastTime) / 1000;

        // Update progress every 150ms or at completion
        if (timeDiff >= 0.15 || downloadedBytes === totalBytes) {
          const bytesDiff = downloadedBytes - lastBytes;
          const currentSpeed = timeDiff > 0 ? bytesDiff / timeDiff : 0;
          lastTime = now;
          lastBytes = downloadedBytes;

          let percent = 0;
          let etaStr = '';
          if (totalBytes > 0) {
            percent = Math.min(100, Math.round((downloadedBytes / totalBytes) * 100));
            const remainingBytes = totalBytes - downloadedBytes;
            const remainingSec = currentSpeed > 0 ? remainingBytes / currentSpeed : 0;
            etaStr = formatSecondsToETA(remainingSec);
          } else {
            // Indeterminate
            percent = Math.min(95, Math.floor((downloadedBytes / (1024 * 1024)) * 5));
            etaStr = `${formatBytes(downloadedBytes)} downloaded`;
          }

          task.progress = percent;
          task.downloadedBytes = downloadedBytes;
          task.speed = currentSpeed;
          task.speedFormatted = `${formatBytes(currentSpeed)}/s`;
          task.eta = etaStr;
          onProgress({ ...task });
        }
      }
    }

    // Finished downloading stream, now saving to IndexedDB
    task.status = 'saving';
    task.progress = 100;
    task.eta = 'Saving to offline storage...';
    onProgress({ ...task });

    const mimeType = isAudio ? 'audio/mp3' : (format.mimeType || 'video/mp4');
    const finalBlob = new Blob(chunks, { type: mimeType });

    // Download thumbnail blob if available so thumbnail works 100% offline
    let thumbnailBlob: Blob | undefined = undefined;
    if (videoInfo.thumbnail && !videoInfo.thumbnail.startsWith('blob:')) {
      try {
        const thumbRes = await fetch(videoInfo.thumbnail, { signal: AbortSignal.timeout(4000) });
        if (thumbRes.ok) {
          thumbnailBlob = await thumbRes.blob();
        }
      } catch (e) {
        // Non-fatal if thumbnail fails
      }
    }

    const downloadedVideo: DownloadedVideo = {
      id: `offline-video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sourceUrl: videoInfo.url,
      title: videoInfo.title,
      author: videoInfo.author,
      duration: videoInfo.duration,
      durationFormatted: videoInfo.durationFormatted,
      thumbnailUrl: videoInfo.thumbnail,
      thumbnailBlob,
      videoBlob: finalBlob,
      format: targetFormat,
      quality: format.qualityLabel || format.quality,
      fileSize: finalBlob.size,
      fileSizeFormatted: formatBytes(finalBlob.size),
      downloadedAt: Date.now(),
      isFavorite: false,
      tags: [isAudio ? 'Audio' : 'Video', format.qualityLabel.includes('HD') ? 'HD' : 'Standard'],
      type: isAudio ? 'audio' : 'video',
    };

    await saveDownloadedVideo(downloadedVideo);

    task.status = 'completed';
    task.eta = 'Done';
    onProgress({ ...task });

    return downloadedVideo;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      task.status = 'paused';
      task.error = 'Download cancelled by user';
    } else {
      task.status = 'error';
      task.error = err.message || 'Download failed';
    }
    onProgress({ ...task });
    throw err;
  }
}
