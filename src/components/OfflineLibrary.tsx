import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Play, 
  Trash2, 
  Download, 
  Star, 
  Film, 
  Music, 
  Clock, 
  HardDrive, 
  Grid, 
  List, 
  Edit3, 
  Check, 
  X, 
  Tag, 
  Share2, 
  MoreVertical,
  SlidersHorizontal,
  Plus,
  Scissors,
  ListMusic,
  ListPlus,
  Flame,
  Sparkles
} from 'lucide-react';
import { DownloadedVideo, Playlist } from '../types';
import { exportVideoToFile } from '../services/storage';
import { CardMenuModal } from './CardMenuModal';

interface OfflineLibraryProps {
  videos: DownloadedVideo[];
  playlists: Playlist[];
  onPlayVideo: (video: DownloadedVideo) => void;
  onDeleteVideo: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onUpdateMetadata: (id: string, updates: Partial<DownloadedVideo>) => void;
  onNavigateToDownloader: () => void;
  onOpenImport: () => void;
  onOpenStudio?: (videoId: string) => void;
  onOpenPlaylistModal?: (targetVideo?: DownloadedVideo) => void;
  onPlayPlaylist?: (playlist: Playlist) => void;
}

export const OfflineLibrary: React.FC<OfflineLibraryProps> = ({
  videos,
  playlists,
  onPlayVideo,
  onDeleteVideo,
  onToggleFavorite,
  onUpdateMetadata,
  onNavigateToDownloader,
  onOpenImport,
  onOpenStudio,
  onOpenPlaylistModal,
  onPlayPlaylist,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'video' | 'audio' | 'favorites' | 'most-played' | 'playlists'>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'size-desc' | 'size-asc' | 'title' | 'plays'>('date-desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Card action menu
  const [menuTargetVideo, setMenuTargetVideo] = useState<DownloadedVideo | null>(null);

  // Edit metadata modal
  const [editingVideo, setEditingVideo] = useState<DownloadedVideo | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTagInput, setEditTagInput] = useState('');

  // Selected videos for batch actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter and sort videos
  const filteredVideos = useMemo(() => {
    return videos
      .filter((v) => {
        if (filterType === 'video' && v.type !== 'video') return false;
        if (filterType === 'audio' && v.type !== 'audio') return false;
        if (filterType === 'favorites' && !v.isFavorite) return false;
        if (filterType === 'most-played' && (!v.playCount || v.playCount === 0)) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = v.title.toLowerCase().includes(q);
          const matchAuthor = v.author?.toLowerCase().includes(q);
          const matchTag = v.tags?.some((t) => t.toLowerCase().includes(q));
          if (!matchTitle && !matchAuthor && !matchTag) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'plays') return (b.playCount || 0) - (a.playCount || 0);
        if (sortBy === 'date-desc') return b.downloadedAt - a.downloadedAt;
        if (sortBy === 'date-asc') return a.downloadedAt - b.downloadedAt;
        if (sortBy === 'size-desc') return b.fileSize - a.fileSize;
        if (sortBy === 'size-asc') return a.fileSize - b.fileSize;
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        return 0;
      });
  }, [videos, filterType, searchQuery, sortBy]);

  const handleStartEdit = (video: DownloadedVideo) => {
    setEditingVideo(video);
    setEditTitle(video.title);
    setEditTagInput(video.tags ? video.tags.join(', ') : '');
  };

  const handleSaveEdit = () => {
    if (editingVideo && editTitle.trim()) {
      const tags = editTagInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      onUpdateMetadata(editingVideo.id, { title: editTitle.trim(), tags });
      setEditingVideo(null);
    }
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredVideos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredVideos.map((v) => v.id)));
    }
  };

  const handleBatchDelete = () => {
    if (confirm(`Delete ${selectedIds.size} saved items from offline storage?`)) {
      selectedIds.forEach((id) => onDeleteVideo(id));
      setSelectedIds(new Set());
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-32">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 uppercase font-mono">
            SMART LIBRARY
          </h1>
          <p className="text-sm text-neutral-500 font-normal mt-1">
            Offline media storage · {videos.length} items · {playlists.length} playlists
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          {onOpenPlaylistModal && (
            <button
              onClick={() => onOpenPlaylistModal()}
              className="px-4 py-2 rounded-full bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-200/90 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all active:scale-95"
            >
              <ListMusic className="w-3.5 h-3.5" />
              <span>Playlists</span>
            </button>
          )}

          <button
            onClick={onOpenImport}
            className="px-4 py-2 rounded-full bg-black hover:bg-neutral-900 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Import Media</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <div className="w-full bg-white rounded-full p-2 pl-4 border border-neutral-200/90 shadow-2xs flex items-center gap-2.5 focus-within:border-black focus-within:ring-2 focus-within:ring-black/5">
          <Search className="w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, author, or tag..."
            className="w-full bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 rounded-full text-neutral-400 hover:text-neutral-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter & View Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {(
            [
              { id: 'all', label: 'All Media' },
              { id: 'video', label: 'Videos' },
              { id: 'audio', label: 'Audio' },
              { id: 'favorites', label: 'Favorites' },
              { id: 'most-played', label: 'Most Played' },
              { id: 'playlists', label: 'Playlists' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setFilterType(item.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                filterType === item.id
                  ? 'bg-black text-white shadow-2xs'
                  : 'bg-white hover:bg-neutral-100 text-neutral-600 border border-neutral-200/80'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Sort & Layout toggle (only when not viewing playlists tab) */}
        {filterType !== 'playlists' && (
          <div className="flex items-center gap-2 ml-auto">
            {/* Sort selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-neutral-200/90 text-neutral-800 text-xs rounded-full px-3 py-1.5 focus:outline-none shadow-2xs font-medium cursor-pointer"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="plays">Most Played</option>
              <option value="size-desc">Largest Size</option>
              <option value="size-asc">Smallest Size</option>
              <option value="title">Title A-Z</option>
            </select>

            {/* View toggle */}
            <div className="flex items-center bg-white border border-neutral-200/90 rounded-full p-0.5 shadow-2xs">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-full transition-colors ${viewMode === 'grid' ? 'bg-black text-white' : 'text-neutral-400 hover:text-neutral-800'}`}
                title="Grid View"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-full transition-colors ${viewMode === 'list' ? 'bg-black text-white' : 'text-neutral-400 hover:text-neutral-800'}`}
                title="List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Batch selection toolbar */}
      {selectedIds.size > 0 && (
        <div className="mb-6 p-3 rounded-2xl bg-black text-white flex items-center justify-between shadow-xl animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="text-xs font-semibold text-neutral-300 hover:text-white"
            >
              {selectedIds.size === filteredVideos.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-xs font-mono text-neutral-400">({selectedIds.size} selected)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchDelete}
              className="px-3 py-1 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected</span>
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-1 rounded-full text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Playlists View Tab */}
      {filterType === 'playlists' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {playlists.map((pl) => (
            <div
              key={pl.id}
              onClick={() => onOpenPlaylistModal && onOpenPlaylistModal()}
              className="bg-white rounded-[28px] p-5 border border-neutral-200/90 shadow-2xs hover:border-neutral-300 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-black flex items-center justify-center mb-3 group-hover:bg-black group-hover:text-white transition-colors">
                  <ListMusic className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-900 group-hover:text-black">{pl.name}</h3>
                <p className="text-xs text-neutral-500 line-clamp-2 mt-1">{pl.description || `${pl.videoIds.length} media tracks`}</p>
              </div>

              <div className="pt-4 mt-4 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-xs font-mono text-neutral-400">{pl.videoIds.length} items</span>
                {onPlayPlaylist && pl.videoIds.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayPlaylist(pl);
                    }}
                    className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center hover:bg-neutral-800"
                  >
                    <Play className="w-3 h-3 fill-current ml-0.5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Create New Playlist Card */}
          {onOpenPlaylistModal && (
            <div
              onClick={() => onOpenPlaylistModal()}
              className="bg-neutral-50 rounded-[28px] p-6 border-2 border-dashed border-neutral-200 hover:border-black transition-all cursor-pointer flex flex-col items-center justify-center text-center min-h-[160px]"
            >
              <div className="w-10 h-10 rounded-full bg-white border border-neutral-200 flex items-center justify-center mb-2 text-neutral-700">
                <Plus className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-neutral-900">Create New Playlist</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">Curate songs and video clips</p>
            </div>
          )}
        </div>
      ) : (
        /* Video & Audio Items Content */
        filteredVideos.length === 0 ? (
          <div className="p-12 text-center bg-white/70 rounded-[32px] border border-neutral-200/80">
            <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center mb-3">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-neutral-900 mb-1">No media found</h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto mb-4">
              {searchQuery
                ? `No saved offline items matched "${searchQuery}".`
                : 'Your offline library is currently empty.'}
            </p>
            <button
              onClick={onNavigateToDownloader}
              className="px-5 py-2 rounded-full bg-black text-white text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-xs"
            >
              Download Media
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* 3-Column Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredVideos.map((video) => {
              const isSelected = selectedIds.has(video.id);
              const isAudio = video.type === 'audio' || video.format === 'mp3' || video.format === 'wav';
              return (
                <div
                  key={video.id}
                  className={`bg-white/90 backdrop-blur-xs rounded-[28px] p-4 border shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between group transition-all ${
                    isSelected ? 'border-black ring-2 ring-black/10' : 'border-neutral-200/90 hover:border-neutral-300'
                  }`}
                >
                  <div>
                    {/* Thumbnail */}
                    <div 
                      onClick={() => onPlayVideo(video)}
                      className="w-full aspect-[4/3] rounded-[20px] bg-neutral-100 overflow-hidden relative cursor-pointer border border-neutral-200/60 flex items-center justify-center"
                    >
                      {isAudio ? (
                        <div className="w-full h-full bg-neutral-950 flex flex-col items-center justify-center text-white">
                          <Music className="w-10 h-10 text-neutral-400 mb-1" />
                          <span className="text-[10px] font-mono text-neutral-400">AUDIO TRACK</span>
                        </div>
                      ) : (
                        <img 
                          src={video.thumbnailUrl || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&q=80'} 
                          alt={video.title}
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-300"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      
                      {/* Duration Badge */}
                      <span className="bg-black/90 text-white text-[11px] font-mono font-medium px-2.5 py-1 rounded-full absolute bottom-2.5 left-2.5 shadow-sm">
                        {video.durationFormatted}
                      </span>

                      {/* Star favorite indicator */}
                      {video.isFavorite && (
                        <span className="w-6 h-6 rounded-full bg-black/80 text-white flex items-center justify-center absolute top-2.5 right-2.5 shadow-sm">
                          <Star className="w-3 h-3 fill-white" />
                        </span>
                      )}

                      {/* Play count badge */}
                      {video.playCount && video.playCount > 0 && (
                        <span className="bg-white/90 text-black text-[10px] font-mono font-bold px-2 py-0.5 rounded-full absolute top-2.5 left-2.5 shadow-sm flex items-center gap-1">
                          <Flame className="w-2.5 h-2.5 fill-current" />
                          <span>{video.playCount}</span>
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 
                      onClick={() => onPlayVideo(video)}
                      className="text-base font-semibold text-neutral-900 line-clamp-2 mt-3.5 mb-1 tracking-tight leading-snug cursor-pointer hover:text-black"
                    >
                      {video.title}
                    </h3>

                    {/* Metadata */}
                    <p className="text-xs text-neutral-400 font-mono mb-4">
                      {video.quality || '1080p'} &nbsp;·&nbsp; {video.format.toUpperCase()} &nbsp;·&nbsp; {video.fileSizeFormatted}
                    </p>
                  </div>

                  {/* Bottom Row */}
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onPlayVideo(video)}
                        className="w-10 h-10 rounded-full bg-neutral-100 hover:bg-black hover:text-white text-neutral-900 border border-neutral-200/80 flex items-center justify-center transition-all shadow-2xs active:scale-95"
                        title="Play media"
                      >
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      </button>

                      {onOpenStudio && (
                        <button
                          onClick={() => onOpenStudio(video.id)}
                          className="w-10 h-10 rounded-full bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200/80 flex items-center justify-center transition-colors"
                          title="Open in Studio"
                        >
                          <Scissors className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleSelect(video.id)}
                        className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs transition-colors ${
                          isSelected ? 'bg-black text-white border-black' : 'border-neutral-200 text-neutral-400 hover:text-neutral-700'
                        }`}
                        title="Select"
                      >
                        <Check className="w-3.5 h-3.5" />
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
                </div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="space-y-3">
            {filteredVideos.map((video) => {
              const isAudio = video.type === 'audio' || video.format === 'mp3' || video.format === 'wav';
              return (
                <div 
                  key={video.id}
                  className="w-full bg-white/90 backdrop-blur-xs rounded-[24px] p-3 border border-neutral-200/90 shadow-2xs flex items-center justify-between gap-3 group transition-all"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div 
                      onClick={() => onPlayVideo(video)}
                      className="w-20 h-20 rounded-2xl bg-neutral-100 overflow-hidden relative flex-shrink-0 cursor-pointer border border-neutral-200/60 flex items-center justify-center"
                    >
                      {isAudio ? (
                        <div className="w-full h-full bg-neutral-950 flex items-center justify-center text-neutral-400">
                          <Music className="w-6 h-6" />
                        </div>
                      ) : (
                        <img 
                          src={video.thumbnailUrl || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&q=80'} 
                          alt={video.title}
                          className="w-full h-full object-cover grayscale group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <span className="bg-black/90 text-white text-[10px] font-mono font-medium px-2 py-0.5 rounded-full absolute bottom-1.5 left-1.5">
                        {video.durationFormatted}
                      </span>
                    </div>

                    <div className="min-w-0 pr-1">
                      <h3 
                        onClick={() => onPlayVideo(video)}
                        className="text-sm font-semibold text-neutral-900 line-clamp-2 cursor-pointer hover:text-black"
                      >
                        {video.title}
                      </h3>
                      <p className="text-xs text-neutral-400 font-mono mt-1 flex items-center gap-1.5">
                        <span>{video.quality || '1080p'}</span>
                        <span>·</span>
                        <span>{video.format.toUpperCase()}</span>
                        <span>·</span>
                        <span>{video.fileSizeFormatted}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => onPlayVideo(video)}
                      className="w-10 h-10 rounded-full bg-neutral-100 hover:bg-black hover:text-white text-neutral-900 border border-neutral-200/80 flex items-center justify-center transition-all shadow-2xs"
                      title="Play media"
                    >
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </button>

                    <button
                      onClick={() => setMenuTargetVideo(video)}
                      className="w-8 h-8 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 flex items-center justify-center transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Card Menu Modal */}
      {menuTargetVideo && (
        <CardMenuModal
          video={menuTargetVideo}
          isOpen={!!menuTargetVideo}
          onClose={() => setMenuTargetVideo(null)}
          onPlay={onPlayVideo}
          onExport={exportVideoToFile}
          onToggleFavorite={onToggleFavorite}
          onEdit={handleStartEdit}
          onDelete={onDeleteVideo}
          onOpenStudio={onOpenStudio}
          onAddToPlaylist={(vid) => onOpenPlaylistModal && onOpenPlaylistModal(vid)}
        />
      )}

      {/* Edit Metadata Modal */}
      {editingVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-[32px] p-6 shadow-2xl border border-neutral-200 text-neutral-900 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-neutral-900 mb-4 font-mono uppercase">Edit Media Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={editTagInput}
                  onChange={(e) => setEditTagInput(e.target.value)}
                  placeholder="Design, Podcast, Tutorial..."
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:border-black"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setEditingVideo(null)}
                className="px-4 py-2 rounded-full text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-5 py-2 rounded-full bg-black text-white text-xs font-semibold hover:bg-neutral-800"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
