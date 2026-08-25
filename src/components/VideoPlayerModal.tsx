import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  RotateCcw, 
  RotateCw, 
  Download, 
  Heart, 
  Repeat, 
  Shuffle, 
  ListMusic, 
  Sliders, 
  Subtitles, 
  Scissors, 
  Plus, 
  Disc,
  FastForward,
  SkipBack,
  SkipForward,
  Moon,
  Clock,
  Check
} from 'lucide-react';
import { DownloadedVideo, PlaybackRepeatMode, SleepTimerDuration, SleepTimerState } from '../types';
import { formatBytes, formatDuration, recordVideoPlayback, toggleFavoriteVideo, exportVideoToFile } from '../services/storage';
import { sleepTimer } from '../services/sleepTimer';

interface VideoPlayerModalProps {
  video: DownloadedVideo;
  queue?: DownloadedVideo[];
  isOpen: boolean;
  onClose: () => void;
  onOpenStudio?: (videoId: string) => void;
  onAddToPlaylist?: (video: DownloadedVideo) => void;
  onPlayNext?: () => void;
  onPlayPrev?: () => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  video,
  queue = [],
  isOpen,
  onClose,
  onOpenStudio,
  onAddToPlaylist,
  onPlayNext,
  onPlayPrev,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [repeatMode, setRepeatMode] = useState<PlaybackRepeatMode>('off');
  const [isShuffle, setIsShuffle] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(video.isFavorite || false);

  // Subtitles & Queue Drawer
  const [showQueue, setShowQueue] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [currentSubtitleText, setCurrentSubtitleText] = useState<string | null>(null);

