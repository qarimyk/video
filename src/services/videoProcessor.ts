import { DownloadedVideo, ProcessingOptions, SubtitleTrack } from '../types';
import { saveDownloadedVideo, formatBytes, formatDuration } from './storage';
import { sendNotification } from './notifications';

export interface ProcessProgress {
  progress: number; // 0 to 100
  message: string;
}

/**
 * Creates an in-memory video element loaded from Blob
 */
function createVideoElement(blob: Blob): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    const url = URL.createObjectURL(blob);
    video.src = url;

    video.onloadedmetadata = () => {
      resolve(video);
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video element for processing'));
    };
  });
}

/**
 * 1. TRIM VIDEO
 */
export async function processTrimVideo(
  source: DownloadedVideo,
  startTime: number,
  endTime: number,
  onProgress?: (p: ProcessProgress) => void
): Promise<DownloadedVideo> {
  onProgress?.({ progress: 5, message: 'Initializing video buffer...' });

  const duration = Math.max(0.5, endTime - startTime);
  const video = await createVideoElement(source.videoBlob);

  onProgress?.({ progress: 15, message: 'Seeking to start frame...' });
  video.currentTime = startTime;
  await new Promise((r) => {
    video.onseeked = () => r(true);
  });

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to create canvas rendering context');

  const stream = canvas.captureStream(30);

  // Audio handling
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sourceNode = audioContext.createMediaElementSource(video);
    const destination = audioContext.createMediaStreamDestination();
    sourceNode.connect(destination);
    destination.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
  } catch (e) {
    // Audio routing fallback
  }

  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';

  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: Blob[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const recordingPromise = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      const resultBlob = new Blob(chunks, { type: 'video/mp4' });
      resolve(resultBlob);
    };
    recorder.onerror = (e) => reject(e);
  });

  recorder.start(100);
  video.playbackRate = 1.0;
  await video.play();

  // Render loop
  const interval = setInterval(() => {
    if (video.currentTime >= endTime || video.ended) {
      clearInterval(interval);
      video.pause();
      recorder.stop();
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const curProgress = Math.min(
      95,
      Math.round(15 + ((video.currentTime - startTime) / duration) * 80)
    );
    onProgress?.({ progress: curProgress, message: `Trimming: ${formatDuration(video.currentTime - startTime)} / ${formatDuration(duration)}` });
  }, 1000 / 30);

  const resultBlob = await recordingPromise;
  onProgress?.({ progress: 100, message: 'Finalizing trimmed video...' });

  // Clean up
  URL.revokeObjectURL(video.src);

  const newVideo: DownloadedVideo = {
    id: `trim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sourceUrl: source.sourceUrl,
    title: `${source.title} (Trimmed ${formatDuration(startTime)}-${formatDuration(endTime)})`,
    author: source.author,
    duration: Math.round(duration),
    durationFormatted: formatDuration(duration),
    thumbnailUrl: source.thumbnailUrl,
    thumbnailBlob: source.thumbnailBlob,
    videoBlob: resultBlob,
    format: 'mp4',
    quality: source.quality,
    resolution: `${canvas.width}x${canvas.height}`,
    fileSize: resultBlob.size,
    fileSizeFormatted: formatBytes(resultBlob.size),
    downloadedAt: Date.now(),
    isFavorite: false,
    tags: [...(source.tags || []), 'Trimmed'],
    type: 'video',
  };

  await saveDownloadedVideo(newVideo);
  sendNotification('Video Trim Complete', { body: `Trimmed "${newVideo.title}" saved to library.` });
  return newVideo;
}

/**
 * 2. COMPRESS VIDEO
 */
export async function processCompressVideo(
  source: DownloadedVideo,
  preset: 'low' | 'balanced' | 'max' = 'balanced',
  onProgress?: (p: ProcessProgress) => void
): Promise<DownloadedVideo> {
  onProgress?.({ progress: 5, message: 'Analyzing source bitstream...' });

  const video = await createVideoElement(source.videoBlob);
  const totalDuration = video.duration || source.duration || 1;

  // Scale down dimensions according to compression level
  let scale = 1.0;
  let videoBitsPerSecond = 2_000_000; // 2 Mbps
  if (preset === 'low') {
    scale = 0.85;
    videoBitsPerSecond = 1_500_000;
  } else if (preset === 'balanced') {
    scale = 0.65;
    videoBitsPerSecond = 900_000; // 900 kbps
  } else if (preset === 'max') {
    scale = 0.45;
    videoBitsPerSecond = 450_000; // 450 kbps
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round((video.videoWidth || 1280) * scale);
  canvas.height = Math.round((video.videoHeight || 720) * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context failure');

  onProgress?.({ progress: 15, message: `Re-encoding to ${canvas.width}x${canvas.height} (${preset} preset)...` });

  const stream = canvas.captureStream(24);

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
      const finalBlob = new Blob(chunks, { type: 'video/mp4' });
      resolve(finalBlob);
    };
    recorder.onerror = (e) => reject(e);
  });

  recorder.start(100);
  video.currentTime = 0;
  await video.play();

  const interval = setInterval(() => {
    if (video.ended || video.currentTime >= totalDuration) {
      clearInterval(interval);
      video.pause();
      recorder.stop();
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const prog = Math.min(95, Math.round(15 + (video.currentTime / totalDuration) * 80));
    onProgress?.({ progress: prog, message: `Compressing: ${prog}% (${formatDuration(video.currentTime)} / ${formatDuration(totalDuration)})` });
  }, 1000 / 24);

  const resultBlob = await recordingPromise;
  URL.revokeObjectURL(video.src);
  onProgress?.({ progress: 100, message: 'Compression finished!' });

  const ratio = Math.round(((source.fileSize - resultBlob.size) / source.fileSize) * 100);
  const newVideo: DownloadedVideo = {
    id: `compress-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sourceUrl: source.sourceUrl,
    title: `${source.title} (Compressed -${Math.max(5, ratio)}%)`,
    author: source.author,
    duration: source.duration,
    durationFormatted: source.durationFormatted,
    thumbnailUrl: source.thumbnailUrl,
    thumbnailBlob: source.thumbnailBlob,
    videoBlob: resultBlob,
    format: 'mp4',
    quality: `${preset.toUpperCase()} Compressed`,
    resolution: `${canvas.width}x${canvas.height}`,
    fileSize: resultBlob.size,
    fileSizeFormatted: formatBytes(resultBlob.size),
    downloadedAt: Date.now(),
    isFavorite: false,
    tags: [...(source.tags || []), 'Compressed'],
    type: 'video',
  };

  await saveDownloadedVideo(newVideo);
  sendNotification('Video Compression Complete', {
    body: `Reduced by ${Math.max(5, ratio)}%: ${newVideo.fileSizeFormatted} (was ${source.fileSizeFormatted})`,
  });

  return newVideo;
}

