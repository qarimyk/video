import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Pause, 
  Play, 
  RotateCcw, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Clock, 
  HardDrive,
  ListPlus,
  Sparkles
} from 'lucide-react';
import { DownloadTask, VideoFormat, VideoInfo } from '../types';
import { downloadQueue } from '../services/downloadQueue';
import { fetchVideoInfo } from '../services/downloader';

interface DownloadQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenStudio?: () => void;
}

export const DownloadQueueModal: React.FC<DownloadQueueModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'queued' | 'completed' | 'paused'>('all');
  
  // Batch URL modal
  const [showBatchInput, setShowBatchInput] = useState(false);
  const [batchUrls, setBatchUrls] = useState('');
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = downloadQueue.subscribe((updatedTasks) => {
      setTasks(updatedTasks);
    });
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const activeCount = tasks.filter(t => t.status === 'downloading' || t.status === 'saving').length;
  const queuedCount = tasks.filter(t => t.status === 'queued').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const pausedCount = tasks.filter(t => t.status === 'paused' || t.status === 'error' || t.status === 'cancelled').length;

  const filteredTasks = tasks.filter(t => {
    if (filter === 'active') return t.status === 'downloading' || t.status === 'saving';
    if (filter === 'queued') return t.status === 'queued';
    if (filter === 'completed') return t.status === 'completed';
    if (filter === 'paused') return t.status === 'paused' || t.status === 'error' || t.status === 'cancelled';
    return true;
  });

  const handleBatchSubmit = async () => {
    const urls = batchUrls
      .split('\n')
      .map(u => u.trim())
      .filter(u => u.length > 0);

    if (urls.length === 0) {
      setBatchError('Please enter at least one valid video URL.');
      return;
    }

    setIsProcessingBatch(true);
    setBatchError(null);

    let addedCount = 0;
    for (const url of urls) {
      try {
        const info = await fetchVideoInfo(url);
        if (info.formats && info.formats.length > 0) {
          const defaultFmt = info.formats.find(f => f.hasVideo && f.hasAudio) || info.formats[0];
          downloadQueue.addToQueue(info, defaultFmt);
          addedCount++;
        }
      } catch (e) {
        console.warn('Batch URL fetch failed for:', url);
      }
    }

    setIsProcessingBatch(false);
    setShowBatchInput(false);
    setBatchUrls('');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-3xl max-h-[90vh] bg-white rounded-[32px] p-5 sm:p-7 shadow-2xl border border-neutral-200/90 flex flex-col text-neutral-900 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-neutral-950 uppercase font-mono">
                DOWNLOAD MANAGER
              </h2>
              <p className="text-xs text-neutral-500 font-normal">
                {activeCount} active · {queuedCount} queued · {completedCount} finished
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBatchInput(true)}
              className="px-3.5 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Batch import links"
            >
              <ListPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Batch Import</span>
            </button>

            {completedCount > 0 && (
              <button
                onClick={() => downloadQueue.clearCompleted()}
                className="px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-xs font-medium transition-colors"
                title="Clear completed tasks"
              >
                Clear Done
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 py-3 border-b border-neutral-100 overflow-x-auto flex-shrink-0">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              filter === 'all' ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            All ({tasks.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              filter === 'active' ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setFilter('queued')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              filter === 'queued' ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Queued ({queuedCount})
          </button>
          <button
            onClick={() => setFilter('paused')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              filter === 'paused' ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Paused/Failed ({pausedCount})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              filter === 'completed' ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Completed ({completedCount})
          </button>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center text-neutral-400">
              <HardDrive className="w-8 h-8 mx-auto mb-2 opacity-40 stroke-[1.5]" />
              <p className="text-sm font-medium">No download tasks in this view</p>
              <p className="text-xs text-neutral-400 mt-1">Paste a video link or use Batch Import to add downloads.</p>
            </div>
          ) : (
            filteredTasks.map((task, idx) => (
              <div 
                key={task.id}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                  task.status === 'downloading' || task.status === 'saving'
                    ? 'bg-neutral-50/90 border-neutral-300 shadow-xs'
                    : task.status === 'completed'
                    ? 'bg-white border-neutral-200/80 opacity-80'
                    : task.status === 'error'
                    ? 'bg-red-50/40 border-red-200'
                    : 'bg-white border-neutral-200/90'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Thumbnail */}
                    <div className="w-12 h-12 rounded-xl bg-neutral-100 overflow-hidden flex-shrink-0 border border-neutral-200/60">
                      <img 
                        src={task.videoInfo.thumbnail || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=200&q=80'} 
                        alt={task.videoInfo.title}
                        className="w-full h-full object-cover grayscale"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs sm:text-sm font-semibold text-neutral-900 truncate">
                        {task.videoInfo.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-neutral-500 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded bg-neutral-200/70 text-neutral-800 font-semibold">
                          {task.format.qualityLabel || task.format.quality}
                        </span>
                        <span>.{task.format.container || 'mp4'}</span>
                        <span>·</span>
                        <span>{task.eta}</span>
                        {task.speed > 0 && (
                          <>
                            <span>·</span>
                            <span className="font-semibold text-neutral-800">{task.speedFormatted}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {task.status === 'downloading' && (
                      <button
                        onClick={() => downloadQueue.pauseTask(task.id)}
                        className="p-2 rounded-full hover:bg-neutral-200 text-neutral-700 transition-colors"
                        title="Pause"
                      >
                        <Pause className="w-4 h-4" />
                      </button>
                    )}

                    {(task.status === 'paused' || task.status === 'cancelled') && (
                      <button
                        onClick={() => downloadQueue.resumeTask(task.id)}
                        className="p-2 rounded-full bg-black text-white hover:bg-neutral-800 transition-colors"
                        title="Resume"
                      >
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      </button>
                    )}

                    {task.status === 'error' && (
                      <button
                        onClick={() => downloadQueue.retryTask(task.id)}
                        className="p-2 rounded-full bg-neutral-900 text-white hover:bg-black transition-colors"
                        title="Retry"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {task.status === 'queued' && idx > 0 && (
                      <button
                        onClick={() => downloadQueue.prioritizeTask(task.id)}
                        className="p-2 rounded-full hover:bg-neutral-200 text-neutral-600 transition-colors"
                        title="Move to top of queue"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => downloadQueue.removeTask(task.id)}
                      className="p-2 rounded-full hover:bg-red-50 text-neutral-400 hover:text-red-600 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                {(task.status === 'downloading' || task.status === 'saving' || task.status === 'queued' || task.status === 'paused') && (
                  <div className="w-full h-1.5 bg-neutral-200/80 rounded-full overflow-hidden mt-2">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        task.status === 'paused' ? 'bg-neutral-400' : 'bg-black'
                      }`}
                      style={{ width: `${Math.max(3, task.progress)}%` }}
                    />
                  </div>
                )}

                {task.status === 'error' && task.error && (
                  <p className="text-[11px] text-red-600 font-mono mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{task.error}</span>
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Batch URL Import Sub-Modal */}
        {showBatchInput && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-neutral-200 text-neutral-900 animate-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-4">
                <div className="flex items-center gap-2">
                  <ListPlus className="w-5 h-5 text-black" />
                  <h3 className="text-base font-bold uppercase font-mono">Batch URL Importer</h3>
                </div>
                <button 
                  onClick={() => setShowBatchInput(false)}
                  className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-xs text-neutral-500 mb-3">
                Paste multiple YouTube or video links (one URL per line). The manager will automatically parse and queue each download.
              </p>

              <textarea
                value={batchUrls}
                onChange={(e) => setBatchUrls(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=...&#10;https://commondatastorage.googleapis.com/...&#10;https://www.youtube.com/watch?v=..."
                rows={6}
                className="w-full p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-xs font-mono text-neutral-900 focus:outline-none focus:border-black resize-none"
              />

              {batchError && (
                <p className="text-xs text-red-600 font-semibold mt-2">{batchError}</p>
              )}

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowBatchInput(false)}
                  className="px-4 py-2 rounded-full text-xs font-medium text-neutral-600 hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBatchSubmit}
                  disabled={isProcessingBatch || !batchUrls.trim()}
                  className="px-5 py-2 rounded-full bg-black text-white text-xs font-semibold hover:bg-neutral-900 disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {isProcessingBatch ? 'Parsing Links...' : 'Queue All URLs'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
