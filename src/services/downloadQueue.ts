import { VideoInfo, VideoFormat, DownloadTask, DownloadedVideo, DownloadStatus } from '../types';
import { saveDownloadedVideo, formatBytes } from './storage';
import { sendNotification } from './notifications';

export type QueueListener = (tasks: DownloadTask[], activeCount: number) => void;

class DownloadQueueManager {
  private queue: DownloadTask[] = [];
  private listeners: Set<QueueListener> = new Set();
  private maxConcurrent: number = 2;
  private isProcessing: boolean = false;
  private onCompletedCallback?: (video: DownloadedVideo) => void;

  constructor() {
    // Restore any previously active task definitions from localStorage metadata if needed
  }

  public setOnCompletedCallback(cb: (video: DownloadedVideo) => void) {
    this.onCompletedCallback = cb;
  }

  public setMaxConcurrent(max: number) {
    this.maxConcurrent = Math.max(1, Math.min(5, max));
    this.processQueue();
  }

  public subscribe(listener: QueueListener): () => void {
    this.listeners.add(listener);
    listener([...this.queue], this.getActiveCount());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const list = [...this.queue];
    const activeCount = this.getActiveCount();
    this.listeners.forEach((l) => l(list, activeCount));
  }

  public getTasks(): DownloadTask[] {
    return [...this.queue];
  }

  public getActiveCount(): number {
    return this.queue.filter((t) => t.status === 'downloading' || t.status === 'saving').length;
  }

  public getQueuedCount(): number {
    return this.queue.filter((t) => t.status === 'queued').length;
  }

  public addToQueue(videoInfo: VideoInfo, format: VideoFormat, priority: number = 0): string {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const task: DownloadTask = {
      id: taskId,
      videoInfo,
      format,
      progress: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      speed: 0,
      speedFormatted: '0 KB/s',
      eta: 'Queued...',
      status: 'queued',
      addedAt: Date.now(),
      priority,
      retryCount: 0,
    };

    this.queue.push(task);
    this.notify();
    this.processQueue();
    return taskId;
  }

  public addMultipleToQueue(items: Array<{ videoInfo: VideoInfo; format: VideoFormat }>): string[] {
    const taskIds: string[] = [];
    items.forEach((item, idx) => {
      const id = this.addToQueue(item.videoInfo, item.format, items.length - idx);
      taskIds.push(id);
    });
    return taskIds;
  }

  public pauseTask(taskId: string) {
    const task = this.queue.find((t) => t.id === taskId);
    if (task) {
      if (task.status === 'downloading' && task.abortController) {
        task.abortController.abort();
      }
      task.status = 'paused';
      task.eta = 'Paused';
      task.speedFormatted = '0 KB/s';
      this.notify();
      this.processQueue();
    }
  }

  public pauseAll() {
    this.queue.forEach((task) => {
      if (task.status === 'downloading' || task.status === 'queued') {
        if (task.abortController) {
          task.abortController.abort();
        }
        task.status = 'paused';
        task.eta = 'Paused';
        task.speedFormatted = '0 KB/s';
      }
    });
    this.notify();
  }

  public resumeAll() {
    this.queue.forEach((task) => {
      if (task.status === 'paused' || task.status === 'error' || task.status === 'cancelled') {
        task.status = 'queued';
        task.error = undefined;
        task.eta = 'Waiting in queue...';
      }
    });
    this.notify();
    this.processQueue();
  }

  public resumeTask(taskId: string) {
    const task = this.queue.find((t) => t.id === taskId);
    if (task && (task.status === 'paused' || task.status === 'error' || task.status === 'cancelled')) {
      task.status = 'queued';
      task.error = undefined;
      task.eta = 'Waiting in queue...';
      this.notify();
      this.processQueue();
    }
  }

  public cancelTask(taskId: string) {
    const task = this.queue.find((t) => t.id === taskId);
    if (task) {
      if (task.abortController) {
        task.abortController.abort();
      }
      task.status = 'cancelled';
      task.eta = 'Cancelled';
      this.notify();
      this.processQueue();
    }
  }

  public retryTask(taskId: string) {
    const task = this.queue.find((t) => t.id === taskId);
    if (task) {
      task.status = 'queued';
      task.error = undefined;
      task.progress = 0;
      task.downloadedBytes = 0;
      task.retryCount = (task.retryCount || 0) + 1;
      task.eta = 'Retrying...';
      this.notify();
      this.processQueue();
    }
  }

  public removeTask(taskId: string) {
    const idx = this.queue.findIndex((t) => t.id === taskId);
    if (idx !== -1) {
      const task = this.queue[idx];
      if (task.abortController) {
        task.abortController.abort();
      }
      this.queue.splice(idx, 1);
      this.notify();
      this.processQueue();
    }
  }

  public clearCompleted() {
    this.queue = this.queue.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');
    this.notify();
  }

  public reorderQueue(startIndex: number, endIndex: number) {
    const result = Array.from(this.queue);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    this.queue = result;
    this.notify();
  }