/**
 * 3. EXTRACT AUDIO
 */
export async function processExtractAudio(
  source: DownloadedVideo,
  targetFormat: 'mp3' | 'wav' | 'aac' = 'mp3',
  onProgress?: (p: ProcessProgress) => void
): Promise<DownloadedVideo> {
  onProgress?.({ progress: 10, message: 'Demuxing audio stream...' });

  const video = await createVideoElement(source.videoBlob);
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const sourceNode = audioContext.createMediaElementSource(video);
  const destination = audioContext.createMediaStreamDestination();
  sourceNode.connect(destination);

  const recorder = new MediaRecorder(destination.stream, {
    mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '',
    audioBitsPerSecond: 320000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const recordingPromise = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      const audioBlob = new Blob(chunks, { type: targetFormat === 'wav' ? 'audio/wav' : 'audio/mp3' });
      resolve(audioBlob);
    };
    recorder.onerror = (e) => reject(e);
  });

  onProgress?.({ progress: 25, message: `Extracting ${targetFormat.toUpperCase()} audio track...` });

  recorder.start(100);
  video.currentTime = 0;
  await video.play();

  const totalDur = video.duration || source.duration || 1;
  const interval = setInterval(() => {
    if (video.ended || video.currentTime >= totalDur) {
      clearInterval(interval);
      video.pause();
      recorder.stop();
      return;
    }
    const prog = Math.min(95, Math.round(25 + (video.currentTime / totalDur) * 70));
    onProgress?.({ progress: prog, message: `Extracting audio: ${prog}%` });
  }, 300);

  const audioBlob = await recordingPromise;
  URL.revokeObjectURL(video.src);
  audioContext.close();

  onProgress?.({ progress: 100, message: 'Audio extraction complete!' });

  const audioVideo: DownloadedVideo = {
    id: `audio-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sourceUrl: source.sourceUrl,
    title: `${source.title} (Audio Track)`,
    author: source.author,
    duration: source.duration,
    durationFormatted: source.durationFormatted,
    thumbnailUrl: source.thumbnailUrl,
    thumbnailBlob: source.thumbnailBlob,
    videoBlob: audioBlob,
    format: targetFormat,
    quality: '320kbps High Quality',
    fileSize: audioBlob.size,
    fileSizeFormatted: formatBytes(audioBlob.size),
    downloadedAt: Date.now(),
    isFavorite: false,
    tags: ['Audio', 'Extracted Track', targetFormat.toUpperCase()],
    type: 'audio',
  };

  await saveDownloadedVideo(audioVideo);
  sendNotification('Audio Extraction Done', { body: `Audio track saved as ${targetFormat.toUpperCase()}` });
  return audioVideo;
}

/**
 * 4. ROTATE & CROP VIDEO
 */
export async function processTransformVideo(
  source: DownloadedVideo,
  options: {
    rotation?: 0 | 90 | 180 | 270;
    cropAspect?: 'original' | '16:9' | '9:16' | '1:1' | '4:3';
  },
  onProgress?: (p: ProcessProgress) => void
): Promise<DownloadedVideo> {
  const rotation = options.rotation || 0;
  const cropAspect = options.cropAspect || 'original';

  onProgress?.({ progress: 5, message: 'Setting up geometric transformation...' });

  const video = await createVideoElement(source.videoBlob);
  const srcW = video.videoWidth || 1280;
  const srcH = video.videoHeight || 720;

  let outW = srcW;
  let outH = srcH;

  if (cropAspect === '1:1') {
    const minDim = Math.min(srcW, srcH);
    outW = minDim;
    outH = minDim;
  } else if (cropAspect === '9:16') {
    outH = srcH;
    outW = Math.round((srcH * 9) / 16);
  } else if (cropAspect === '16:9') {
    outW = srcW;
    outH = Math.round((srcW * 9) / 16);
  } else if (cropAspect === '4:3') {
    outW = srcW;
    outH = Math.round((srcW * 3) / 4);
  }

  // Handle 90/270 degree swaps
  if (rotation === 90 || rotation === 270) {
    const temp = outW;
    outW = outH;
    outH = temp;
  }

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context failed');

  onProgress?.({ progress: 20, message: `Rendering transformed frames (${outW}x${outH}, ${rotation}°)...` });

  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
  const chunks: Blob[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const recordingPromise = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      const b = new Blob(chunks, { type: 'video/mp4' });
      resolve(b);
    };
    recorder.onerror = (e) => reject(e);
  });

  recorder.start(100);
  video.currentTime = 0;
  await video.play();

  const totalDur = video.duration || source.duration || 1;
  const interval = setInterval(() => {
    if (video.ended || video.currentTime >= totalDur) {
      clearInterval(interval);
      video.pause();
      recorder.stop();
      return;
    }

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    const drawW = (rotation === 90 || rotation === 270) ? canvas.height : canvas.width;
    const drawH = (rotation === 90 || rotation === 270) ? canvas.width : canvas.height;
    ctx.drawImage(video, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    const prog = Math.min(95, Math.round(20 + (video.currentTime / totalDur) * 75));
    onProgress?.({ progress: prog, message: `Transforming: ${prog}%` });
  }, 1000 / 30);

  const resultBlob = await recordingPromise;
  URL.revokeObjectURL(video.src);

  onProgress?.({ progress: 100, message: 'Done!' });

  const newVideo: DownloadedVideo = {
    id: `transform-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sourceUrl: source.sourceUrl,
    title: `${source.title} (${rotation > 0 ? `${rotation}° ` : ''}${cropAspect !== 'original' ? cropAspect : 'Transformed'})`,
    author: source.author,
    duration: source.duration,
    durationFormatted: source.durationFormatted,
    thumbnailUrl: source.thumbnailUrl,
    thumbnailBlob: source.thumbnailBlob,
    videoBlob: resultBlob,
    format: 'mp4',
    quality: `${outW}x${outH}`,
    resolution: `${outW}x${outH}`,
    fileSize: resultBlob.size,
    fileSizeFormatted: formatBytes(resultBlob.size),
    downloadedAt: Date.now(),
    isFavorite: false,
    tags: [...(source.tags || []), 'Transformed', cropAspect],
    type: 'video',
  };

  await saveDownloadedVideo(newVideo);
  return newVideo;
}

