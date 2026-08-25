import React, { useState, useEffect } from 'react';
import { 
  Link2, 
  ArrowRight, 
  Play, 
  MoreVertical, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  X, 
  Clipboard, 
  Film, 
  Music, 
  Sliders, 
  Sparkles,
  HardDrive,
  Clock,
  Layers,
  ListPlus
} from 'lucide-react';
import { VideoInfo, VideoFormat, DownloadTask, DownloadedVideo } from '../types';
import { fetchVideoInfo, fetchSampleVideos, downloadAndSaveVideo } from '../services/downloader';
import { downloadQueue } from '../services/downloadQueue';
import { CardMenuModal } from './CardMenuModal';
import { exportVideoToFile } from '../services/storage';

interface DownloadCenterProps {
  recentVideos: DownloadedVideo[];
  onDownloadComplete: (video: DownloadedVideo) => void;
  onPlayVideo: (video: DownloadedVideo) => void;
  onDeleteVideo: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onUpdateMetadata: (id: string, updates: Partial<DownloadedVideo>) => void;
  onOpenQueueModal?: () => void;
  onOpenStudio?: (videoId: string) => void;
  onAddToPlaylist?: (video: DownloadedVideo) => void;
  onOpenYouTubeBrowser?: () => void;
  isOnline: boolean;
}

