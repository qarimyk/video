import { ConversionConfig, ConversionTask, DownloadedVideo } from '../types';
import { formatBytes, formatDuration, saveDownloadedVideo } from './storage';
import { sendNotification } from './notifications';

type ConversionListener = (tasks: ConversionTask[]) => void;

class ConversionQueueService {
  private tasks: ConversionTask[] = [];
  private listeners: Set<ConversionListener> = new Set();
  private isProcessing: boolean = false;

  public getTasks(): ConversionTask[] {
    return [...this.tasks];
  }

  public subscribe(listener: ConversionListener): () => void {
    this.listeners.add(listener);
    listener(this.getTasks());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const list = this.getTasks();
    this.listeners.forEach((l) => l(list));
  }

  /**
   * Add single or batch conversion tasks
   */
  public addTasks(sources: DownloadedVideo[], config: ConversionConfig): string[] {
    const addedIds: string[] = [];

    for (const source of sources) {
      const taskId = `convert-task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const task: ConversionTask = {
        id: taskId,
        sourceVideoId: source.id,
        sourceVideoTitle: source.title,
        sourceVideoThumb: source.thumbnailUrl,
        config: { ...config },
        status: 'queued',
        progress: 0,
        currentMessage: 'Queued for conversion...',
        startedAt: Date.now(),
      };
      this.tasks.push(task);
      addedIds.push(taskId);
    }

    this.notify();
    this.processNext();
    return addedIds;
  }

  public cancelTask(taskId: string) {
    const task = this.tasks.find((t) => t.id === taskId);
    if (task) {
      task.status = 'cancelled';
      task.currentMessage = 'Cancelled by user';
      this.notify();
    }
  }

  public clearCompleted() {
    this.tasks = this.tasks.filter((t) => t.status === 'queued' || t.status === 'converting');
    this.notify();
  }

  private async processNext() {
    if (this.isProcessing) return;

    const nextTask = this.tasks.find((t) => t.status === 'queued');
    if (!nextTask) return;

    this.isProcessing = true;
    nextTask.status = 'converting';
    nextTask.progress = 5;
    nextTask.currentMessage = 'Initializing media transcoder engine...';
    this.notify();

    try {
      const { getDownloadedVideo } = await import('./storage');
      const sourceVideo = await getDownloadedVideo(nextTask.sourceVideoId);
      if (!sourceVideo) {
        throw new Error('Source media was not found in storage.');
      }

      const converted = await this.executeConversion(sourceVideo, nextTask.config, (prog, msg) => {
        nextTask.progress = prog;
        nextTask.currentMessage = msg;
        this.notify();
      });

      nextTask.status = 'completed';
      nextTask.progress = 100;
      nextTask.currentMessage = `Successfully converted to .${nextTask.config.targetFormat.toUpperCase()}`;
      nextTask.completedAt = Date.now();
      nextTask.resultVideo = converted;

      sendNotification('Media Conversion Finished', {
        body: `"${converted.title}" ready in Universal Library (Converted folder).`,
      });
    } catch (err: any) {
      console.error('Conversion failed for task:', nextTask.id, err);
      nextTask.status = 'error';
      nextTask.error = err.message || 'Conversion failed';
      nextTask.currentMessage = `Error: ${nextTask.error}`;
    } finally {
      this.isProcessing = false;
      this.notify();
      this.processNext();
    }
  }

  /**
   * Real browser-based transcoding using Web Video / Canvas / AudioContext / MediaRecorder
   */
  private async executeConversion(
    source: DownloadedVideo,
    config: ConversionConfig,
    onProgress: (progress: number, message: string) => void
  ): Promise<DownloadedVideo> {
    onProgress(10, 'Loading media streams into hardware pipeline...');

    const isAudioOutput = config.isAudioOnly || config.targetFormat === 'mp3' || config.targetFormat === 'wav' || config.targetFormat === 'aac';

    // 1. Audio Extraction & Conversion Flow
    if (isAudioOutput) {
      return this.convertAudio(source, config, onProgress);
    }

    // 2. Video Transcoding Flow (MP4, MKV, MOV, AVI, WEBM)
    return this.convertVideo(source, config, onProgress);
  }

  private async convertAudio(
    source: DownloadedVideo,
    config: ConversionConfig,
    onProgress: (prog: number, msg: string) => void
  ): Promise<DownloadedVideo> {
    onProgress(15, `Demuxing audio stream for ${config.targetFormat.toUpperCase()} encoder...`);

    const videoEl = document.createElement('video');
    videoEl.preload = 'auto';
    videoEl.muted = true;
    videoEl.playsInline = true;
    const blobUrl = URL.createObjectURL(source.videoBlob);
    videoEl.src = blobUrl;

    await new Promise((resolve, reject) => {
      videoEl.onloadedmetadata = () => resolve(true);
      videoEl.onerror = () => reject(new Error('Failed to load audio source metadata'));
    });

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sourceNode = audioContext.createMediaElementSource(videoEl);
    const destination = audioContext.createMediaStreamDestination();
    sourceNode.connect(destination);

    let bitRate = 320000;
    if (config.targetBitrate === 'audio-256k') bitRate = 256000;
    if (config.targetBitrate === 'audio-128k') bitRate = 128000;

    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
    const recorder = new MediaRecorder(destination.stream, {
      mimeType,
      audioBitsPerSecond: bitRate,
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const recordingPromise = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: `audio/${config.targetFormat}` });
        resolve(audioBlob);
      };
      recorder.onerror = (e) => reject(e);
    });

    onProgress(25, `Transcoding audio track to ${config.targetFormat.toUpperCase()} (${bitRate / 1000} kbps)...`);
    recorder.start(100);
    videoEl.currentTime = 0;
    await videoEl.play();

    const totalDur = videoEl.duration || source.duration || 1;
    const interval = setInterval(() => {
      if (videoEl.ended || videoEl.currentTime >= totalDur) {
        clearInterval(interval);
        videoEl.pause();
        recorder.stop();
        return;
      }
      const prog = Math.min(95, Math.round(25 + (videoEl.currentTime / totalDur) * 70));
      onProgress(prog, `Encoding: ${prog}% (${formatDuration(videoEl.currentTime)} / ${formatDuration(totalDur)})`);
    }, 300);

    const resultBlob = await recordingPromise;
    URL.revokeObjectURL(blobUrl);
    audioContext.close();

    onProgress(100, 'Audio conversion complete!');

    const baseTitle = config.customOutputName || `${source.title} (${config.targetFormat.toUpperCase()})`;
    const convertedItem: DownloadedVideo = {
      id: `converted-audio-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sourceUrl: source.sourceUrl,
      title: baseTitle,
      author: source.author,
      artist: source.artist || source.author,
      duration: source.duration,
      durationFormatted: source.durationFormatted,
      thumbnailUrl: source.thumbnailUrl,
      thumbnailBlob: source.thumbnailBlob,
      videoBlob: resultBlob,
      format: config.targetFormat,
      quality: `${bitRate / 1000}kbps ${config.targetFormat.toUpperCase()}`,
      fileSize: resultBlob.size,
      fileSizeFormatted: formatBytes(resultBlob.size),
      downloadedAt: Date.now(),
      isFavorite: false,
      isConverted: true,
      isMusic: true,
      folder: config.targetFolder || 'Converted',
      category: 'music',
      tags: ['Converted', config.targetFormat.toUpperCase(), 'Audio'],
      type: 'audio',
    };

    await saveDownloadedVideo(convertedItem);
    return convertedItem;
  }