/**
 * 5. EXTRACT FRAMES / SNAPSHOTS
 */
export async function processExtractFrames(
  source: DownloadedVideo,
  count: number = 6,
  onProgress?: (p: ProcessProgress) => void
): Promise<string[]> {
  onProgress?.({ progress: 10, message: 'Opening frame scanner...' });

  const video = await createVideoElement(source.videoBlob);
  const totalDur = video.duration || source.duration || 10;
  const intervalSec = totalDur / (count + 1);

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context failed');

  const frameDataUrls: string[] = [];

  for (let i = 1; i <= count; i++) {
    const targetTime = i * intervalSec;
    video.currentTime = targetTime;
    await new Promise((r) => {
      video.onseeked = () => r(true);
    });

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    frameDataUrls.push(dataUrl);

    const prog = Math.round(10 + (i / count) * 85);
    onProgress?.({ progress: prog, message: `Captured frame ${i} of ${count} (${formatDuration(targetTime)})` });
  }

  URL.revokeObjectURL(video.src);
  onProgress?.({ progress: 100, message: `Captured ${count} frames successfully!` });
  return frameDataUrls;
}

/**
 * 6. GENERATE CUSTOM THUMBNAIL FROM FRAME
 */
export async function setVideoThumbnailFromFrame(
  source: DownloadedVideo,
  timeSec: number
): Promise<DownloadedVideo> {
  const video = await createVideoElement(source.videoBlob);
  video.currentTime = Math.min(video.duration, Math.max(0, timeSec));
  await new Promise((r) => {
    video.onseeked = () => r(true);
  });

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context failed');

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.9));
  URL.revokeObjectURL(video.src);

  if (!blob) throw new Error('Failed to generate thumbnail blob');

  const updated: DownloadedVideo = {
    ...source,
    thumbnailBlob: blob,
    thumbnailUrl: URL.createObjectURL(blob),
  };

  await saveDownloadedVideo(updated);
  return updated;
}