export const DownloadCenter: React.FC<DownloadCenterProps> = ({
  recentVideos,
  onDownloadComplete,
  onPlayVideo,
  onDeleteVideo,
  onToggleFavorite,
  onUpdateMetadata,
  onOpenQueueModal,
  onOpenStudio,
  onAddToPlaylist,
  onOpenYouTubeBrowser,
  isOnline,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Format Selection Modal / Sheet
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<VideoFormat | null>(null);
  const [formatCategory, setFormatCategory] = useState<'video' | 'audio'>('video');
  const [sampleVideos, setSampleVideos] = useState<VideoInfo[]>([]);
  
  // Active download queue status
  const [queueTasks, setQueueTasks] = useState<DownloadTask[]>([]);
  const [completedNotification, setCompletedNotification] = useState<DownloadedVideo | null>(null);

  // Selected card for 3-dots menu
  const [menuTargetVideo, setMenuTargetVideo] = useState<DownloadedVideo | null>(null);

  // Subscribe to download queue
  useEffect(() => {
    const unsubscribe = downloadQueue.subscribe((tasks) => {
      setQueueTasks(tasks);
    });
    return () => unsubscribe();
  }, []);

  // Load sample videos
  useEffect(() => {
    fetchSampleVideos().then((samples) => {
      setSampleVideos(samples);
    });
  }, []);

  const handleFetchInfo = async (targetUrl?: string) => {
    const urlToFetch = targetUrl || urlInput;
    if (!urlToFetch.trim()) {
      setErrorMessage('Please paste a YouTube video link or media URL.');
      return;
    }

    setErrorMessage(null);
    setIsLoadingInfo(true);
    setCompletedNotification(null);

    try {
      const info = await fetchVideoInfo(urlToFetch);
      setVideoInfo(info);
      if (info.formats && info.formats.length > 0) {
        const defaultFmt = info.formats.find(f => f.hasVideo && f.hasAudio) || info.formats[0];
        setSelectedFormat(defaultFmt);
        setFormatCategory(defaultFmt.hasVideo ? 'video' : 'audio');
      }
    } catch (err: any) {
      console.error('Fetch info error:', err);
      setErrorMessage(
        err.message || 'Could not fetch video info. Try one of our instant sample links below!'
      );
    } finally {
      setIsLoadingInfo(false);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setUrlInput(text);
          handleFetchInfo(text);
        }
      }
    } catch (e) {
      // Permission denied
    }
  };

  const handleQueueDownload = () => {
    if (!videoInfo || !selectedFormat) return;

    // Add directly to singleton download queue manager
    const taskId = downloadQueue.addToQueue(videoInfo, selectedFormat);
    setVideoInfo(null);
    setUrlInput('');

    if (onOpenQueueModal) {
      // Prompt user with queue status
    }
  };

  const activeDownloadingTask = queueTasks.find(t => t.status === 'downloading' || t.status === 'saving');
  const activeCount = queueTasks.filter(t => t.status === 'downloading' || t.status === 'saving' || t.status === 'queued').length;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-32">
      
      {/* Title Section matching reference */}
      <div className="text-left mb-6 sm:mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-neutral-950 uppercase font-mono">
            MEDIA DOWNLOADER
          </h1>
          <p className="text-sm sm:text-base text-neutral-500 font-normal mt-1.5">
            Download 4K, 1080p, 720p, or high-fidelity audio directly into offline storage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* YouTube Browser Button */}
          {onOpenYouTubeBrowser && (
            <button
              onClick={onOpenYouTubeBrowser}
              className="px-4 py-2 rounded-full bg-neutral-900 hover:bg-black text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-all active:scale-95"
            >
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>YouTube Browser</span>
            </button>
          )}

          {/* Download Queue Trigger Button */}
          {onOpenQueueModal && (
            <button
              onClick={onOpenQueueModal}
              className="px-4 py-2 rounded-full bg-white hover:bg-neutral-100 border border-neutral-200/90 text-neutral-900 text-xs font-semibold flex items-center gap-2 shadow-2xs transition-all active:scale-95"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Queue</span>
              {activeCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-black text-white text-[10px] font-mono flex items-center justify-center font-bold">
                  {activeCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Pill-shaped URL Input Field */}
      <div className="relative mb-6">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleFetchInfo();
          }}
          className="w-full bg-white rounded-full p-2 pl-5 sm:pl-6 border border-neutral-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex items-center gap-3 transition-all focus-within:border-neutral-900 focus-within:ring-2 focus-within:ring-neutral-950/5"
        >
          {/* Chain Link Icon */}
          <Link2 className="w-5 h-5 text-neutral-400 flex-shrink-0 stroke-[1.8]" />

          {/* Text Input */}
          <input
            id="video-url-input"
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Paste video or playlist URL here"
            className="w-full bg-transparent text-sm sm:text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none tracking-tight font-normal"
            disabled={isLoadingInfo}
          />

          {/* Quick Paste or Clear Button */}
          {urlInput ? (
            <button
              type="button"
              onClick={() => setUrlInput('')}
              className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors flex-shrink-0"
              title="Clear input"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePasteClipboard}
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-medium transition-colors flex-shrink-0"
              title="Paste from clipboard"
            >
              <Clipboard className="w-3.5 h-3.5" />
              <span>Paste</span>
            </button>
          )}

          {/* Black Circular Action Button */}
          <button
            id="fetch-video-btn"
            type="submit"
            disabled={isLoadingInfo || !urlInput.trim()}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0 transition-all shadow-md ${
              isLoadingInfo || !urlInput.trim()
                ? 'opacity-60 cursor-not-allowed'
                : 'hover:scale-105 active:scale-95 hover:bg-neutral-900 cursor-pointer'
            }`}
            title="Download video"
          >
            {isLoadingInfo ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <ArrowRight className="w-5 h-5 stroke-[2.2]" />
            )}
          </button>
        </form>
      </div>

      {/* Quick Test Samples Chips */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        <span className="text-xs text-neutral-400 font-mono flex items-center gap-1.5 mr-1">
          <Sparkles className="w-3.5 h-3.5 text-neutral-700" />
          <span>Quick samples:</span>
        </span>
        {sampleVideos.map((sample) => (
          <button
            key={sample.id}
            onClick={() => {
              setUrlInput(sample.url);
              handleFetchInfo(sample.url);
            }}
            className="px-3.5 py-1.5 rounded-full bg-white/80 hover:bg-white text-neutral-700 hover:text-neutral-950 border border-neutral-200/90 text-xs font-medium transition-all shadow-2xs hover:border-neutral-400 active:scale-95"
          >
            {sample.title}
          </button>
        ))}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-white border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-3 shadow-2xs animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{errorMessage}</p>
          </div>
          <button 
            onClick={() => setErrorMessage(null)} 
            className="text-neutral-400 hover:text-neutral-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Active Download Queue Live Banner */}
      {activeDownloadingTask && (
        <div 
          onClick={onOpenQueueModal}
          className="mb-8 p-4 sm:p-5 rounded-3xl bg-white border border-neutral-300/90 shadow-md cursor-pointer hover:border-black transition-all animate-in zoom-in-95"
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0 animate-pulse">
                <Download className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Saving to offline disk</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-100 font-mono text-neutral-700 font-semibold">
                    {activeDownloadingTask.format.qualityLabel || activeDownloadingTask.format.quality}
                  </span>
                </div>
                <h4 className="text-xs sm:text-sm font-semibold text-neutral-900 truncate">{activeDownloadingTask.videoInfo.title}</h4>
              </div>
            </div>
            <div className="text-right flex-shrink-0 font-mono text-xs text-neutral-600">
              <span className="font-bold text-neutral-950">{Math.round(activeDownloadingTask.progress)}%</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden mb-2">
            <div 
              className="h-full bg-black rounded-full transition-all duration-300"
              style={{ width: `${Math.max(3, activeDownloadingTask.progress)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500">
            <span>{activeDownloadingTask.speedFormatted || 'Calculating speed...'}</span>
            <span>{activeDownloadingTask.eta || 'Estimating time...'}</span>
          </div>
        </div>
      )}

      {/* Quality Selection Modal (Nothing OS Style) */}
      {videoInfo && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in"
          onClick={() => setVideoInfo(null)}
        >
          <div 
            className="w-full max-w-lg bg-white rounded-[32px] p-6 shadow-2xl border border-neutral-200/90 text-neutral-900 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-14 h-14 rounded-2xl bg-neutral-100 overflow-hidden flex-shrink-0 border border-neutral-200/60">
                  <img 
                    src={videoInfo.thumbnail} 
                    alt={videoInfo.title} 
                    className="w-full h-full object-cover grayscale"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest">{videoInfo.author || 'Video Source'}</span>
                  <h3 className="text-sm sm:text-base font-semibold text-neutral-900 line-clamp-2 leading-tight">
                    {videoInfo.title}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1 font-mono">{videoInfo.durationFormatted}</p>
                </div>
              </div>
              <button 
                onClick={() => setVideoInfo(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Category Toggle: Video vs Audio */}
            <div className="my-4 p-1 rounded-2xl bg-neutral-100 border border-neutral-200/80 grid grid-cols-2 gap-1">
              <button
                onClick={() => {
                  setFormatCategory('video');
                  const firstVideo = videoInfo.formats.find(f => f.hasVideo);
                  if (firstVideo) setSelectedFormat(firstVideo);
                }}
                className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  formatCategory === 'video'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Video MP4 / WebM</span>
              </button>
              <button
                onClick={() => {
                  setFormatCategory('audio');
                  const firstAudio = videoInfo.formats.find(f => !f.hasVideo || f.container === 'mp3') || videoInfo.formats[0];
                  if (firstAudio) setSelectedFormat(firstAudio);
                }}
                className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  formatCategory === 'audio'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <Music className="w-3.5 h-3.5" />
                <span>Audio MP3 / WAV</span>
              </button>
            </div>

            {/* Formats List */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {videoInfo.formats
                .filter(f => formatCategory === 'video' ? f.hasVideo : (!f.hasVideo || f.container === 'mp3'))
                .map((fmt) => (
                  <button
                    key={fmt.itag}
                    onClick={() => setSelectedFormat(fmt)}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                      selectedFormat?.itag === fmt.itag
                        ? 'bg-black text-white border-black shadow-sm'
                        : 'bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-900'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs sm:text-sm">{fmt.qualityLabel || fmt.quality}</div>
                      <div className={`text-[11px] font-mono ${selectedFormat?.itag === fmt.itag ? 'text-neutral-300' : 'text-neutral-500'}`}>
                        .{fmt.container || 'mp4'} · {fmt.mimeType.split(';')[0]}
                      </div>
                    </div>
                    <span className="text-xs font-mono font-semibold">
                      {fmt.approxSize || 'Standard'}
                    </span>
                  </button>
                ))}
            </div>

            {/* Download CTA Button */}
            <div className="mt-5 pt-3 border-t border-neutral-100 flex items-center gap-2">
              <button
                onClick={handleQueueDownload}
                disabled={!selectedFormat}
                className="w-full py-3.5 rounded-full bg-black hover:bg-neutral-900 active:scale-98 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Start Download ({selectedFormat?.qualityLabel || 'Selected Quality'})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: RECENT DOWNLOADS */}
      <div className="mt-4 sm:mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-widest font-mono">
            RECENT DOWNLOADS
          </h2>
          <span className="text-xs font-mono text-neutral-400">
            {recentVideos.length} items
          </span>
        </div>

        {recentVideos.length === 0 ? (
          <div className="p-8 text-center bg-white/70 rounded-[28px] border border-neutral-200/80">
            <p className="text-sm text-neutral-500">No downloads saved yet. Paste a link or pick a sample video above!</p>
          </div>
        ) : (
          <>
            {/* MOBILE LAYOUT (< md) */}
            <div className="block md:hidden space-y-3">
              {recentVideos.map((video) => (
                <div 
                  key={video.id}
                  className="w-full bg-white/90 backdrop-blur-xs rounded-[24px] p-3 border border-neutral-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between gap-3 group transition-all"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div 
                      onClick={() => onPlayVideo(video)}
                      className="w-20 h-20 rounded-2xl bg-neutral-100 overflow-hidden relative flex-shrink-0 cursor-pointer border border-neutral-200/60"
                    >
                      <img 
                        src={video.thumbnailUrl || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&q=80'} 
                        alt={video.title}
                        className="w-full h-full object-cover grayscale group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <span className="bg-black/90 text-white text-[10px] font-mono font-medium px-2 py-0.5 rounded-full absolute bottom-1.5 left-1.5 shadow-2xs">
                        {video.durationFormatted}
                      </span>
                    </div>

                    <div className="min-w-0 pr-1">
                      <h3 
                        onClick={() => onPlayVideo(video)}
                        className="text-sm font-semibold text-neutral-900 line-clamp-2 leading-tight cursor-pointer hover:text-black"
                      >
                        {video.title}
                      </h3>
                      <p className="text-xs text-neutral-400 font-mono mt-1.5 flex items-center gap-1.5">
                        <span>{video.quality || '1080p'}</span>
                        <span>·</span>
                        <span>{video.fileSizeFormatted}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => onPlayVideo(video)}
                      className="w-10 h-10 rounded-full bg-neutral-100 hover:bg-black hover:text-white text-neutral-900 border border-neutral-200/80 flex items-center justify-center transition-all shadow-2xs active:scale-95"
                      title="Play media"
                    >
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </button>

                    <button
                      onClick={() => setMenuTargetVideo(video)}
                      className="w-8 h-8 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 flex items-center justify-center transition-colors"
                      title="More options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* TABLET / DESKTOP LAYOUT (>= md) */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {recentVideos.map((video) => (
                <div
                  key={video.id}
                  className="bg-white/90 backdrop-blur-xs rounded-[28px] p-4 border border-neutral-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between group hover:border-neutral-300 transition-all"
                >
                  <div>
                    <div 
                      onClick={() => onPlayVideo(video)}
                      className="w-full aspect-[4/3] rounded-[20px] bg-neutral-100 overflow-hidden relative cursor-pointer border border-neutral-200/60"
                    >
                      <img 
                        src={video.thumbnailUrl || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&q=80'} 
                        alt={video.title}
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <span className="bg-black/90 text-white text-[11px] font-mono font-medium px-2.5 py-1 rounded-full absolute bottom-2.5 left-2.5 shadow-sm">
                        {video.durationFormatted}
                      </span>
                    </div>

                    <h3 
                      onClick={() => onPlayVideo(video)}
                      className="text-base font-semibold text-neutral-900 line-clamp-2 mt-3.5 mb-1 tracking-tight leading-snug cursor-pointer hover:text-black"
                    >
                      {video.title}
                    </h3>

                    <p className="text-xs text-neutral-400 font-mono mb-4">
                      {video.quality || '1080p'} &nbsp;·&nbsp; {video.fileSizeFormatted}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                    <button
                      onClick={() => onPlayVideo(video)}
                      className="w-10 h-10 rounded-full bg-neutral-100 hover:bg-black hover:text-white text-neutral-900 border border-neutral-200/80 flex items-center justify-center transition-all shadow-2xs active:scale-95"
                      title="Play media"
                    >
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </button>

                    <button
                      onClick={() => setMenuTargetVideo(video)}
                      className="w-8 h-8 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 flex items-center justify-center transition-colors"
                      title="More options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Card Menu Modal */}
      {menuTargetVideo && (
        <CardMenuModal
          video={menuTargetVideo}
          isOpen={!!menuTargetVideo}
          onClose={() => setMenuTargetVideo(null)}
          onPlay={onPlayVideo}
          onExport={exportVideoToFile}
          onToggleFavorite={onToggleFavorite}
          onEdit={() => {
            const newTitle = prompt('Edit video title:', menuTargetVideo.title);
            if (newTitle && newTitle.trim()) {
              onUpdateMetadata(menuTargetVideo.id, { title: newTitle.trim() });
            }
          }}
          onDelete={onDeleteVideo}
          onOpenStudio={onOpenStudio}
          onAddToPlaylist={onAddToPlaylist}
        />
      )}
    </div>
  );
};
