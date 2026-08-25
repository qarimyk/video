import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Play, 
  Download, 
  ArrowRight, 
  Film, 
  Music, 
  Check, 
  Sparkles, 
  ExternalLink,
  ChevronDown,
  Layers,
  Clock,
  Radio,
  Sliders
} from 'lucide-react';
import { VideoInfo, VideoFormat } from '../types';
import { fetchVideoInfo } from '../services/downloader';
import { downloadQueue } from '../services/downloadQueue';

interface YouTubeBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadQueued?: () => void;
  initialUrl?: string;
}

interface CuratedItem {
  id: string;
  title: string;
  channel: string;
  duration: string;
  thumbnail: string;
  url: string;
  tag: string;
  resolution: string;
}

const CURATED_EXPLORE_FEED: CuratedItem[] = [
  {
    id: 'yt-minimal-design',
    title: 'Nothing Phone Hardware & CMF Industrial Design Language',
    channel: 'Industrial Design Studio',
    duration: '04:32',
    thumbnail: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    tag: 'Design & CMF',
    resolution: '4K / 1080p'
  },
  {
    id: 'yt-lofi-beats',
    title: 'Monochrome Ambient Synth & Deep Focus Electronics',
    channel: 'Hardware Future Collective',
    duration: '05:07',
    thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
    tag: 'Audio Focus',
    resolution: '1080p / MP3'
  },
  {
    id: 'yt-interview-designers',
    title: 'Interview with Nothing Industrial Hardware Engineers',
    channel: 'Nothing CMF Labs',
    duration: '03:15',
    thumbnail: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&auto=format&fit=crop&q=80',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    tag: 'Engineering',
    resolution: '1080p 60fps'
  },
  {
    id: 'yt-blender-remaster',
    title: 'Big Buck Bunny 4K 60FPS HDR Open Cinema Remaster',
    channel: 'Blender Studio',
    duration: '09:56',
    thumbnail: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    tag: 'Cinema 4K',
    resolution: '4K Ultra HD'
  }
];

