import React, { useState, useEffect } from 'react';
import { 
  X, 
  RefreshCw, 
  Sparkles, 
  Check, 
  Sliders, 
  Layers, 
  Music, 
  Video as VideoIcon, 
  DownloadCloud, 
  FolderCheck, 
  Clock, 
  Play, 
  AlertCircle,
  FileDown,
  Gauge
} from 'lucide-react';
import { 
  DownloadedVideo, 
  MediaFormat, 
  ConversionResolution, 
  ConversionBitrate, 
  ConversionFps,
  ConversionConfig, 
  ConversionTask 
} from '../types';
import { conversionQueue } from '../services/conversionQueue';
import { formatBytes } from '../services/storage';

interface MediaConverterModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVideo?: DownloadedVideo | null;
  allVideos?: DownloadedVideo[];
  onConversionFinished?: () => void;
}

export const MediaConverterModal: React.FC<MediaConverterModalProps> = ({
  isOpen,
  onClose,
  selectedVideo,
  allVideos = [],
  onConversionFinished,
}) => {
  // Target format state
  const [targetFormat, setTargetFormat] = useState<MediaFormat>('mp4');
  const [targetResolution, setTargetResolution] = useState<ConversionResolution>('1080p');
  const [targetBitrate, setTargetBitrate] = useState<ConversionBitrate>('balanced');
  const [targetFps, setTargetFps] = useState<ConversionFps>('30');
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  const [compressionRatio, setCompressionRatio] = useState(0);
  const [targetFolder, setTargetFolder] = useState('Converted');
  const [customName, setCustomName] = useState('');

  // Selected videos for batch conversion
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'configure' | 'queue'>('configure');
  const [tasks, setTasks] = useState<ConversionTask[]>([]);

  useEffect(() => {
    if (selectedVideo) {
      setSelectedIds([selectedVideo.id]);
      setCustomName(`${selectedVideo.title} (Transcoded)`);
    } else if (allVideos.length > 0 && selectedIds.length === 0) {
      setSelectedIds([allVideos[0].id]);
    }
  }, [selectedVideo, isOpen]);

  useEffect(() => {
    const unsub = conversionQueue.subscribe((taskList) => {
      setTasks(taskList);
      const hasCompleted = taskList.some((t) => t.status === 'completed');
      if (hasCompleted) {
        onConversionFinished?.();
      }
    });
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const currentSources = allVideos.filter((v) => selectedIds.includes(v.id));
  const activeVideo = currentSources[0] || selectedVideo;

  // Calculate estimated file size
  const calculateEstimatedSize = (): string => {
    if (!activeVideo) return '0 MB';
    const originalSize = activeVideo.fileSize || 50 * 1024 * 1024;
    
    if (isAudioOnly || targetFormat === 'mp3' || targetFormat === 'wav' || targetFormat === 'aac') {
      const dur = activeVideo.duration || 180;
      let kbps = 320;
      if (targetBitrate === 'audio-256k') kbps = 256;
      if (targetBitrate === 'audio-128k') kbps = 128;
      const bytes = (dur * kbps * 1000) / 8;
      return formatBytes(bytes);
    }

    let multiplier = 1.0;
    if (targetResolution === '4K') multiplier *= 2.2;
    if (targetResolution === '720p') multiplier *= 0.6;
    if (targetResolution === '480p') multiplier *= 0.35;
    if (targetResolution === '360p') multiplier *= 0.2;

    if (targetBitrate === 'high') multiplier *= 1.5;
    if (targetBitrate === 'compact') multiplier *= 0.6;
    if (targetBitrate === 'ultra-low') multiplier *= 0.35;

    if (compressionRatio > 0) {
      multiplier *= (100 - compressionRatio * 0.7) / 100;
    }

    const estimatedBytes = originalSize * multiplier;
    return formatBytes(estimatedBytes);
  };

  const handleStartConversion = () => {
    if (currentSources.length === 0) return;

    const config: ConversionConfig = {
      targetFormat,
      targetResolution: isAudioOnly ? undefined : targetResolution,
      targetBitrate,
      targetFps: isAudioOnly ? undefined : targetFps,
      isAudioOnly,
      compressionRatio,
      targetFolder,
      customOutputName: currentSources.length === 1 && customName ? customName : undefined,
    };

    conversionQueue.addTasks(currentSources, config);
    setActiveTab('queue');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl max-h-[92vh] bg-white rounded-[32px] p-5 sm:p-7 shadow-2xl border border-neutral-200 flex flex-col text-neutral-900 animate-in zoom-in-95 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-neutral-950 uppercase font-mono">
                Hardware Transcoder & Converter
              </h3>
              <p className="text-xs text-neutral-500 font-normal">
                Batch convert video & audio formats, bitrates, resolutions, and FPS
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center justify-between py-3 border-b border-neutral-100 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('configure')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeTab === 'configure' ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              Transcode Settings
            </button>
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'queue' ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <span>Queue Tasks</span>
              {tasks.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-neutral-800 text-white text-[10px] flex items-center justify-center font-mono">
                  {tasks.length}
                </span>
              )}
            </button>
          </div>

          <span className="text-[11px] font-mono text-neutral-400">
            Selected: <strong className="text-black">{currentSources.length} item(s)</strong>
          </span>
        </div>

        {/* TAB 1: CONFIGURE CONVERSION */}
        {activeTab === 'configure' ? (
          <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
            
            {/* 1. Format Selection */}
            <div>
              <label className="text-xs font-bold font-mono uppercase text-neutral-700 block mb-2">
                1. Target Output Format
              </label>
              
              <div className="space-y-2">
                <div>
                  <span className="text-[11px] font-medium text-neutral-400 block mb-1">Video Containers:</span>
                  <div className="grid grid-cols-5 gap-2">
                    {(['mp4', 'mkv', 'mov', 'avi', 'webm'] as MediaFormat[]).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => {
                          setTargetFormat(fmt);
                          setIsAudioOnly(false);
                        }}
                        className={`py-2 rounded-2xl text-xs font-mono font-bold uppercase transition-all border ${
                          targetFormat === fmt && !isAudioOnly
                            ? 'bg-black text-white border-black shadow-xs'
                            : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border-neutral-200'
                        }`}
                      >
                        .{fmt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-medium text-neutral-400 block mb-1">Audio-Only Extraction:</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(['mp3', 'wav', 'aac'] as MediaFormat[]).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => {
                          setTargetFormat(fmt);
                          setIsAudioOnly(true);
                        }}
                        className={`py-2 rounded-2xl text-xs font-mono font-bold uppercase transition-all border flex items-center justify-center gap-1.5 ${
                          targetFormat === fmt && isAudioOnly
                            ? 'bg-black text-white border-black shadow-xs'
                            : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border-neutral-200'
                        }`}
                      >
                        <Music className="w-3.5 h-3.5" />
                        <span>.{fmt}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Video Resolution & FPS (if not audio-only) */}
            {!isAudioOnly && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold font-mono uppercase text-neutral-700 block mb-2">
                    2. Resolution
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['original', '4K', '1080p', '720p', '480p', '360p'] as ConversionResolution[]).map((res) => (
                      <button
                        key={res}
                        onClick={() => setTargetResolution(res)}
                        className={`py-1.5 px-2 rounded-xl text-xs font-mono font-medium transition-all border text-center ${
                          targetResolution === res
                            ? 'bg-black text-white border-black'
                            : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200'
                        }`}
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold font-mono uppercase text-neutral-700 block mb-2">
                    3. Frame Rate (FPS)
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['original', '60', '30', '24'] as ConversionFps[]).map((fps) => (
                      <button
                        key={fps}
                        onClick={() => setTargetFps(fps)}
                        className={`py-1.5 px-2 rounded-xl text-xs font-mono font-medium transition-all border text-center ${
                          targetFps === fps
                            ? 'bg-black text-white border-black'
                            : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200'
                        }`}
                      >
                        {fps === 'original' ? 'Source' : `${fps} FPS`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 3. Bitrate & Compression */}
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono uppercase text-neutral-800">
                  {isAudioOnly ? 'Audio Bitrate' : 'Target Bitrate & Compression'}
                </span>
                <span className="text-xs font-mono text-neutral-500">
                  Estimated: <strong className="text-neutral-900">{calculateEstimatedSize()}</strong>
                </span>
              </div>

              {isAudioOnly ? (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'audio-320k', label: '320 kbps (HQ Studio)' },
                    { id: 'audio-256k', label: '256 kbps (High)' },
                    { id: 'audio-128k', label: '128 kbps (Compact)' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setTargetBitrate(item.id as ConversionBitrate)}
                      className={`p-2 rounded-xl text-xs font-mono border text-center transition-all ${
                        targetBitrate === item.id 
                          ? 'bg-black text-white border-black' 
                          : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'high', label: 'High (8M)' },
                      { id: 'balanced', label: 'Balanced (4M)' },
                      { id: 'compact', label: 'Compact (1.5M)' },
                      { id: 'ultra-low', label: 'Lite (800k)' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setTargetBitrate(item.id as ConversionBitrate)}
                        className={`p-2 rounded-xl text-xs font-mono border text-center transition-all ${
                          targetBitrate === item.id 
                            ? 'bg-black text-white border-black' 
                            : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 mb-1">
                      <span>Dynamic Compression Slider:</span>
                      <span>{compressionRatio}% Reduction</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={75}
                      step={5}
                      value={compressionRatio}
                      onChange={(e) => setCompressionRatio(parseInt(e.target.value))}
                      className="w-full accent-black h-1.5 bg-neutral-200 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 4. Target Destination Folder */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-neutral-600 block mb-1">Target Folder</label>
                <select
                  value={targetFolder}
                  onChange={(e) => setTargetFolder(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-semibold focus:outline-none focus:border-black"
                >
                  <option value="Converted">Converted</option>
                  <option value="Downloads">Downloads</option>
                  <option value="Imported">Imported</option>
                  <option value="Music">Music</option>
                </select>
              </div>

              {currentSources.length === 1 && (
                <div>
                  <label className="text-[11px] font-medium text-neutral-600 block mb-1">Output Name</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Custom file name"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-mono focus:outline-none focus:border-black truncate"
                  />
                </div>
              )}
            </div>

            {/* Start Button */}
            <div className="pt-2">
              <button
                onClick={handleStartConversion}
                className="w-full py-3 rounded-full bg-black text-white hover:bg-neutral-800 text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Start Conversion ({currentSources.length} Item{currentSources.length > 1 ? 's' : ''})</span>
              </button>
            </div>
          </div>
        ) : (
          /* TAB 2: QUEUE & TASKS */
          <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <span className="text-xs font-mono text-neutral-500">
                {tasks.filter((t) => t.status === 'converting').length > 0 ? 'Transcoding active...' : 'Idle / Completed'}
              </span>
              <button
                onClick={() => conversionQueue.clearCompleted()}
                className="text-xs font-semibold text-neutral-600 hover:text-black"
              >
                Clear Completed
              </button>
            </div>

            {tasks.length === 0 ? (
              <div className="py-16 text-center text-neutral-400">
                <RefreshCw className="w-10 h-10 mx-auto mb-2 opacity-30 animate-spin" style={{ animationDuration: '6s' }} />
                <p className="text-sm font-semibold text-neutral-600">No active conversion tasks</p>
                <p className="text-xs text-neutral-400 mt-1">Configure options and click "Start Conversion" to queue jobs.</p>
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3.5 rounded-2xl border border-neutral-200 bg-white space-y-2 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs sm:text-sm font-semibold text-neutral-900 truncate">
                        {task.sourceVideoTitle}
                      </h4>
                      <p className="text-[11px] text-neutral-500 font-mono">
                        Target: .{task.config.targetFormat.toUpperCase()} · {task.config.targetResolution || 'Audio'} · {task.config.targetFolder}
                      </p>
                    </div>

                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                      task.status === 'completed' 
                        ? 'bg-green-100 text-green-800' 
                        : task.status === 'converting'
                        ? 'bg-blue-100 text-blue-800 animate-pulse'
                        : task.status === 'error'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-neutral-100 text-neutral-700'
                    }`}>
                      {task.status}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          task.status === 'completed' ? 'bg-green-600' : task.status === 'error' ? 'bg-red-600' : 'bg-black'
                        }`}
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono">
                      <span className="truncate max-w-[280px]">{task.currentMessage}</span>
                      <span>{task.progress}%</span>
                    </div>
                  </div>

                  {task.status === 'converting' && (
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => conversionQueue.cancelTask(task.id)}
                        className="text-[11px] text-red-600 font-semibold hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
