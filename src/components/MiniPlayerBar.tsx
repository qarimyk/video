import React, { useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Maximize2, 
  Music, 
  Volume2, 
  VolumeX,
  X,
  Disc
} from 'lucide-react';
import { DownloadedVideo } from '../types';

interface MiniPlayerBarProps {
  currentVideo: DownloadedVideo | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onExpand: () => void;
  onClose: () => void;
}

export const MiniPlayerBar: React.FC<MiniPlayerBarProps> = ({
  currentVideo,
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  onNext,
  onPrev,
  onExpand,
  onClose,
}) => {
  if (!currentVideo) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isAudio = currentVideo.type === 'audio' || currentVideo.format === 'mp3' || currentVideo.format === 'wav';

  return (
    <div className="fixed bottom-24 inset-x-0 z-40 flex justify-center px-4 pointer-events-none animate-in slide-in-from-bottom-4 duration-300">
      <div 
        className="pointer-events-auto w-full max-w-xl bg-white/95 backdrop-blur-xl border border-neutral-200/90 rounded-[28px] p-2.5 pl-3.5 pr-3 shadow-[0_12px_36px_rgba(0,0,0,0.12)] flex items-center justify-between gap-3 transition-all hover:border-neutral-300"
      >
        {/* Left: Thumbnail / Disc Spin + Title & Author */}
        <div 
          onClick={onExpand}
          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
        >
          {/* Thumbnail */}
          <div className="w-10 h-10 rounded-xl bg-neutral-900 overflow-hidden relative flex-shrink-0 border border-neutral-200/60 shadow-xs flex items-center justify-center">
            {isAudio ? (
              <div className={`w-full h-full flex items-center justify-center bg-neutral-950 text-white ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '8s' }}>
                <Disc className="w-6 h-6 text-neutral-300" />
              </div>
            ) : (
              <img 
                src={currentVideo.thumbnailUrl || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=200&q=80'} 
                alt={currentVideo.title}
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                referrerPolicy="no-referrer"
              />
            )}
          </div>

          <div className="min-w-0 pr-1">
            <h4 className="text-xs sm:text-sm font-semibold text-neutral-950 truncate tracking-tight group-hover:text-black">
              {currentVideo.title}
            </h4>
            <p className="text-[11px] text-neutral-500 font-mono truncate flex items-center gap-1.5">
              <span>{currentVideo.author || 'Offline Media'}</span>
              <span>·</span>
              <span>{currentVideo.format.toUpperCase()}</span>
            </p>
          </div>
        </div>

        {/* Middle & Right: Controls */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {onPrev && (
            <button
              onClick={onPrev}
              className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-700 transition-colors"
              title="Previous"
            >
              <SkipBack className="w-4 h-4 fill-current ml-0.5" />
            </button>
          )}

          {/* Black Circular Play/Pause */}
          <button
            onClick={onTogglePlay}
            className="w-9 h-9 rounded-full bg-black text-white hover:bg-neutral-900 active:scale-95 flex items-center justify-center transition-all shadow-xs"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          {onNext && (
            <button
              onClick={onNext}
              className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-700 transition-colors"
              title="Next"
            >
              <SkipForward className="w-4 h-4 fill-current mr-0.5" />
            </button>
          )}

          {/* Expand to Full Player */}
          <button
            onClick={onExpand}
            className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-600 hover:text-black transition-colors"
            title="Expand player"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* Dismiss Mini Player */}
          <button
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bottom micro progress line */}
        <div className="absolute bottom-0 inset-x-6 h-0.5 bg-neutral-200/50 rounded-full overflow-hidden">
          <div 
            className="h-full bg-black transition-all duration-200"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