  public prioritizeTask(taskId: string) {
    const idx = this.queue.findIndex((t) => t.id === taskId);
    if (idx > 0) {
      const [task] = this.queue.splice(idx, 1);
      task.priority = (task.priority || 0) + 10;
      this.queue.unshift(task);
      this.notify();
      this.processQueue();
    }
  }

  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (true) {
        const activeCount = this.getActiveCount();
        if (activeCount >= this.maxConcurrent) {
          break;
        }

        // Find next queued task with highest priority or oldest addedAt
        const queuedTasks = this.queue.filter((t) => t.status === 'queued');
        if (queuedTasks.length === 0) {
          break;
        }

        queuedTasks.sort((a, b) => (b.priority || 0) - (a.priority || 0) || a.addedAt - b.addedAt);
        const nextTask = queuedTasks[0];

        // Start executing download asynchronously without blocking the loop
        this.executeDownload(nextTask);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeDownload(task: DownloadTask) {
    const { videoInfo, format } = task;
    const isAudio = !format.hasVideo || format.container === 'mp3' || format.quality.toLowerCase().includes('audio') || format.container === 'wav' || format.container === 'aac';
    const targetFormat = isAudio ? (format.container || 'mp3') : (format.container || 'mp4');

    const downloadUrl = `/api/video/download?url=${encodeURIComponent(videoInfo.url)}&itag=${encodeURIComponent(format.itag)}&format=${targetFormat}&title=${encodeURIComponent(videoInfo.title)}`;

    const controller = new AbortController();
    task.abortController = controller;
    task.status = 'downloading';
    task.eta = 'Connecting...';
    this.notify();

    let lastTime = Date.now();
    let lastBytes = 0;

    try {
      const response = await fetch(downloadUrl, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const contentLengthHeader = response.headers.get('content-length');
      let totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
      if (isNaN(totalBytes) || totalBytes <= 0) {
        if (format.contentLength) {
          totalBytes = parseInt(format.contentLength, 10);
        }
      }
      task.totalBytes = totalBytes;

      if (!response.body) {
        throw new Error('ReadableStream not supported');
      }

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let downloadedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
          chunks.push(value);
          downloadedBytes += value.length;

          const now = Date.now();
          const timeDiff = (now - lastTime) / 1000;

          if (timeDiff >= 0.2 || downloadedBytes === totalBytes) {
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
              if (remainingSec < 60) {
                etaStr = `${Math.ceil(remainingSec)}s remaining`;
              } else {
                const mins = Math.floor(remainingSec / 60);
                const secs = Math.floor(remainingSec % 60);
                etaStr = `${mins}m ${secs}s remaining`;
              }
            } else {
              percent = Math.min(95, Math.floor((downloadedBytes / (1024 * 1024)) * 4));
              etaStr = `${formatBytes(downloadedBytes)} downloaded`;
            }

            task.progress = percent;
            task.downloadedBytes = downloadedBytes;
            task.speed = currentSpeed;
            task.speedFormatted = `${formatBytes(currentSpeed)}/s`;
            task.eta = etaStr;
            this.notify();
          }
        }
      }

      // Saving phase
      task.status = 'saving';
      task.progress = 100;
      task.eta = 'Writing to offline storage...';
      this.notify();

      const mimeType = isAudio ? `audio/${targetFormat}` : (format.mimeType || 'video/mp4');
      const finalBlob = new Blob(chunks, { type: mimeType });

      let thumbnailBlob: Blob | undefined = undefined;
      if (videoInfo.thumbnail && !videoInfo.thumbnail.startsWith('blob:')) {
        try {
          const thumbRes = await fetch(videoInfo.thumbnail, { signal: AbortSignal.timeout(3000) });
          if (thumbRes.ok) {
            thumbnailBlob = await thumbRes.blob();
          }
        } catch (e) {
          // ignore
        }
      }

      const downloadedVideo: DownloadedVideo = {
        id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
        playCount: 0,
        tags: [isAudio ? 'Audio' : 'Video', format.qualityLabel.includes('HD') || format.qualityLabel.includes('4K') ? 'HD' : 'Standard'],
        type: isAudio ? 'audio' : 'video',
      };

      await saveDownloadedVideo(downloadedVideo);

      task.status = 'completed';
      task.completedAt = Date.now();
      task.eta = 'Completed';
      task.speedFormatted = '0 KB/s';
      this.notify();

      sendNotification('Download Complete', {
        body: `"${downloadedVideo.title}" is ready for offline playback.`,
      });

      if (this.onCompletedCallback) {
        this.onCompletedCallback(downloadedVideo);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Paused or cancelled
        const currentStatus = task.status as string;
        if (currentStatus !== 'paused' && currentStatus !== 'cancelled') {
          task.status = 'cancelled';
        }
      } else {
        task.status = 'error';
        task.error = err.message || 'Download failed';
        task.eta = 'Failed';
        sendNotification('Download Error', {
          body: `Failed to download "${videoInfo.title}": ${err.message}`,
        });
      }
      this.notify();
    } finally {
      task.abortController = undefined;
      this.processQueue();
    }
  }
}

export const downloadQueue = new DownloadQueueManager();
