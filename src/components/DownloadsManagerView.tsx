import React, { useState, useEffect } from 'react';
import { 
  DownloadCloud, 
  Play, 
  Pause, 
  RotateCcw, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  HardDrive, 
  Sparkles, 
  ArrowDown, 
  Check, 
  Scissors, 
  FileDown,
  Layers,
  MoreVertical,
  XCircle
} from 'lucide-react';
import { DownloadTask, DownloadedVideo } from '../types';
import { downloadQueue } from '../services/downloadQueue';
import { formatBytes, formatDuration } from '../services/storage';

interface DownloadsManagerViewProps {
  onPlayVideo: (video: DownloadedVideo) => void;
  onOpenStudio: (videoId: string) => void;
  onNavigateToDownloader: () => void;
  onNavigateToLibrary: () => void;
}

export const DownloadsManagerView: React.FC<DownloadsManagerViewProps> = ({
  onPlayVideo,
  onOpenStudio,
  onNavigateToDownloader,
  onNavigateToLibrary,
}) => {
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'failed'>('all');

  useEffect(() => {
    const unsub = downloadQueue.subscribe((updatedTasks) => {
      setTasks([...updatedTasks]);
    });
    return () => unsub();
  }, []);

  const activeTasks = tasks.filter((t) => t.status === 'downloading' || t.status === 'saving' || t.status === 'queued');
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const failedTasks = tasks.filter((t) => t.status === 'error' || t.status === 'cancelled');

  const displayedTasks = tasks.filter((t) => {
    if (filter === 'active') return t.status === 'downloading' || t.status === 'saving' || t.status === 'queued';
    if (filter === 'completed') return t.status === 'completed';
    if (filter === 'failed') return t.status === 'error' || t.status === 'cancelled';
    return true;
  });

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 space-y-6 pb-24 animate-in fade-in">
      
      {/* Header Deck */}
      <div className="bg-white rounded-[28px] p-5 sm:p-6 border border-neutral-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-950 uppercase font-mono">
              DOWNLOADS MANAGER
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-black text-white text-xs font-mono font-bold">
              {tasks.length} TASKS
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Multi-threaded queue · Pause/Resume · Live transfer speeds · Auto retry
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeTasks.length > 0 && (
            <button
              onClick={() => downloadQueue.pauseAll()}
              className="px-3.5 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-neutral-200"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause All</span>
            </button>
          )}

          {tasks.some((t) => t.status === 'paused') && (
            <button
              onClick={() => downloadQueue.resumeAll()}
              className="px-3.5 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-neutral-200"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Resume All</span>
            </button>
          )}

          {completedTasks.length > 0 && (
            <button
              onClick={() => downloadQueue.clearCompleted()}
              className="px-3.5 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-neutral-200"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Finished</span>
            </button>
          )}

          <button
            onClick={onNavigateToDownloader}
            className="px-4 py-2 rounded-full bg-black text-white hover:bg-neutral-800 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
          >
            <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Download</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'All Tasks', count: tasks.length },
          { id: 'active', label: 'Active / Queued', count: activeTasks.length },
          { id: 'completed', label: 'Finished', count: completedTasks.length },
          { id: 'failed', label: 'Paused & Errors', count: failedTasks.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
              filter === tab.id
                ? 'bg-black text-white shadow-xs'
                : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
              filter === tab.id ? 'bg-neutral-800 text-white' : 'bg-neutral-100 text-neutral-600'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {displayedTasks.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-neutral-200 p-8 shadow-xs">
            <DownloadCloud className="w-12 h-12 mx-auto text-neutral-300 mb-3 stroke-[1.5]" />
            <h3 className="text-base font-bold text-neutral-900">No download tasks</h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
              Paste a URL in the Downloader tab to initiate media processing and offline caching.
            </p>
            <button
              onClick={onNavigateToDownloader}
              className="mt-4 px-4 py-2 rounded-full bg-black text-white text-xs font-semibold hover:bg-neutral-800 transition-all inline-flex items-center gap-1.5"
            >
              <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Go to Downloader</span>
            </button>
          </div>
        ) : (
          displayedTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white rounded-3xl p-4 sm:p-5 border border-neutral-200 hover:border-neutral-300 transition-all shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {/* Thumbnail or status icon */}
                  <div className="w-16 h-16 rounded-2xl bg-neutral-100 overflow-hidden flex-shrink-0 relative border border-neutral-200">
                    {task.videoInfo?.thumbnail ? (
                      <img
                        src={task.videoInfo.thumbnail}
                        alt={task.videoInfo.title}
                        className="w-full h-full object-cover grayscale"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-400">
                        <DownloadCloud className="w-6 h-6" />
                      </div>
                    )}
                    <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/80 text-white text-[9px] font-mono uppercase">
                      .{task.format.container || 'mp4'}
                    </span>
                  </div>

                  {/* Title & Metadata */}
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-neutral-950 truncate">
                      {task.videoInfo?.title || 'Downloading media...'}
                    </h4>
                    <p className="text-xs text-neutral-500 truncate mt-0.5">
                      {task.videoInfo?.author || 'Web Stream'} · {task.format.qualityLabel || task.format.quality}
                    </p>

                    <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-neutral-400">
                      <span>{task.speedFormatted || '0 KB/s'}</span>
                      <span>·</span>
                      <span>{formatBytes(task.downloadedBytes)} / {formatBytes(task.totalBytes)}</span>
                      {task.eta && (
                        <>
                          <span>·</span>
                          <span>ETA: {task.eta}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full ${
                    task.status === 'completed' 
                      ? 'bg-green-100 text-green-800' 
                      : task.status === 'downloading' || task.status === 'saving'
                      ? 'bg-neutral-900 text-white animate-pulse'
                      : task.status === 'paused'
                      ? 'bg-amber-100 text-amber-800'
                      : task.status === 'error'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-neutral-100 text-neutral-700'
                  }`}>
                    {task.status}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      task.status === 'completed' ? 'bg-green-600' : task.status === 'error' ? 'bg-red-600' : 'bg-black'
                    }`}
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500">
                  <span>{task.progress}%</span>
                  {task.status === 'error' && (
                    <span className="text-red-600 truncate max-w-xs">{task.error || 'Download error'}</span>
                  )}
                </div>
              </div>

              {/* Task Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                <div className="text-[11px] text-neutral-400 font-mono">
                  Started: {new Date(task.addedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>

                <div className="flex items-center gap-2">
                  {task.status === 'downloading' && (
                    <button
                      onClick={() => downloadQueue.pauseTask(task.id)}
                      className="px-3 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <Pause className="w-3 h-3" />
                      <span>Pause</span>
                    </button>
                  )}

                  {task.status === 'paused' && (
                    <button
                      onClick={() => downloadQueue.resumeTask(task.id)}
                      className="px-3 py-1 rounded-full bg-black text-white hover:bg-neutral-800 text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Resume</span>
                    </button>
                  )}

                  {task.status === 'error' && (
                    <button
                      onClick={() => downloadQueue.retryTask(task.id)}
                      className="px-3 py-1 rounded-full bg-black text-white hover:bg-neutral-800 text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Retry</span>
                    </button>
                  )}

                  {task.status === 'completed' && (
                    <button
                      onClick={() => onOpenStudio(task.videoInfo.id)}
                      className="px-3 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <Scissors className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  )}

                  <button
                    onClick={() => downloadQueue.cancelTask(task.id)}
                    className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-red-600 transition-colors"
                    title="Cancel or Remove task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