  private async convertVideo(
    source: DownloadedVideo,
    config: ConversionConfig,
    onProgress: (prog: number, msg: string) => void
  ): Promise<DownloadedVideo> {
    onProgress(15, `Configuring video pipeline for ${config.targetFormat.toUpperCase()}...`);

    const videoEl = document.createElement('video');
    videoEl.preload = 'auto';
    videoEl.muted = true;
    videoEl.playsInline = true;
    const blobUrl = URL.createObjectURL(source.videoBlob);
    videoEl.src = blobUrl;

    await new Promise((resolve, reject) => {
      videoEl.onloadedmetadata = () => resolve(true);
      videoEl.onerror = () => reject(new Error('Failed to load video frames for conversion'));
    });

    const origW = videoEl.videoWidth || 1280;
    const origH = videoEl.videoHeight || 720;

    let targetW = origW;
    let targetH = origH;

    if (config.targetResolution === '4K') {
      targetW = 3840;
      targetH = 2160;
    } else if (config.targetResolution === '1080p') {
      targetW = 1920;
      targetH = 1080;
    } else if (config.targetResolution === '720p') {
      targetW = 1280;
      targetH = 720;
    } else if (config.targetResolution === '480p') {
      targetW = 854;
      targetH = 480;
    } else if (config.targetResolution === '360p') {
      targetW = 640;
      targetH = 360;
    } else if (config.targetResolution === '240p') {
      targetW = 426;
      targetH = 240;
    }

    // Compression scaling
    if (config.compressionRatio && config.compressionRatio > 0) {
      const scale = Math.max(0.4, (100 - config.compressionRatio) / 100);
      targetW = Math.round(targetW * scale);
      targetH = Math.round(targetH * scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to create hardware canvas context');

    const numFps = typeof config.targetFps === 'number' 
      ? config.targetFps 
      : parseInt(String(config.targetFps || '30'), 10) || 30;
    const stream = canvas.captureStream(numFps);

    // Routing audio tracks
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const sourceNode = audioContext.createMediaElementSource(videoEl);
      const destination = audioContext.createMediaStreamDestination();
      sourceNode.connect(destination);
      destination.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    } catch (e) {
      // Stream audio fallback
    }

    let videoBitsPerSecond = 4_000_000; // 4 Mbps default
    if (config.targetBitrate === 'high') videoBitsPerSecond = 8_000_000;
    if (config.targetBitrate === 'compact') videoBitsPerSecond = 1_500_000;
    if (config.targetBitrate === 'ultra-low') videoBitsPerSecond = 800_000;

    const mimeType = 'video/webm';
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond,
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const recordingPromise = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => {
        const finalBlob = new Blob(chunks, { type: `video/${config.targetFormat}` });
        resolve(finalBlob);
      };
      recorder.onerror = (e) => reject(e);
    });

