import React from 'react';
import { 
  Play, 
  Download, 
  Star, 
  Edit3, 
  Trash2, 
  X, 
  Scissors,
  ListPlus,
  Music,
  FolderInput,
  FolderLock,
  RefreshCw
} from 'lucide-react';
import { DownloadedVideo } from '../types';

interface CardMenuModalProps {
  video: DownloadedVideo;
  isOpen: boolean;
  onClose: () => void;
  onPlay: (video: DownloadedVideo) => void;
  onExport: (video: DownloadedVideo) => void;
  onToggleFavorite: (id: string) => void;
  onEdit: (video: DownloadedVideo) => void;
  onDelete: (id: string) => void;
  onOpenStudio?: (videoId: string) => void;
  onAddToPlaylist?: (video: DownloadedVideo) => void;
  onMoveFolder?: (video: DownloadedVideo) => void;
  onVault?: (video: DownloadedVideo) => void;
  onConvert?: (video: DownloadedVideo) => void;
}

export const CardMenuModal: React.FC<CardMenuModalProps> = ({
  video,
  isOpen,
  onClose,
  onPlay,
  onExport,
  onToggleFavorite,
  onEdit,
  onDelete,
  onOpenStudio,
  onAddToPlaylist,
  onMoveFolder,
  onVault,
  onConvert,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div 
        className="w-full max-w-md bg-white rounded-[28px] p-6 shadow-2xl border border-neutral-200/90 text-neutral-900 overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 overflow-hidden flex-shrink-0 border border-neutral-200/60">
              <img 
                src={video.thumbnailUrl || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80'} 
                alt={video.title}
                className="w-full h-full object-cover grayscale"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-neutral-900 truncate">{video.title}</h4>
              <p className="text-xs text-neutral-500 flex items-center gap-2 mt-0.5">
                <span>{video.quality || '1080p'}</span>
                <span>·</span>
                <span>{video.fileSizeFormatted}</span>
                <span>·</span>
                <span>{video.durationFormatted}</span>
                {video.folder && (
                  <>
                    <span>·</span>
                    <span className="font-mono text-neutral-700 font-semibold">{video.folder}</span>
                  </>
                )}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action List */}
        <div className="py-3 space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
          <button
            onClick={() => {
              onClose();
              onPlay(video);
            }}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl hover:bg-neutral-100 text-neutral-900 text-sm font-medium transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center">
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            </div>
            <div>
              <div className="font-semibold">Play Media</div>
              <div className="text-xs text-neutral-500">Offline playback without network</div>
            </div>
          </button>

          {/* Convert Media */}
          {onConvert && (
            <button
              onClick={() => {
                onClose();
                onConvert(video);
              }}
              className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl hover:bg-neutral-100 text-neutral-900 text-sm font-medium transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-800 flex items-center justify-center border border-neutral-200">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold">Convert Format / Quality</div>
                <div className="text-xs text-neutral-500">Transcode to MP4, MKV, MOV, MP3, WAV, 4K</div>
              </div>
            </button>
          )}

          {/* Open in Video Studio */}
          {onOpenStudio && (
            <button
              onClick={() => {
                onClose();
                onOpenStudio(video.id);
              }}
              className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl hover:bg-neutral-100 text-neutral-900 text-sm font-medium transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-800 flex items-center justify-center border border-neutral-200">
                <Scissors className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold">Open in Video Studio</div>
                <div className="text-xs text-neutral-500">Trim, compress, extract audio, or transform</div>
              </div>
            </button>
          )}

          {/* Move to Folder */}
          {onMoveFolder && (
            <button
              onClick={() => {
                onClose();
                onMoveFolder(video);
              }}
              className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl hover:bg-neutral-100 text-neutral-900 text-sm font-medium transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-800 flex items-center justify-center border border-neutral-200">
                <FolderInput className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold">Move to Folder</div>
                <div className="text-xs text-neutral-500">Organize in Downloads, Converted, or custom folder</div>
              </div>
            </button>
          )}

          {/* Add to Playlist */}
          {onAddToPlaylist && (
            <button
              onClick={() => {
                onClose();
                onAddToPlaylist(video);
              }}
              className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl hover:bg-neutral-100 text-neutral-900 text-sm font-medium transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-800 flex items-center justify-center border border-neutral-200">
                <ListPlus className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold">Add to Playlist</div>
                <div className="text-xs text-neutral-500">Save to a custom or smart playlist</div>
              </div>
            </button>
          )}

          {/* Add to Vault */}
          {onVault && (
            <button
              onClick={() => {
                onClose();
                onVault(video);
              }}
              className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl hover:bg-neutral-100 text-neutral-900 text-sm font-medium transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center">
                <FolderLock className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold">Move to Secure Vault</div>
                <div className="text-xs text-neutral-500">Encrypt with AES-256 and hide from library</div>
              </div>
            </button>
          )}

          <button
            onClick={() => {
              onClose();
              onExport(video);
            }}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl hover:bg-neutral-100 text-neutral-900 text-sm font-medium transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-800 flex items-center justify-center border border-neutral-200">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold">Save to Device</div>
              <div className="text-xs text-neutral-500">Export file as .{video.format || 'mp4'} to disk</div>
            </div>
          </button>

          <button
            onClick={() => {
              onToggleFavorite(video.id);
              onClose();
            }}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl hover:bg-neutral-100 text-neutral-900 text-sm font-medium transition-colors text-left"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border border-neutral-200 ${
              video.isFavorite ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-700'
            }`}>
              <Star className={`w-4 h-4 ${video.isFavorite ? 'fill-white' : ''}`} />
            </div>
            <div>
              <div className="font-semibold">{video.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}</div>
              <div className="text-xs text-neutral-500">Quick access in Favorites tab</div>
            </div>
          </button>

          <button
            onClick={() => {
              onClose();
              onEdit(video);
            }}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl hover:bg-neutral-100 text-neutral-900 text-sm font-medium transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-800 flex items-center justify-center border border-neutral-200">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold">Edit Title & Tags</div>
              <div className="text-xs text-neutral-500">Customize labels and metadata</div>
            </div>
          </button>

          <div className="pt-2 border-t border-neutral-100">
            <button
              onClick={() => {
                onClose();
                onDelete(video.id);
              }}
              className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl hover:bg-red-50 text-red-600 text-sm font-medium transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold">Delete from Storage</div>
                <div className="text-xs text-red-400">Free up {video.fileSizeFormatted} on device</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