export const YouTubeBrowserModal: React.FC<YouTubeBrowserModalProps> = ({
  isOpen,
  onClose,
  onDownloadQueued,
  initialUrl = ''
}) => {
  const [searchQuery, setSearchQuery] = useState(initialUrl);
  const [activeVideo, setActiveVideo] = useState<CuratedItem | VideoInfo | null>(CURATED_EXPLORE_FEED[0]);
  const [detectedVideoInfo, setDetectedVideoInfo] = useState<VideoInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormatSelectorOpen, setIsFormatSelectorOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<VideoFormat | null>(null);
  const [formatType, setFormatType] = useState<'video' | 'audio'>('video');
  const [downloadSuccessToast, setDownloadSuccessToast] = useState(false);

  // Auto-detect when activeVideo changes
  useEffect(() => {
    if (activeVideo) {
      loadVideoInfo(activeVideo.url);
    }
  }, [activeVideo?.url]);

  const loadVideoInfo = async (url: string) => {
    setIsLoading(true);
    try {
      const info = await fetchVideoInfo(url);
      setDetectedVideoInfo(info);
      if (info.formats && info.formats.length > 0) {
        const bestFmt = info.formats.find(f => f.hasVideo && f.hasAudio) || info.formats[0];
        setSelectedFormat(bestFmt);
      }
    } catch (e) {
      console.warn('Failed to extract full video info:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Check if matching a curated feed item or URL
    const query = searchQuery.trim();
    loadVideoInfo(query);
  };

  const handleStartDownload = () => {
    if (!detectedVideoInfo || !selectedFormat) return;

    downloadQueue.addToQueue(detectedVideoInfo, selectedFormat);
    setIsFormatSelectorOpen(false);
    setDownloadSuccessToast(true);

    if (onDownloadQueued) onDownloadQueued();

    setTimeout(() => {
      setDownloadSuccessToast(false);
    }, 3000);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/65 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl max-h-[92vh] bg-[#f7f7f9] rounded-[32px] sm:rounded-[36px] border border-neutral-200/90 shadow-2xl flex flex-col overflow-hidden text-neutral-900 animate-in zoom-in-95 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Browser Bar */}
        <div className="bg-white px-5 sm:px-6 py-3.5 border-b border-neutral-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-mono text-xs font-bold flex-shrink-0">
              YT
            </div>
            
            {/* Search / URL input bar */}
            <form onSubmit={handleSearch} className="flex-1 relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search YouTube or paste URL (e.g. youtube.com/watch?v=...)"
                className="w-full pl-9 pr-8 py-2 rounded-full bg-neutral-100 border border-neutral-200/80 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-black font-medium"
              />
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="w-5 h-5 rounded-full text-neutral-400 hover:text-neutral-700 absolute right-3 flex items-center justify-center text-xs"
                >
                  ×
                </button>
              )}
            </form>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-colors flex-shrink-0"
            title="Close browser"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Active Preview Deck */}
          {activeVideo && (
            <div className="bg-white rounded-[28px] p-4 sm:p-5 border border-neutral-200 shadow-xs relative group">
              <div className="w-full aspect-video rounded-2xl bg-black overflow-hidden relative border border-neutral-200">
                <video
                  key={activeVideo.url}
                  src={activeVideo.url}
                  controls
                  className="w-full h-full object-contain"
                  poster={'thumbnail' in activeVideo ? activeVideo.thumbnail : undefined}
                />
              </div>

              {/* Title & Metadata */}
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded-full font-bold">
                      YouTube Stream Detected
                    </span>
                    <span className="text-[11px] font-mono text-neutral-500">
                      {'duration' in activeVideo ? activeVideo.duration : (activeVideo as VideoInfo).durationFormatted}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-neutral-950 mt-1 leading-snug">
                    {activeVideo.title}
                  </h3>
                  <p className="text-xs text-neutral-500 font-mono mt-0.5">
                    {'channel' in activeVideo ? activeVideo.channel : (activeVideo as VideoInfo).author}
                  </p>
                </div>

                {/* Minimal Floating Download Action Pill */}
                <button
                  onClick={() => setIsFormatSelectorOpen(true)}
                  className="px-5 py-3 rounded-full bg-black hover:bg-neutral-800 active:scale-95 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-lg transition-all flex-shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Media</span>
                </button>
              </div>
            </div>
          )}

          {/* Curated Explorer Grid */}
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-neutral-700" />
                <h4 className="text-xs font-bold font-mono text-neutral-600 uppercase tracking-wider">
                  Curated Media Streams
                </h4>
              </div>
              <span className="text-xs font-mono text-neutral-400">100% Offline Compatible</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {CURATED_EXPLORE_FEED.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setActiveVideo(item);
                    setSearchQuery(item.url);
                  }}
                  className={`p-3 rounded-2xl bg-white border transition-all cursor-pointer flex items-center gap-3.5 group hover:border-black ${
                    activeVideo?.title === item.title ? 'border-black ring-1 ring-black' : 'border-neutral-200'
                  }`}
                >
                  <div className="w-20 h-14 rounded-xl bg-neutral-100 overflow-hidden relative flex-shrink-0 border border-neutral-200">
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] font-mono px-1 rounded">
                      {item.duration}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-neutral-400">
                      <span className="text-neutral-800 font-semibold">{item.tag}</span>
                      <span>·</span>
                      <span>{item.resolution}</span>
                    </div>
                    <h5 className="text-xs font-bold text-neutral-900 truncate mt-0.5 group-hover:text-black">
                      {item.title}
                    </h5>
                    <p className="text-[11px] text-neutral-500 font-mono truncate">{item.channel}</p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveVideo(item);
                      setIsFormatSelectorOpen(true);
                    }}
                    className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-black hover:text-white text-neutral-800 flex items-center justify-center transition-all flex-shrink-0"
                    title="Quick download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quality & Format Selection Modal / Bottom Sheet */}
        {isFormatSelectorOpen && detectedVideoInfo && (
          <div 
            className="absolute inset-0 z-20 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
            onClick={() => setIsFormatSelectorOpen(false)}
          >
            <div 
              className="w-full sm:max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] p-6 border border-neutral-200 shadow-2xl space-y-4 animate-in slide-in-from-bottom sm:zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-neutral-700" />
                  <h4 className="text-sm font-bold font-mono uppercase">Choose Download Quality</h4>
                </div>
                <button
                  onClick={() => setIsFormatSelectorOpen(false)}
                  className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Format Toggle: Video vs Audio */}
              <div className="p-1 rounded-2xl bg-neutral-100 border border-neutral-200 grid grid-cols-2 gap-1">
                <button
                  onClick={() => {
                    setFormatType('video');
                    const firstVid = detectedVideoInfo.formats.find(f => f.hasVideo);
                    if (firstVid) setSelectedFormat(firstVid);
                  }}
                  className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    formatType === 'video' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Video (MP4/WebM)</span>
                </button>

                <button
                  onClick={() => {
                    setFormatType('audio');
                    const firstAud = detectedVideoInfo.formats.find(f => !f.hasVideo || f.container === 'mp3') || detectedVideoInfo.formats[0];
                    if (firstAud) setSelectedFormat(firstAud);
                  }}
                  className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    formatType === 'audio' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>Audio (MP3 320k)</span>
                </button>
              </div>

              {/* Stream List */}
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {detectedVideoInfo.formats
                  .filter(f => formatType === 'video' ? f.hasVideo : (!f.hasVideo || f.container === 'mp3'))
                  .map((fmt) => (
                    <button
                      key={fmt.itag}
                      onClick={() => setSelectedFormat(fmt)}
                      className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                        selectedFormat?.itag === fmt.itag
                          ? 'bg-black text-white border-black'
                          : 'bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-900'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs">{fmt.qualityLabel || fmt.quality}</div>
                        <div className={`text-[10px] font-mono ${selectedFormat?.itag === fmt.itag ? 'text-neutral-300' : 'text-neutral-400'}`}>
                          .{fmt.container || 'mp4'} · {fmt.mimeType.split(';')[0]}
                        </div>
                      </div>
                      <span className="text-xs font-mono font-semibold">{fmt.approxSize || 'Standard'}</span>
                    </button>
                  ))}
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={handleStartDownload}
                  disabled={!selectedFormat}
                  className="w-full py-3.5 rounded-full bg-black hover:bg-neutral-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
                >
                  <Download className="w-4 h-4" />
                  <span>Start Download ({selectedFormat?.qualityLabel || 'Selected'})</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Toast */}
        {downloadSuccessToast && (
          <div className="absolute top-16 inset-x-0 mx-auto w-fit z-30 px-4 py-2 rounded-full bg-black text-white text-xs font-semibold flex items-center gap-2 shadow-xl animate-in slide-in-from-top duration-200">
            <Check className="w-3.5 h-3.5 text-green-400" />
            <span>Queued in background download manager!</span>
          </div>
        )}
      </div>
    </div>
  );
};
