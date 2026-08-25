import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  ListMusic, 
  Trash2, 
  Check, 
  FolderPlus, 
  Play,
  Film
} from 'lucide-react';
import { Playlist, DownloadedVideo } from '../types';
import { createPlaylist, addVideoToPlaylist, removeVideoFromPlaylist, deletePlaylist } from '../services/storage';

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlists: Playlist[];
  allVideos: DownloadedVideo[];
  targetVideoForAdd?: DownloadedVideo | null;
  onPlayPlaylist?: (playlist: Playlist) => void;
  onPlayVideo?: (video: DownloadedVideo) => void;
  onRefreshPlaylists: () => void;
}

export const PlaylistModal: React.FC<PlaylistModalProps> = ({
  isOpen,
  onClose,
  playlists,
  allVideos,
  targetVideoForAdd,
  onPlayPlaylist,
  onPlayVideo,
  onRefreshPlaylists,
}) => {
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!newPlaylistName.trim()) return;
    const initialIds = targetVideoForAdd ? [targetVideoForAdd.id] : [];
    await createPlaylist(newPlaylistName.trim(), newPlaylistDesc.trim(), initialIds);
    setNewPlaylistName('');
    setNewPlaylistDesc('');
    setShowCreateForm(false);
    onRefreshPlaylists();
  };

  const handleToggleVideoInPlaylist = async (playlist: Playlist) => {
    if (!targetVideoForAdd) return;
    const exists = playlist.videoIds.includes(targetVideoForAdd.id);
    if (exists) {
      await removeVideoFromPlaylist(playlist.id, targetVideoForAdd.id);
    } else {
      await addVideoToPlaylist(playlist.id, targetVideoForAdd.id);
    }
    onRefreshPlaylists();
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this playlist? (Videos will remain in your offline library)')) {
      await deletePlaylist(id);
      if (selectedPlaylist?.id === id) setSelectedPlaylist(null);
      onRefreshPlaylists();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl max-h-[85vh] bg-white rounded-[32px] p-6 shadow-2xl border border-neutral-200/90 flex flex-col text-neutral-900 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0">
              <ListMusic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold uppercase font-mono tracking-tight">
                {targetVideoForAdd ? 'Add to Playlist' : 'Smart Playlists'}
              </h3>
              <p className="text-xs text-neutral-500">
                {targetVideoForAdd ? `Select playlists for "${targetVideoForAdd.title.slice(0, 25)}..."` : 'Organize and curate your offline media collections'}
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

        {/* Selected Playlist Detail View */}
        {selectedPlaylist && !targetVideoForAdd ? (
          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSelectedPlaylist(null)}
                className="text-xs text-neutral-500 hover:text-black font-semibold flex items-center gap-1"
              >
                ← Back to All Playlists
              </button>
              {onPlayPlaylist && selectedPlaylist.videoIds.length > 0 && (
                <button
                  onClick={() => {
                    onPlayPlaylist(selectedPlaylist);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-full bg-black text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-neutral-800"
                >
                  <Play className="w-3 h-3 fill-current ml-0.5" />
                  <span>Play All</span>
                </button>
              )}
            </div>

            <h4 className="text-base font-bold text-neutral-900">{selectedPlaylist.name}</h4>
            <p className="text-xs text-neutral-500">{selectedPlaylist.description || 'No description'}</p>

            <div className="space-y-2 mt-3">
              {selectedPlaylist.videoIds.map((vId) => {
                const vid = allVideos.find((v) => v.id === vId);
                if (!vid) return null;
                return (
                  <div key={vid.id} className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-neutral-200 overflow-hidden flex-shrink-0">
                        <img src={vid.thumbnailUrl || ''} alt={vid.title} className="w-full h-full object-cover grayscale" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-neutral-900 truncate">{vid.title}</p>
                        <p className="text-[11px] font-mono text-neutral-400">{vid.durationFormatted}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {onPlayVideo && (
                        <button
                          onClick={() => {
                            onPlayVideo(vid);
                            onClose();
                          }}
                          className="p-1.5 rounded-full bg-white hover:bg-black hover:text-white border border-neutral-200"
                        >
                          <Play className="w-3 h-3 fill-current ml-0.5" />
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          await removeVideoFromPlaylist(selectedPlaylist.id, vid.id);
                          onRefreshPlaylists();
                        }}
                        className="p-1.5 text-neutral-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Playlists List View */
          <div className="flex-1 overflow-y-auto py-4 space-y-2.5">
            {playlists.map((pl) => {
              const isIncluded = targetVideoForAdd ? pl.videoIds.includes(targetVideoForAdd.id) : false;
              return (
                <div
                  key={pl.id}
                  onClick={() => {
                    if (targetVideoForAdd) {
                      handleToggleVideoInPlaylist(pl);
                    } else {
                      setSelectedPlaylist(pl);
                    }
                  }}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                    isIncluded
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-900'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isIncluded ? 'bg-white text-black' : 'bg-neutral-100 text-neutral-600'
                    }`}>
                      <ListMusic className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-semibold truncate">{pl.name}</h4>
                      <p className={`text-[11px] font-mono ${isIncluded ? 'text-neutral-300' : 'text-neutral-400'}`}>
                        {pl.videoIds.length} tracks
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {targetVideoForAdd ? (
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        isIncluded ? 'bg-white text-black' : 'border border-neutral-300'
                      }`}>
                        {isIncluded && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    ) : (
                      <>
                        {!pl.isSmart && (
                          <button
                            onClick={(e) => handleDelete(pl.id, e)}
                            className="p-1.5 text-neutral-400 hover:text-red-600 rounded-full hover:bg-neutral-100"
                            title="Delete playlist"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Create New Playlist Form */}
            {showCreateForm ? (
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 mt-3 space-y-3">
                <input
                  type="text"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="Playlist Name"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-neutral-200 text-xs font-semibold text-neutral-900 focus:outline-none focus:border-black"
                />
                <input
                  type="text"
                  value={newPlaylistDesc}
                  onChange={(e) => setNewPlaylistDesc(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-neutral-200 text-xs text-neutral-700 focus:outline-none focus:border-black"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium text-neutral-600 hover:bg-neutral-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!newPlaylistName.trim()}
                    className="px-4 py-1.5 rounded-full bg-black text-white text-xs font-semibold disabled:opacity-50 hover:bg-neutral-900"
                  >
                    Save Playlist
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full py-3 rounded-2xl border border-dashed border-neutral-300 hover:border-black text-neutral-600 hover:text-black text-xs font-semibold flex items-center justify-center gap-1.5 transition-all mt-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Playlist</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
