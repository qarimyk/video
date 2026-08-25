import React, { useState, useEffect, useRef } from 'react';
import { 
  Scissors, 
  Minimize2, 
  Music, 
  RotateCw, 
  Crop, 
  Image as ImageIcon, 
  Layers, 
  Subtitles, 
  Play, 
  Pause, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  Film,
  Plus,
  Trash2,
  Sliders,
  Clock,
  ArrowRight,
  ChevronDown
} from 'lucide-react';
import { DownloadedVideo, SubtitleTrack } from '../types';
import { 
  processTrimVideo, 
  processCompressVideo, 
  processExtractAudio, 
  processTransformVideo, 
  processExtractFrames, 
  setVideoThumbnailFromFrame, 
  processMergeVideos,
  ProcessProgress 
} from '../services/videoProcessor';
import { formatDuration, formatBytes, addSubtitlesToVideo } from '../services/storage';

interface VideoStudioProps {
  videos: DownloadedVideo[];
  selectedVideoId?: string;
  onVideoCreated: (video: DownloadedVideo) => void;
  onPlayVideo: (video: DownloadedVideo) => void;
}

type StudioTool = 'trim' | 'compress' | 'audio' | 'transform' | 'frames' | 'merge' | 'subtitles';

export const VideoStudio: React.FC<VideoStudioProps> = ({
  videos,
  selectedVideoId,
  onVideoCreated,
  onPlayVideo,
}) => {
  const [activeTool, setActiveTool] = useState<StudioTool>('trim');
  const [currentVideo, setCurrentVideo] = useState<DownloadedVideo | null>(null);

  // Video playback & timeline state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressInfo, setProgressInfo] = useState<ProcessProgress>({ progress: 0, message: '' });
  const [completedResult, setCompletedResult] = useState<DownloadedVideo | null>(null);
  const [processError, setProcessError] = useState<string | null>(null);

  // Tool 1: Trim State
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(10);

  // Tool 2: Compress State
  const [compressPreset, setCompressPreset] = useState<'low' | 'balanced' | 'max'>('balanced');

  // Tool 3: Audio Extraction
  const [audioFormat, setAudioFormat] = useState<'mp3' | 'wav' | 'aac'>('mp3');

  // Tool 4: Transform (Rotate & Crop)
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [cropAspect, setCropAspect] = useState<'original' | '16:9' | '9:16' | '1:1' | '4:3'>('original');

  // Tool 5: Frame Extraction
  const [frameCount, setFrameCount] = useState(6);
  const [extractedFrames, setExtractedFrames] = useState<string[]>([]);
  const [isExtractingFrames, setIsExtractingFrames] = useState(false);

  // Tool 6: Merge State
  const [selectedMergeIds, setSelectedMergeIds] = useState<string[]>([]);

  // Tool 7: Subtitle State
  const [subtitleCues, setSubtitleCues] = useState<Array<{ start: number; end: number; text: string }>>([
    { start: 0, end: 3, text: 'Hello, welcome to this video.' }
  ]);
  const [newSubText, setNewSubText] = useState('');

  // Set initial selected video
  useEffect(() => {
    if (selectedVideoId) {
      const match = videos.find((v) => v.id === selectedVideoId);
      if (match) setCurrentVideo(match);
    } else if (videos.length > 0 && !currentVideo) {
      setCurrentVideo(videos[0]);
    }
  }, [selectedVideoId, videos]);

  // Update video blob URL whenever currentVideo changes
  useEffect(() => {
    if (currentVideo && currentVideo.videoBlob) {
      const url = URL.createObjectURL(currentVideo.videoBlob);
      setVideoBlobUrl(url);
      setTrimStart(0);
      setTrimEnd(Math.min(currentVideo.duration || 30, 30));
      setVideoDuration(currentVideo.duration || 30);
      setExtractedFrames([]);
      setCompletedResult(null);
      setProcessError(null);

      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [currentVideo]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (activeTool === 'trim' && videoRef.current.currentTime >= trimEnd) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration || currentVideo?.duration || 10;
      setVideoDuration(dur);
      if (trimEnd === 10 || trimEnd > dur) {
        setTrimEnd(dur);
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (activeTool === 'trim' && (videoRef.current.currentTime < trimStart || videoRef.current.currentTime >= trimEnd)) {
        videoRef.current.currentTime = trimStart;
      }
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // 1. TRIM
  const handleExecuteTrim = async () => {
    if (!currentVideo) return;
    setIsProcessing(true);
    setProcessError(null);
    try {
      const result = await processTrimVideo(currentVideo, trimStart, trimEnd, (p) => setProgressInfo(p));
      setCompletedResult(result);
      onVideoCreated(result);
    } catch (err: any) {
      setProcessError(err.message || 'Trim processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. COMPRESS
  const handleExecuteCompress = async () => {
    if (!currentVideo) return;
    setIsProcessing(true);
    setProcessError(null);
    try {
      const result = await processCompressVideo(currentVideo, compressPreset, (p) => setProgressInfo(p));
      setCompletedResult(result);
      onVideoCreated(result);
    } catch (err: any) {
      setProcessError(err.message || 'Compression failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. EXTRACT AUDIO
  const handleExecuteExtractAudio = async () => {
    if (!currentVideo) return;
    setIsProcessing(true);
    setProcessError(null);
    try {
      const result = await processExtractAudio(currentVideo, audioFormat, (p) => setProgressInfo(p));
      setCompletedResult(result);
      onVideoCreated(result);
    } catch (err: any) {
      setProcessError(err.message || 'Audio extraction failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. TRANSFORM
  const handleExecuteTransform = async () => {
    if (!currentVideo) return;
    setIsProcessing(true);
    setProcessError(null);
    try {
      const result = await processTransformVideo(currentVideo, { rotation, cropAspect }, (p) => setProgressInfo(p));
      setCompletedResult(result);
      onVideoCreated(result);
    } catch (err: any) {
      setProcessError(err.message || 'Transformation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. EXTRACT FRAMES
  const handleExtractFrames = async () => {
    if (!currentVideo) return;
    setIsExtractingFrames(true);
    try {
      const frames = await processExtractFrames(currentVideo, frameCount, (p) => setProgressInfo(p));
      setExtractedFrames(frames);
    } catch (err: any) {
      setProcessError(err.message || 'Frame extraction failed');
    } finally {
      setIsExtractingFrames(false);
    }
  };

  // 6. MERGE
  const handleExecuteMerge = async () => {
    const mergeSources = videos.filter((v) => selectedMergeIds.includes(v.id));
    if (mergeSources.length < 2) {
      setProcessError('Please select at least 2 videos from your library to merge.');
      return;
    }
    setIsProcessing(true);
    setProcessError(null);
    try {
      const result = await processMergeVideos(mergeSources, (p) => setProgressInfo(p));
      setCompletedResult(result);
      onVideoCreated(result);
    } catch (err: any) {
      setProcessError(err.message || 'Merge failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // 7. SUBTITLES
  const handleSaveSubtitles = async () => {
    if (!currentVideo) return;
    const track: SubtitleTrack = {
      id: `sub-${Date.now()}`,
      label: 'English CC',
      language: 'en',
      cues: subtitleCues,
    };
    await addSubtitlesToVideo(currentVideo.id, track);
    setCompletedResult(currentVideo);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-32">
      {/* Title */}
      <div className="text-left mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 uppercase font-mono">
              VIDEO STUDIO
            </h1>
            <p className="text-sm text-neutral-500 font-normal mt-1">
              Trim, compress, extract audio, transform, and manage media without leaving your browser.
            </p>
          </div>

          {/* Video Selector Dropdown */}
          {videos.length > 0 && (
            <div className="relative">
              <select
                value={currentVideo?.id || ''}
                onChange={(e) => {
                  const match = videos.find((v) => v.id === e.target.value);
                  if (match) setCurrentVideo(match);
                }}
                className="appearance-none bg-white border border-neutral-200/90 rounded-full px-4 py-2 pr-9 text-xs sm:text-sm font-semibold text-neutral-900 shadow-2xs focus:outline-none focus:border-black cursor-pointer"
              >
                {videos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.title.slice(0, 32)}... ({v.durationFormatted})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {videos.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-[32px] border border-neutral-200/90 shadow-2xs">
          <Film className="w-12 h-12 text-neutral-300 mx-auto mb-3 stroke-[1.5]" />
          <h3 className="text-base font-semibold text-neutral-900">No media available in studio</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1">
            Download a video or paste a link in the Download tab to start editing and processing.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Studio Viewport */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Video Preview Player (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-[32px] p-5 border border-neutral-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
              <div>
                <div className="relative aspect-video rounded-2xl bg-neutral-950 overflow-hidden flex items-center justify-center border border-neutral-800 shadow-inner group">
                  {videoBlobUrl ? (
                    <video
                      ref={videoRef}
                      src={videoBlobUrl}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      className="w-full h-full object-contain"
                      playsInline
                    />
                  ) : (
                    <div className="text-neutral-500 text-xs font-mono">Loading video buffer...</div>
                  )}

                  {/* Play Overlay */}
                  <button
                    onClick={togglePlay}
                    className="w-14 h-14 rounded-full bg-white/90 hover:bg-white text-black flex items-center justify-center absolute shadow-xl transition-all hover:scale-105 active:scale-95"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 fill-current" />
                    ) : (
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    )}
                  </button>

                  {/* Time badge */}
                  <span className="bg-black/80 text-white text-[11px] font-mono px-2.5 py-1 rounded-full absolute bottom-3 left-3 shadow-xs">
                    {formatDuration(currentTime)} / {formatDuration(videoDuration)}
                  </span>
                </div>

                {/* Video Info Title */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="min-w-0 flex-1 mr-3">
                    <h3 className="text-sm font-semibold text-neutral-950 truncate">
                      {currentVideo?.title}
                    </h3>
                    <p className="text-xs text-neutral-400 font-mono mt-0.5">
                      {currentVideo?.quality} · {currentVideo?.format.toUpperCase()} · {currentVideo?.fileSizeFormatted}
                    </p>
                  </div>
                  <button
                    onClick={() => currentVideo && onPlayVideo(currentVideo)}
                    className="px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold flex items-center gap-1.5 transition-colors flex-shrink-0"
                  >
                    <Play className="w-3 h-3 fill-current ml-0.5" />
                    <span>Full Player</span>
                  </button>
                </div>
              </div>

              {/* Timeline scrubber */}
              <div className="mt-4 pt-3 border-t border-neutral-100">
                <input
                  type="range"
                  min={0}
                  max={videoDuration || 10}
                  step={0.1}
                  value={currentTime}
                  onChange={(e) => {
                    const t = parseFloat(e.target.value);
                    setCurrentTime(t);
                    if (videoRef.current) videoRef.current.currentTime = t;
                  }}
                  className="w-full accent-black h-1.5 bg-neutral-100 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Right: Studio Tool Palette (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-[32px] p-5 border border-neutral-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
              <div>
                {/* Tool Selector Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto pb-3 mb-4 border-b border-neutral-100">
                  {[
                    { id: 'trim', label: 'Trim', icon: Scissors },
                    { id: 'compress', label: 'Compress', icon: Minimize2 },
                    { id: 'audio', label: 'Audio', icon: Music },
                    { id: 'transform', label: 'Rotate/Crop', icon: RotateCw },
                    { id: 'frames', label: 'Frames', icon: ImageIcon },
                    { id: 'merge', label: 'Merge', icon: Layers },
                    { id: 'subtitles', label: 'CC', icon: Subtitles },
                  ].map((tool) => {
                    const Icon = tool.icon;
                    const isActive = activeTool === tool.id;
                    return (
                      <button
                        key={tool.id}
                        onClick={() => setActiveTool(tool.id as StudioTool)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all flex-shrink-0 ${
                          isActive
                            ? 'bg-black text-white shadow-xs'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tool.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* 1. TRIM TOOL PANEL */}
                {activeTool === 'trim' && (
                  <div className="space-y-4 animate-in fade-in">
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900 uppercase font-mono tracking-wider">Trim & Cut Clip</h4>
                      <p className="text-xs text-neutral-500 mt-0.5">Select start and end timestamps to export a trimmed segment.</p>
                    </div>

                    {/* Sliders */}
                    <div className="space-y-3 p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80">
                      <div>
                        <div className="flex items-center justify-between text-xs font-mono mb-1">
                          <span className="text-neutral-500 font-semibold">Start Cut:</span>
                          <span className="font-bold text-neutral-900">{formatDuration(trimStart)}</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={Math.max(0.1, trimEnd - 0.5)}
                          step={0.1}
                          value={trimStart}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setTrimStart(val);
                            if (videoRef.current) videoRef.current.currentTime = val;
                          }}
                          className="w-full accent-black h-1.5 bg-neutral-200 rounded-lg cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs font-mono mb-1">
                          <span className="text-neutral-500 font-semibold">End Cut:</span>
                          <span className="font-bold text-neutral-900">{formatDuration(trimEnd)}</span>
                        </div>
                        <input
                          type="range"
                          min={trimStart + 0.5}
                          max={videoDuration || 30}
                          step={0.1}
                          value={trimEnd}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setTrimEnd(val);
                            if (videoRef.current) videoRef.current.currentTime = val;
                          }}
                          className="w-full accent-black h-1.5 bg-neutral-200 rounded-lg cursor-pointer"
                        />
                      </div>

                      <div className="pt-2 border-t border-neutral-200/60 flex items-center justify-between text-xs font-mono">
                        <span className="text-neutral-500">Output Duration:</span>
                        <span className="font-bold text-neutral-950">{formatDuration(Math.max(0, trimEnd - trimStart))}</span>
                      </div>
                    </div>

                    <button
                      onClick={handleExecuteTrim}
                      disabled={isProcessing}
                      className="w-full py-3 rounded-full bg-black hover:bg-neutral-900 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
                    >
                      <Scissors className="w-4 h-4" />
                      <span>Export Trimmed Video</span>
                    </button>
                  </div>
                )}

                {/* 2. COMPRESS TOOL PANEL */}
                {activeTool === 'compress' && (
                  <div className="space-y-4 animate-in fade-in">
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900 uppercase font-mono tracking-wider">Smart Video Compressor</h4>
                      <p className="text-xs text-neutral-500 mt-0.5">Reduce file size for instant sharing or saving disk quota.</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'low', label: 'High Quality', desc: '~25% smaller' },
                        { id: 'balanced', label: 'Balanced', desc: '~50% smaller' },
                        { id: 'max', label: 'Max Compact', desc: '~75% smaller' },
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => setCompressPreset(preset.id as any)}
                          className={`p-3 rounded-2xl border text-center transition-all ${
                            compressPreset === preset.id
                              ? 'bg-black text-white border-black shadow-xs'
                              : 'bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-900'
                          }`}
                        >
                          <p className="text-xs font-bold">{preset.label}</p>
                          <p className={`text-[10px] font-mono mt-0.5 ${compressPreset === preset.id ? 'text-neutral-300' : 'text-neutral-500'}`}>
                            {preset.desc}
                          </p>
                        </button>
                      ))}
                    </div>

                    <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200 text-xs font-mono flex items-center justify-between">
                      <span className="text-neutral-500">Current Size:</span>
                      <span className="font-bold text-neutral-900">{currentVideo?.fileSizeFormatted}</span>
                    </div>

                    <button
                      onClick={handleExecuteCompress}
                      disabled={isProcessing}
                      className="w-full py-3 rounded-full bg-black hover:bg-neutral-900 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
                    >
                      <Minimize2 className="w-4 h-4" />
                      <span>Start Video Compression</span>
                    </button>
                  </div>
                )}

                {/* 3. AUDIO EXTRACTION PANEL */}
                {activeTool === 'audio' && (
                  <div className="space-y-4 animate-in fade-in">
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900 uppercase font-mono tracking-wider">Audio Extractor</h4>
                      <p className="text-xs text-neutral-500 mt-0.5">Extract lossless audio track from video to MP3 or WAV.</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'mp3', label: 'MP3 Audio', quality: '320 kbps' },
                        { id: 'wav', label: 'WAV Audio', quality: 'Lossless' },
                        { id: 'aac', label: 'AAC Audio', quality: '256 kbps' },
                      ].map((fmt) => (
                        <button
                          key={fmt.id}
                          onClick={() => setAudioFormat(fmt.id as any)}
                          className={`p-3 rounded-2xl border text-center transition-all ${
                            audioFormat === fmt.id
                              ? 'bg-black text-white border-black shadow-xs'
                              : 'bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-900'
                          }`}
                        >
                          <p className="text-xs font-bold">{fmt.label}</p>
                          <p className={`text-[10px] font-mono mt-0.5 ${audioFormat === fmt.id ? 'text-neutral-300' : 'text-neutral-500'}`}>
                            {fmt.quality}
                          </p>
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={handleExecuteExtractAudio}
                      disabled={isProcessing}
                      className="w-full py-3 rounded-full bg-black hover:bg-neutral-900 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
                    >
                      <Music className="w-4 h-4" />
                      <span>Extract {audioFormat.toUpperCase()} to Library</span>
                    </button>
                  </div>
                )}

                {/* 4. TRANSFORM PANEL */}
                {activeTool === 'transform' && (
                  <div className="space-y-4 animate-in fade-in">
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900 uppercase font-mono tracking-wider">Rotate & Aspect Ratio Crop</h4>
                      <p className="text-xs text-neutral-500 mt-0.5">Adjust orientation or convert into vertical 9:16 reels/shorts.</p>
                    </div>

                    {/* Rotation Buttons */}
                    <div>
                      <span className="text-xs font-semibold text-neutral-700 font-mono">Rotation:</span>
                      <div className="grid grid-cols-4 gap-2 mt-1.5">
                        {[0, 90, 180, 270].map((deg) => (
                          <button
                            key={deg}
                            onClick={() => setRotation(deg as any)}
                            className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                              rotation === deg
                                ? 'bg-black text-white border-black'
                                : 'bg-white border-neutral-200 text-neutral-800 hover:bg-neutral-50'
                            }`}
                          >
                            {deg}°
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Aspect Crop Buttons */}
                    <div>
                      <span className="text-xs font-semibold text-neutral-700 font-mono">Aspect Ratio:</span>
                      <div className="grid grid-cols-3 gap-2 mt-1.5">
                        {[
                          { id: 'original', label: 'Original' },
                          { id: '16:9', label: '16:9 Landscape' },
                          { id: '9:16', label: '9:16 Shorts/Reels' },
                          { id: '1:1', label: '1:1 Square' },
                          { id: '4:3', label: '4:3 Standard' },
                        ].map((crop) => (
                          <button
                            key={crop.id}
                            onClick={() => setCropAspect(crop.id as any)}
                            className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                              cropAspect === crop.id
                                ? 'bg-black text-white border-black'
                                : 'bg-white border-neutral-200 text-neutral-800 hover:bg-neutral-50'
                            }`}
                          >
                            {crop.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleExecuteTransform}
                      disabled={isProcessing}
                      className="w-full py-3 rounded-full bg-black hover:bg-neutral-900 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
                    >
                      <RotateCw className="w-4 h-4" />
                      <span>Apply Transformation</span>
                    </button>
                  </div>
                )}

                {/* 5. FRAMES & THUMBNAIL */}
                {activeTool === 'frames' && (
                  <div className="space-y-4 animate-in fade-in">
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900 uppercase font-mono tracking-wider">Frame Grabber & Thumbnail</h4>
                      <p className="text-xs text-neutral-500 mt-0.5">Extract high-resolution snapshots or update video thumbnail.</p>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 border border-neutral-200">
                      <span className="text-xs font-mono text-neutral-600">Extract Count:</span>
                      <div className="flex items-center gap-1.5">
                        {[4, 6, 8, 12].map((cnt) => (
                          <button
                            key={cnt}
                            onClick={() => setFrameCount(cnt)}
                            className={`w-8 h-8 rounded-full text-xs font-mono font-semibold transition-all ${
                              frameCount === cnt ? 'bg-black text-white' : 'bg-neutral-200 text-neutral-700'
                            }`}
                          >
                            {cnt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleExtractFrames}
                      disabled={isExtractingFrames}
                      className="w-full py-2.5 rounded-full bg-neutral-900 hover:bg-black text-white text-xs font-semibold flex items-center justify-center gap-2"
                    >
                      {isExtractingFrames ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ImageIcon className="w-4 h-4" />
                      )}
                      <span>Scan & Extract {frameCount} Frames</span>
                    </button>

                    {/* Frame Thumbnails Grid */}
                    {extractedFrames.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                        {extractedFrames.map((frameUrl, idx) => (
                          <div key={idx} className="relative group rounded-xl overflow-hidden border border-neutral-200 aspect-video bg-neutral-100">
                            <img src={frameUrl} alt={`Frame ${idx}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-opacity p-1">
                              <button
                                onClick={async () => {
                                  if (currentVideo) {
                                    const timeTarget = (idx + 1) * (videoDuration / (frameCount + 1));
                                    await setVideoThumbnailFromFrame(currentVideo, timeTarget);
                                    alert('Set as video thumbnail!');
                                  }
                                }}
                                className="px-2 py-1 rounded bg-white text-black text-[10px] font-bold"
                                title="Set as thumbnail"
                              >
                                Set Cover
                              </button>
                              <a
                                href={frameUrl}
                                download={`frame-${idx + 1}.jpg`}
                                className="p-1 rounded bg-white text-black text-[10px]"
                                title="Download image"
                              >
                                <Download className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 6. MERGE VIDEOS */}
                {activeTool === 'merge' && (
                  <div className="space-y-4 animate-in fade-in">
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900 uppercase font-mono tracking-wider">Merge Videos</h4>
                      <p className="text-xs text-neutral-500 mt-0.5">Select 2 or more videos from your library to merge sequentially.</p>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {videos.map((vid) => {
                        const isSelected = selectedMergeIds.includes(vid.id);
                        return (
                          <button
                            key={vid.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedMergeIds(selectedMergeIds.filter((id) => id !== vid.id));
                              } else {
                                setSelectedMergeIds([...selectedMergeIds, vid.id]);
                              }
                            }}
                            className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition-all ${
                              isSelected
                                ? 'bg-black text-white border-black font-semibold'
                                : 'bg-white border-neutral-200 text-neutral-800 hover:bg-neutral-50'
                            }`}
                          >
                            <span className="truncate flex-1 mr-2">{vid.title}</span>
                            <span className="font-mono text-[11px]">{vid.durationFormatted}</span>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={handleExecuteMerge}
                      disabled={isProcessing || selectedMergeIds.length < 2}
                      className="w-full py-3 rounded-full bg-black hover:bg-neutral-900 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
                    >
                      <Layers className="w-4 h-4" />
                      <span>Merge {selectedMergeIds.length} Selected Clips</span>
                    </button>
                  </div>
                )}

                {/* 7. SUBTITLES & CC */}
                {activeTool === 'subtitles' && (
                  <div className="space-y-4 animate-in fade-in">
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900 uppercase font-mono tracking-wider">Subtitles & Closed Captions</h4>
                      <p className="text-xs text-neutral-500 mt-0.5">Add timed caption cues or embed subtitle tracks.</p>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSubText}
                        onChange={(e) => setNewSubText(e.target.value)}
                        placeholder="Type subtitle line..."
                        className="flex-1 px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:border-black"
                      />
                      <button
                        onClick={() => {
                          if (newSubText.trim()) {
                            setSubtitleCues([
                              ...subtitleCues,
                              {
                                start: Math.floor(currentTime),
                                end: Math.floor(currentTime) + 3,
                                text: newSubText.trim(),
                              },
                            ]);
                            setNewSubText('');
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-black text-white text-xs font-semibold"
                      >
                        Add Cue
                      </button>
                    </div>

                    {/* Cues list */}
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {subtitleCues.map((cue, idx) => (
                        <div key={idx} className="p-2 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-between text-xs">
                          <span className="font-mono text-[11px] text-neutral-500 mr-2">
                            {formatDuration(cue.start)}-{formatDuration(cue.end)}
                          </span>
                          <span className="flex-1 truncate text-neutral-900 font-medium">{cue.text}</span>
                          <button
                            onClick={() => setSubtitleCues(subtitleCues.filter((_, i) => i !== idx))}
                            className="text-neutral-400 hover:text-red-600 ml-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleSaveSubtitles}
                      className="w-full py-3 rounded-full bg-black hover:bg-neutral-900 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
                    >
                      <Subtitles className="w-4 h-4" />
                      <span>Attach Subtitles to Video</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Success Banner */}
          {completedResult && (
            <div className="p-4 rounded-3xl bg-black text-white flex items-center justify-between shadow-xl animate-in slide-in-from-top duration-300">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center flex-shrink-0 font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">Processing Complete</p>
                  <p className="text-sm font-semibold text-white truncate">{completedResult.title}</p>
                </div>
              </div>
              <button
                onClick={() => onPlayVideo(completedResult)}
                className="px-4 py-2 rounded-full bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-all flex items-center gap-1.5 flex-shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                <span>Play Now</span>
              </button>
            </div>
          )}

          {/* Error Banner */}
          {processError && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                <span>{processError}</span>
              </div>
              <button onClick={() => setProcessError(null)} className="text-neutral-400 hover:text-neutral-700">
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      {/* Processing Modal Progress Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-[32px] p-7 shadow-2xl border border-neutral-200 text-center animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-full bg-black text-white flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
            <h3 className="text-base font-bold text-neutral-950 uppercase font-mono">Processing Video</h3>
            <p className="text-xs text-neutral-500 mt-1 mb-5">{progressInfo.message || 'Executing media transformation...'}</p>

            {/* Progress bar */}
            <div className="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden mb-3">
              <div 
                className="h-full bg-black rounded-full transition-all duration-300"
                style={{ width: `${Math.max(5, progressInfo.progress)}%` }}
              />
            </div>

            <span className="text-sm font-mono font-bold text-neutral-900">{progressInfo.progress}%</span>
          </div>
        </div>
      )}
    </div>
  );
};