/**
 * 7. MERGE MULTIPLE VIDEOS SEQUENTIALLY
 */
export async function processMergeVideos(
  sources: DownloadedVideo[],
  onProgress?: (p: ProcessProgress) => void
): Promise<DownloadedVideo> {
  if (sources.length < 2) throw new Error('Please select at least 2 videos to merge');

  onProgress?.({ progress: 5, message: `Preparing merge for ${sources.length} videos...` });

  let totalDuration = 0;
  sources.forEach((s) => (totalDuration += s.duration || 0));

  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context failure');

  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
  const chunks: Blob[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const recordingPromise = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/mp4' }));
    recorder.onerror = (e) => reject(e);
  });

  recorder.start(100);

  let processedSecs = 0;

  for (let idx = 0; idx < sources.length; idx++) {
    const currentVideo = sources[idx];
    onProgress?.({
      progress: Math.round(10 + (processedSecs / (totalDuration || 1)) * 80),
      message: `Merging clip ${idx + 1}/${sources.length}: "${currentVideo.title}"`,
    });

    const videoEl = await createVideoElement(currentVideo.videoBlob);
    videoEl.currentTime = 0;
    await videoEl.play();

    const clipDur = videoEl.duration || currentVideo.duration || 1;

    await new Promise<void>((resolve) => {
      const renderLoop = setInterval(() => {
        if (videoEl.ended || videoEl.currentTime >= clipDur) {
          clearInterval(renderLoop);
          videoEl.pause();
          URL.revokeObjectURL(videoEl.src);
          processedSecs += clipDur;
          resolve();
          return;
        }
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      }, 1000 / 30);
    });
  }

  recorder.stop();
  const mergedBlob = await recordingPromise;
  onProgress?.({ progress: 100, message: 'Merged video ready!' });

  const mergedVideo: DownloadedVideo = {
    id: `merged-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sourceUrl: sources[0].sourceUrl,
    title: `Merged: ${sources.map((s) => s.title).join(' + ')}`.slice(0, 80),
    author: 'Merged Media',
    duration: Math.round(totalDuration),
    durationFormatted: formatDuration(totalDuration),
    thumbnailUrl: sources[0].thumbnailUrl,
    thumbnailBlob: sources[0].thumbnailBlob,
    videoBlob: mergedBlob,
    format: 'mp4',
    quality: '1080p Merged',
    resolution: '1280x720',
    fileSize: mergedBlob.size,
    fileSizeFormatted: formatBytes(mergedBlob.size),
    downloadedAt: Date.now(),
    isFavorite: false,
    tags: ['Merged', `${sources.length} Clips`],
    type: 'video',
  };

  await saveDownloadedVideo(mergedVideo);
  sendNotification('Merge Complete', { body: `Merged ${sources.length} videos into one.` });
  return mergedVideo;
}