  // A-B Loop
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);

  // Blob URL
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  // Sleep Timer state
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [sleepState, setSleepState] = useState<SleepTimerState>(sleepTimer.getState());
  const [customMinutes, setCustomMinutes] = useState(25);
  const [fadeOutVolume, setFadeOutVolume] = useState(true);

  // Subscribe to Sleep Timer
  useEffect(() => {
    const unsub = sleepTimer.subscribe((state) => {
      setSleepState(state);
    });

    sleepTimer.registerCallbacks(
      () => {
        if (videoRef.current) {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      },
      (volumeRatio) => {
        if (videoRef.current) {
          videoRef.current.volume = Math.max(0, Math.min(1, volumeRatio));
        }
      }
    );

    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    if (video.videoBlob) {
      const url = URL.createObjectURL(video.videoBlob);
      setBlobUrl(url);
      setIsFavorite(video.isFavorite || false);
      setCurrentTime(0);

      // Record playback count in storage
      recordVideoPlayback(video.id);

      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [video]);

  const isAudio = video.type === 'audio' || video.format === 'mp3' || video.format === 'wav';

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      setCurrentTime(cur);

      // Check A-B loop
      if (loopA !== null && loopB !== null && cur >= loopB) {
        videoRef.current.currentTime = loopA;
        return;
      }

      // Check Subtitles
      if (showSubtitles && video.subtitles && video.subtitles.length > 0) {
        const activeCues = video.subtitles[0].cues.find(c => cur >= c.start && cur <= c.end);
        setCurrentSubtitleText(activeCues ? activeCues.text : null);
      } else {
        setCurrentSubtitleText(null);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const d = videoRef.current.duration || video.duration || 10;
      setDuration(d);
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleEnded = () => {
    // Notify sleep timer
    sleepTimer.onMediaEnded(queue.length === 0 || !onPlayNext);

    if (repeatMode === 'one') {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
      }
    } else if (onPlayNext && queue.length > 0) {
      onPlayNext();
    } else {
      setIsPlaying(false);
    }
  };

  const seek = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, seconds));
    }
  };

  const changeRate = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFavorite = async () => {
    const fav = await toggleFavoriteVideo(video.id);
    setIsFavorite(fav);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div 
        ref={containerRef}
        className="w-full max-w-4xl bg-neutral-950 text-white rounded-[32px] overflow-hidden shadow-2xl border border-neutral-800 flex flex-col max-h-[92vh] animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar Header */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-neutral-900 bg-neutral-950/80 backdrop-blur-xs flex-shrink-0">
          <div className="min-w-0 flex-1 mr-3">
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
              {isAudio ? 'Audio Player' : 'Media Player'} · {video.quality} · {video.format.toUpperCase()}
            </span>
            <h3 className="text-sm sm:text-base font-bold text-white truncate tracking-tight">
              {video.title}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Send to Studio Button */}
            {onOpenStudio && (
              <button
                onClick={() => {
                  onClose();
                  onOpenStudio(video.id);
                }}
                className="px-3 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Edit in Studio"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Studio</span>
              </button>
            )}

            {/* Add to Playlist */}
            {onAddToPlaylist && (
              <button
                onClick={() => onAddToPlaylist(video)}
                className="px-3 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Add to Playlist"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Playlist</span>
              </button>
            )}

            {/* Favorite */}
            <button
              onClick={toggleFavorite}
              className={`p-2 rounded-full transition-colors ${
                isFavorite ? 'text-red-500 bg-neutral-900' : 'text-neutral-400 hover:text-white bg-neutral-900'
              }`}
              title="Favorite"
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>

            {/* Export single video to disk */}
            <button
              onClick={() => exportVideoToFile(video)}
              className="p-2 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
              title="Save to device files"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Media Screen Area */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[260px] sm:min-h-[380px] overflow-hidden">
          {blobUrl && (
            <video
              ref={videoRef}
              src={blobUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleEnded}
              className={`w-full h-full object-contain ${isAudio ? 'hidden' : 'block'}`}
              playsInline
            />
          )}

          {/* Audio Visualizer & Vinyl Disc view if audio mode */}
          {isAudio && (
            <div className="flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
              <div className={`w-40 h-40 sm:w-52 sm:h-52 rounded-full bg-neutral-900 border-4 border-neutral-800 shadow-2xl flex items-center justify-center relative overflow-hidden mb-6 ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '10s' }}>
                <Disc className="w-24 h-24 text-neutral-600" />
                <div className="w-12 h-12 rounded-full bg-black border-2 border-neutral-700 absolute flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-white" />
                </div>
              </div>
              <p className="text-base font-bold text-white max-w-md truncate">{video.title}</p>
              <p className="text-xs text-neutral-400 font-mono mt-1">{video.author || 'Offline Audio Track'}</p>
            </div>
          )}

          {/* Subtitles Overlay */}
          {currentSubtitleText && (
            <div className="absolute bottom-6 inset-x-6 flex justify-center pointer-events-none">
              <span className="bg-black/85 text-white font-sans text-sm sm:text-base font-medium px-4 py-1.5 rounded-xl border border-neutral-800 shadow-xl max-w-lg text-center backdrop-blur-xs">
                {currentSubtitleText}
              </span>
            </div>
          )}
        </div>

        {/* Bottom Playback Control Deck */}
        <div className="p-4 sm:p-5 bg-neutral-950 border-t border-neutral-900 flex-shrink-0 space-y-3">
          
          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-neutral-400 min-w-[40px]">
              {formatDuration(currentTime)}
            </span>

            <div className="relative flex-1 flex items-center">
              <input
                type="range"
                min={0}
                max={duration || 10}
                step={0.1}
                value={currentTime}
                onChange={(e) => seek(parseFloat(e.target.value))}
                className="w-full accent-white h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
              />

              {/* Loop markers */}
              {loopA !== null && duration > 0 && (
                <div 
                  className="w-1.5 h-3 bg-blue-500 absolute top-1/2 -translate-y-1/2 pointer-events-none rounded"
                  style={{ left: `${(loopA / duration) * 100}%` }}
                />
              )}
              {loopB !== null && duration > 0 && (
                <div 
                  className="w-1.5 h-3 bg-red-500 absolute top-1/2 -translate-y-1/2 pointer-events-none rounded"
                  style={{ left: `${(loopB / duration) * 100}%` }}
                />
              )}
            </div>

            <span className="text-xs font-mono text-neutral-400 min-w-[40px] text-right">
              {formatDuration(duration)}
            </span>
          </div>

          {/* Main Controls Row */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            
            {/* Left Options: Speed & Repeat */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Playback Speed dropdown */}
              <div className="flex items-center bg-neutral-900 rounded-full px-2.5 py-1 text-xs font-mono text-neutral-300">
                {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => changeRate(rate)}
                    className={`px-1.5 py-0.5 rounded font-semibold transition-colors ${
                      playbackRate === rate ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>

              {/* Repeat Mode */}
              <button
                onClick={() => {
                  const nextMode: PlaybackRepeatMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
                  setRepeatMode(nextMode);
                }}
                className={`p-2 rounded-full transition-colors ${
                  repeatMode !== 'off' ? 'bg-white text-black font-bold' : 'bg-neutral-900 text-neutral-400 hover:text-white'
                }`}
                title={`Repeat: ${repeatMode}`}
              >
                <Repeat className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Center Controls: Prev / Rewind / Play / Forward / Next */}
            <div className="flex items-center gap-2 sm:gap-3">
              {onPlayPrev && (
                <button
                  onClick={onPlayPrev}
                  className="p-2 rounded-full hover:bg-neutral-900 text-neutral-300 transition-colors"
                  title="Previous in queue"
                >
                  <SkipBack className="w-4 h-4 fill-current" />
                </button>
              )}

              <button
                onClick={() => seek(currentTime - 10)}
                className="p-2 rounded-full hover:bg-neutral-900 text-neutral-300 transition-colors"
                title="Rewind 10s"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={togglePlay}
                className="w-12 h-12 rounded-full bg-white text-black hover:bg-neutral-200 active:scale-95 flex items-center justify-center transition-all shadow-lg"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>

              <button
                onClick={() => seek(currentTime + 10)}
                className="p-2 rounded-full hover:bg-neutral-900 text-neutral-300 transition-colors"
                title="Forward 10s"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              {onPlayNext && (
                <button
                  onClick={onPlayNext}
                  className="p-2 rounded-full hover:bg-neutral-900 text-neutral-300 transition-colors"
                  title="Next in queue"
                >
                  <SkipForward className="w-4 h-4 fill-current" />
                </button>
              )}
            </div>

            {/* Right Tools: Volume, Sleep Timer, Subtitles, Queue, Fullscreen */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={toggleMute}
                className="p-2 rounded-full hover:bg-neutral-900 text-neutral-300 transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {/* Sleep Timer button */}
              <div className="relative">
                <button
                  onClick={() => setShowSleepMenu(!showSleepMenu)}
                  className={`p-2 rounded-full transition-colors flex items-center gap-1 ${
                    sleepState.isActive 
                      ? 'bg-white text-black font-semibold ring-2 ring-white/30' 
                      : 'bg-neutral-900 text-neutral-400 hover:text-white'
                  }`}
                  title="Sleep Timer"
                >
                  <Moon className="w-3.5 h-3.5" />
                  {sleepState.isActive && (
                    <span className="text-[10px] font-mono px-1">
                      {sleepTimer.formatRemainingTime()}
                    </span>
                  )}
                </button>

                {/* Sleep Timer Popover */}
                {showSleepMenu && (
                  <div className="absolute bottom-12 right-0 w-72 bg-neutral-900 border border-neutral-800 rounded-3xl p-4 shadow-2xl z-50 text-white animate-in zoom-in-95">
                    <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
                      <div className="flex items-center gap-2">
                        <Moon className="w-4 h-4 text-neutral-300" />
                        <span className="text-xs font-bold font-mono uppercase tracking-wide">Sleep Timer</span>
                      </div>
                      <button 
                        onClick={() => setShowSleepMenu(false)}
                        className="text-xs text-neutral-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {sleepState.isActive ? (
                      <div className="space-y-3">
                        <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-center">
                          <span className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">Time Remaining</span>
                          <span className="text-2xl font-mono font-bold tracking-tight text-white">
                            {sleepTimer.formatRemainingTime()}
                          </span>
                          <p className="text-[11px] text-neutral-400 mt-1">
                            Mode: {sleepState.durationMode === 'end-of-media' ? 'End of Video' : sleepState.durationMode === 'end-of-playlist' ? 'End of Playlist' : 'Timer'}
                          </p>
                        </div>

                        <button
                          onClick={() => {
                            sleepTimer.cancelTimer();
                            setShowSleepMenu(false);
                          }}
                          className="w-full py-2 rounded-xl bg-red-950/80 text-red-400 hover:bg-red-900 border border-red-800/60 text-xs font-semibold transition-colors"
                        >
                          Turn Off Sleep Timer
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
                          {(['15m', '30m', '45m', '60m'] as SleepTimerDuration[]).map((dur) => (
                            <button
                              key={dur}
                              onClick={() => {
                                sleepTimer.startTimer(dur, 30, fadeOutVolume);
                                setShowSleepMenu(false);
                              }}
                              className="py-2 px-3 rounded-xl bg-neutral-950 hover:bg-white hover:text-black border border-neutral-800 transition-all text-center font-medium"
                            >
                              {dur === '60m' ? '1 Hour' : dur}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-1 pt-1 border-t border-neutral-800">
                          <button
                            onClick={() => {
                              sleepTimer.startTimer('end-of-media', 0, fadeOutVolume);
                              setShowSleepMenu(false);
                            }}
                            className="w-full py-2 px-3 rounded-xl bg-neutral-950 hover:bg-white hover:text-black border border-neutral-800 text-xs font-medium text-left transition-colors flex items-center justify-between"
                          >
                            <span>End of this video/track</span>
                            <Clock className="w-3.5 h-3.5 opacity-60" />
                          </button>

                          {queue.length > 0 && (
                            <button
                              onClick={() => {
                                sleepTimer.startTimer('end-of-playlist', 0, fadeOutVolume);
                                setShowSleepMenu(false);
                              }}
                              className="w-full py-2 px-3 rounded-xl bg-neutral-950 hover:bg-white hover:text-black border border-neutral-800 text-xs font-medium text-left transition-colors flex items-center justify-between"
                            >
                              <span>End of queue/playlist</span>
                              <ListMusic className="w-3.5 h-3.5 opacity-60" />
                            </button>
                          )}
                        </div>

                        {/* Custom slider */}
                        <div className="pt-2 border-t border-neutral-800">
                          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mb-1">
                            <span>Custom: {customMinutes} min</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min={1}
                              max={180}
                              value={customMinutes}
                              onChange={(e) => setCustomMinutes(parseInt(e.target.value))}
                              className="flex-1 accent-white h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                            />
                            <button
                              onClick={() => {
                                sleepTimer.startTimer('custom', customMinutes, fadeOutVolume);
                                setShowSleepMenu(false);
                              }}
                              className="px-3 py-1 bg-white text-black text-xs font-semibold rounded-lg hover:bg-neutral-200"
                            >
                              Set
                            </button>
                          </div>
                        </div>

                        {/* Fade-out checkbox */}
                        <label className="flex items-center gap-2 pt-2 border-t border-neutral-800 text-[11px] text-neutral-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={fadeOutVolume}
                            onChange={(e) => setFadeOutVolume(e.target.checked)}
                            className="rounded accent-white"
                          />
                          <span>Smooth volume fade-out before stop</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Subtitles toggle */}
              <button
                onClick={() => setShowSubtitles(!showSubtitles)}
                className={`p-2 rounded-full transition-colors ${
                  showSubtitles ? 'bg-white text-black' : 'bg-neutral-900 text-neutral-400 hover:text-white'
                }`}
                title="Toggle Subtitles / CC"
              >
                <Subtitles className="w-3.5 h-3.5" />
              </button>

              {/* Queue Drawer Toggle */}
              {queue.length > 0 && (
                <button
                  onClick={() => setShowQueue(!showQueue)}
                  className={`p-2 rounded-full transition-colors ${
                    showQueue ? 'bg-white text-black' : 'bg-neutral-900 text-neutral-400 hover:text-white'
                  }`}
                  title="Player Queue"
                >
                  <ListMusic className="w-4 h-4" />
                </button>
              )}

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-full hover:bg-neutral-900 text-neutral-300 transition-colors"
                title="Fullscreen"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Up Next Queue Drawer */}
        {showQueue && (
          <div className="p-4 bg-neutral-900 border-t border-neutral-800 max-h-48 overflow-y-auto space-y-2 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold font-mono text-neutral-300 uppercase">Up Next ({queue.length})</span>
              <button onClick={() => setShowQueue(false)} className="text-xs text-neutral-500 hover:text-white">Close</button>
            </div>
            {queue.map((item, idx) => (
              <div 
                key={item.id}
                className={`p-2 rounded-xl border flex items-center justify-between text-xs transition-all ${
                  item.id === video.id ? 'bg-neutral-800 border-neutral-700 text-white font-semibold' : 'bg-neutral-950/60 border-neutral-900 text-neutral-400'
                }`}
              >
                <span className="truncate flex-1 mr-2">{item.title}</span>
                <span className="font-mono text-[10px]">{item.durationFormatted}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