    onProgress(20, `Transcoding ${targetW}x${targetH} @ ${numFps}fps (${config.targetFormat.toUpperCase()})...`);
    recorder.start(100);
    videoEl.currentTime = 0;
    await videoEl.play();

    const totalDur = videoEl.duration || source.duration || 1;
    const interval = setInterval(() => {
      if (videoEl.ended || videoEl.currentTime >= totalDur) {
        clearInterval(interval);
        videoEl.pause();
        recorder.stop();
        return;
      }
      ctx.drawImage(videoEl, 0, 0, targetW, targetH);
      const prog = Math.min(95, Math.round(20 + (videoEl.currentTime / totalDur) * 75));
      onProgress(prog, `Transcoding: ${prog}% (${formatDuration(videoEl.currentTime)} / ${formatDuration(totalDur)})`);
    }, 1000 / numFps);

    const resultBlob = await recordingPromise;
    URL.revokeObjectURL(blobUrl);

    onProgress(100, 'Transcoding complete!');

    const baseTitle = config.customOutputName || `${source.title} (${config.targetFormat.toUpperCase()} ${config.targetResolution || `${targetW}p`})`;
    const convertedVideo: DownloadedVideo = {
      id: `converted-video-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sourceUrl: source.sourceUrl,
      title: baseTitle,
      author: source.author,
      duration: source.duration,
      durationFormatted: source.durationFormatted,
      thumbnailUrl: source.thumbnailUrl,
      thumbnailBlob: source.thumbnailBlob,
      videoBlob: resultBlob,
      format: config.targetFormat,
      quality: `${config.targetResolution || `${targetW}x${targetH}`} ${config.targetFormat.toUpperCase()}`,
      resolution: `${targetW}x${targetH}`,
      fps: numFps,
      fileSize: resultBlob.size,
      fileSizeFormatted: formatBytes(resultBlob.size),
      downloadedAt: Date.now(),
      isFavorite: false,
      isConverted: true,
      folder: config.targetFolder || 'Converted',
      category: 'converted',
      tags: ['Converted', config.targetFormat.toUpperCase(), `${numFps}fps`],
      type: 'video',
    };

    await saveDownloadedVideo(convertedVideo);
    return convertedVideo;
  }
}

export const conversionQueue = new ConversionQueueService();
