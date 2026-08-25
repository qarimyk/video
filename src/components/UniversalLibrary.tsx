import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Folder, 
  FolderPlus, 
  Video as VideoIcon, 
  Music, 
  Disc, 
  Star, 
  Clock, 
  ListMusic, 
  Grid, 
  List, 
  MoreVertical, 
  Play, 
  Plus, 
  CheckSquare, 
  Square, 
  Upload, 
  FolderInput, 
  FolderLock, 
  Trash2, 
  RefreshCw, 
  DownloadCloud, 
  Layers,
  Sparkles,
  HardDrive,
  Tag,
  Check
} from 'lucide-react';
import { DownloadedVideo, Playlist, MediaFolder, LibraryCategoryFilter, SortOption } from '../types';
import { 
  getAllDownloadedVideos, 
  getAllPlaylists, 
  getAllFolders, 
  createFolder, 
  deleteFolder, 
  saveDownloadedVideo, 
  deleteDownloadedVideo, 
  toggleFavoriteVideo,
  formatBytes,
  formatDuration,
  batchExportVideos,
  batchDeleteVideos
} from '../services/storage';

interface UniversalLibraryProps {
  onPlayVideo: (video: DownloadedVideo, playlistQueue?: DownloadedVideo[]) => void;
  onOpenCardMenu: (video: DownloadedVideo) => void;
  onOpenStudio?: (videoId: string) => void;
  onOpenConverter?: (video?: DownloadedVideo) => void;
  onOpenVault?: () => void;
  onRefreshTrigger?: number;
}

export const UniversalLibrary: React.FC<UniversalLibraryProps> = ({
  onPlayVideo,
  onOpenCardMenu,
  onOpenStudio,
  onOpenConverter,
  onOpenVault,
  onRefreshTrigger,
}) => {
  // Data state
  const [videos, setVideos] = useState<DownloadedVideo[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<LibraryCategoryFilter>('all');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Multi-selection state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Folder creation modal
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Move to folder modal
  const [showMoveFolderModal, setShowMoveFolderModal] = useState(false);
  const [moveTargetFolder, setMoveTargetFolder] = useState('Downloads');

  // Playlist creation & playback
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);

  // Import file ref
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadLibraryData();
  }, [onRefreshTrigger]);

  const loadLibraryData = async () => {
    setIsLoading(true);
    try {
      const [vList, pList, fList] = await Promise.all([
        getAllDownloadedVideos(),
        getAllPlaylists(),
        getAllFolders(),
      ]);
      setVideos(vList);
      setPlaylists(pList);
      setFolders(fList);
    } catch (e) {
      console.error('Failed to load library:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Secret Vault Trigger Detection in Search bar (#vault, #9999, *#777#*, ::vault::)
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    const secretTriggers = ['#vault', '#9999', '*#777#*', '::vault::', '#secret'];
    if (secretTriggers.includes(val.trim().toLowerCase())) {
      setSearchQuery('');
      onOpenVault?.();
    }
  };

  // Filter & Sort computation
  const filteredVideos = useMemo(() => {
    return videos
      .filter((v) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = v.title.toLowerCase().includes(q);
          const matchAuthor = (v.author || '').toLowerCase().includes(q);
          const matchFormat = (v.format || '').toLowerCase().includes(q);
          const matchTags = (v.tags || []).some((t) => t.toLowerCase().includes(q));
          if (!matchTitle && !matchAuthor && !matchFormat && !matchTags) return false;
        }

        // Folder filter
        if (selectedFolder) {
          const itemFolder = v.folder || 'Downloads';
          if (itemFolder.toLowerCase() !== selectedFolder.toLowerCase()) return false;
        }

        // Format filter
        if (selectedFormat !== 'all') {
          if (v.format.toLowerCase() !== selectedFormat.toLowerCase()) return false;
        }

        // Category filter
        if (categoryFilter === 'videos') return v.type !== 'audio';
        if (categoryFilter === 'audio') return v.type === 'audio';
        if (categoryFilter === 'music') return v.category === 'music' || v.isMusic || v.type === 'audio';
        if (categoryFilter === 'favorites') return !!v.isFavorite;
        if (categoryFilter === 'recent') {
          const oneWeekAgo = Date.now() - 7 * 86400000;
          return v.downloadedAt >= oneWeekAgo;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') return b.downloadedAt - a.downloadedAt;
        if (sortBy === 'date-asc') return a.downloadedAt - b.downloadedAt;
        if (sortBy === 'name-asc') return a.title.localeCompare(b.title);
        if (sortBy === 'name-desc') return b.title.localeCompare(a.title);
        if (sortBy === 'size-desc') return (b.fileSize || 0) - (a.fileSize || 0);
        if (sortBy === 'size-asc') return (a.fileSize || 0) - (b.fileSize || 0);
        if (sortBy === 'duration-desc') return (b.duration || 0) - (a.duration || 0);
        if (sortBy === 'duration-asc') return (a.duration || 0) - (b.duration || 0);
        if (sortBy === 'play-count') return (b.playCount || 0) - (a.playCount || 0);
        return 0;
      });
  }, [videos, searchQuery, categoryFilter, selectedFolder, selectedFormat, sortBy]);

  // Handle Multi-Select
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => 
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredVideos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredVideos.map((v) => v.id));
    }
  };

  // Batch actions
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Delete ${selectedIds.length} item(s) permanently?`)) {
      await batchDeleteVideos(selectedIds);
      setSelectedIds([]);
      setIsSelectMode(false);
      loadLibraryData();
    }
  };

  const handleBatchExport = async () => {
    if (selectedIds.length === 0) return;
    await batchExportVideos(selectedIds);
  };

  const handleBatchMoveFolder = async () => {
    if (selectedIds.length === 0) return;
    for (const id of selectedIds) {
      const v = videos.find((item) => item.id === id);
      if (v) {
        await saveDownloadedVideo({ ...v, folder: moveTargetFolder });
      }
    }
    setShowMoveFolderModal(false);
    setSelectedIds([]);
    setIsSelectMode(false);
    loadLibraryData();
  };

  const handleCreateNewFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder(newFolderName.trim());
    setNewFolderName('');
    setShowNewFolderModal(false);
    loadLibraryData();
  };

  const handleImportLocalMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isAudio = file.type.startsWith('audio') || file.name.endsWith('.mp3') || file.name.endsWith('.wav');
      const ext = file.name.split('.').pop()?.toLowerCase() || (isAudio ? 'mp3' : 'mp4');

      const newMedia: DownloadedVideo = {
        id: `imported-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sourceUrl: 'https://local.imported/media',
        title: file.name.replace(/\.[^/.]+$/, ''),
        author: 'Local Device Import',
        duration: 180,
        durationFormatted: '03:00',
        videoBlob: file,
        format: ext as any,
        quality: isAudio ? 'Audio File' : 'Original Import',
        fileSize: file.size,
        fileSizeFormatted: formatBytes(file.size),
        downloadedAt: Date.now(),
        isFavorite: false,
        folder: 'Imported',
        category: isAudio ? 'audio' : 'video',
        tags: ['Imported', ext.toUpperCase()],
        type: isAudio ? 'audio' : 'video',
      };

      await saveDownloadedVideo(newMedia);
    }

    if (importInputRef.current) importInputRef.current.value = '';
    loadLibraryData();
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 pb-20 animate-in fade-in">
      
      {/* 1. TOP HEADER & METRICS BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white rounded-[28px] p-5 sm:p-6 border border-neutral-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-950 uppercase font-mono">
              UNIVERSAL LIBRARY
            </h2>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-black text-white font-bold">
              {videos.length} ITEMS
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Offline media storage · Transcoding engine · Smart playlists · Zero-knowledge storage
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Import Media Button */}
          <input 
            type="file" 
            ref={importInputRef} 
            onChange={handleImportLocalMedia} 
            multiple 
            accept="video/*,audio/*" 
            className="hidden" 
          />
          <button
            onClick={() => importInputRef.current?.click()}
            className="px-3.5 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-neutral-200"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Media</span>
          </button>

          {/* New Folder */}
          <button
            onClick={() => setShowNewFolderModal(true)}
            className="px-3.5 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-neutral-200"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>New Folder</span>
          </button>

          {/* Converter Button */}
          {onOpenConverter && (
            <button
              onClick={() => onOpenConverter()}
              className="px-4 py-2 rounded-full bg-black text-white hover:bg-neutral-800 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Transcoder</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. SEARCH & CONTROLS DECK */}
      <div className="bg-white rounded-[28px] p-4 sm:p-5 border border-neutral-200 space-y-4 shadow-xs">
        
        {/* Search Bar with Secret Vault Trigger */}
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search all videos, audio, artist, format, tags..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-11 pr-4 py-3 bg-neutral-50 rounded-2xl border border-neutral-200 text-sm font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-black transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-neutral-400 hover:text-neutral-700"
            >
              CLEAR
            </button>
          )}
        </div>

        {/* Categories, Sort, and View Controls */}
        <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
          
          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'All Media' },
              { id: 'videos', label: 'Videos' },
              { id: 'audio', label: 'Audio' },
              { id: 'music', label: 'Music' },
              { id: 'favorites', label: 'Starred' },
              { id: 'playlists', label: 'Playlists' },
              { id: 'folders', label: 'Folders' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setCategoryFilter(cat.id as LibraryCategoryFilter);
                  setSelectedFolder(null);
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  categoryFilter === cat.id
                    ? 'bg-black text-white shadow-xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Right Tools: Select Mode, Sort, View Layout */}
          <div className="flex items-center gap-2">
            {/* Multi-Select Toggle */}
            <button
              onClick={() => {
                setIsSelectMode(!isSelectMode);
                setSelectedIds([]);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                isSelectMode ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{isSelectMode ? 'Cancel' : 'Select'}</span>
            </button>

            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-neutral-200"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sort</span>
              </button>

              {showSortDropdown && (
                <div className="absolute right-0 top-10 w-48 bg-white rounded-2xl border border-neutral-200 shadow-xl p-2 z-30 space-y-1 animate-in zoom-in-95 text-xs font-medium">
                  {[
                    { id: 'date-desc', label: 'Date: Newest First' },
                    { id: 'date-asc', label: 'Date: Oldest First' },
                    { id: 'name-asc', label: 'Name (A to Z)' },
                    { id: 'size-desc', label: 'File Size (Largest)' },
                    { id: 'duration-desc', label: 'Duration (Longest)' },
                    { id: 'play-count', label: 'Most Played' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSortBy(s.id as SortOption);
                        setShowSortDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-xl transition-colors ${
                        sortBy === s.id ? 'bg-black text-white font-semibold' : 'hover:bg-neutral-100 text-neutral-700'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Grid / List Layout Switcher */}
            <div className="flex items-center bg-neutral-100 rounded-full p-0.5 border border-neutral-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-full transition-colors ${
                  viewMode === 'grid' ? 'bg-white text-black shadow-xs' : 'text-neutral-400 hover:text-neutral-700'
                }`}
                title="Grid View"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-full transition-colors ${
                  viewMode === 'list' ? 'bg-white text-black shadow-xs' : 'text-neutral-400 hover:text-neutral-700'
                }`}
                title="List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MULTI-SELECT ACTION BAR */}
      {isSelectMode && selectedIds.length > 0 && (
        <div className="sticky top-4 z-40 bg-neutral-950 text-white rounded-2xl p-3.5 flex items-center justify-between shadow-2xl border border-neutral-800 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="text-xs font-mono underline hover:text-neutral-300"
            >
              {selectedIds.length === filteredVideos.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-xs font-bold font-mono text-neutral-400">
              {selectedIds.length} Selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Batch Convert */}
            {onOpenConverter && (
              <button
                onClick={() => {
                  const firstSelected = videos.find((v) => v.id === selectedIds[0]);
                  onOpenConverter(firstSelected);
                }}
                className="px-3 py-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Convert</span>
              </button>
            )}

            {/* Move to folder */}
            <button
              onClick={() => setShowMoveFolderModal(true)}
              className="px-3 py-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <FolderInput className="w-3 h-3" />
              <span>Move</span>
            </button>

            {/* Batch Export */}
            <button
              onClick={handleBatchExport}
              className="px-3 py-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <DownloadCloud className="w-3 h-3" />
              <span>Export</span>
            </button>

            {/* Batch Delete */}
            <button
              onClick={handleBatchDelete}
              className="px-3 py-1.5 rounded-full bg-red-900/80 hover:bg-red-800 text-red-200 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. VIEW CATEGORY: FOLDERS SECTION */}
      {categoryFilter === 'folders' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {folders.map((folder) => {
              const count = videos.filter((v) => (v.folder || 'Downloads').toLowerCase() === folder.name.toLowerCase()).length;
              return (
                <div
                  key={folder.id}
                  onClick={() => {
                    setSelectedFolder(folder.name);
                    setCategoryFilter('all');
                  }}
                  className={`p-4 rounded-3xl border transition-all cursor-pointer ${
                    selectedFolder === folder.name 
                      ? 'bg-black text-white border-black shadow-md' 
                      : 'bg-white text-neutral-900 border-neutral-200 hover:border-neutral-400'
                  }`}
                >
                  <div className="w-10 h-10 rounded-2xl bg-neutral-100 flex items-center justify-center mb-3 text-neutral-800">
                    <Folder className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold truncate">{folder.name}</h4>
                  <p className={`text-xs font-mono mt-0.5 ${selectedFolder === folder.name ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    {count} item{count !== 1 ? 's' : ''}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. VIEW CATEGORY: PLAYLISTS SECTION */}
      {categoryFilter === 'playlists' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {playlists.map((playlist) => {
              const pVideos = videos.filter((v) => playlist.videoIds.includes(v.id));
              return (
                <div
                  key={playlist.id}
                  className="p-5 rounded-3xl bg-white border border-neutral-200 hover:border-neutral-300 transition-all flex flex-col justify-between shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center">
                        <ListMusic className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                        {pVideos.length} Tracks
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-neutral-950 truncate">{playlist.name}</h4>
                    <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{playlist.description || 'Custom Media Playlist'}</p>
                  </div>

                  <div className="pt-4 mt-3 border-t border-neutral-100 flex items-center justify-between">
                    <button
                      onClick={() => {
                        if (pVideos.length > 0) {
                          onPlayVideo(pVideos[0], pVideos);
                        }
                      }}
                      disabled={pVideos.length === 0}
                      className="px-4 py-2 rounded-full bg-black text-white hover:bg-neutral-800 disabled:opacity-40 text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Play All</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. PRIMARY MEDIA ITEMS DISPLAY (GRID OR LIST) */}
      {categoryFilter !== 'playlists' && categoryFilter !== 'folders' && (
        <div>
          {/* Active Folder Filter Bar */}
          {selectedFolder && (
            <div className="flex items-center justify-between p-3 px-4 mb-4 rounded-2xl bg-neutral-100 border border-neutral-200">
              <div className="flex items-center gap-2 text-xs font-mono">
                <Folder className="w-4 h-4 text-neutral-600" />
                <span>Viewing folder: <strong>{selectedFolder}</strong></span>
              </div>
              <button
                onClick={() => setSelectedFolder(null)}
                className="text-xs font-mono font-semibold underline text-neutral-700 hover:text-black"
              >
                Show All Folders
              </button>
            </div>
          )}

          {filteredVideos.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-neutral-200 p-8">
              <HardDrive className="w-12 h-12 mx-auto text-neutral-300 mb-3 stroke-[1.5]" />
              <h3 className="text-base font-bold text-neutral-900">No media found</h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                {searchQuery 
                  ? `No items matching "${searchQuery}". Try a different keyword.` 
                  : 'Download videos or import media files into your universal library.'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            /* GRID VIEW */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVideos.map((video) => {
                const isSelected = selectedIds.includes(video.id);
                return (
                  <div
                    key={video.id}
                    className={`group relative bg-white rounded-[28px] p-3.5 border transition-all duration-200 flex flex-col justify-between shadow-xs hover:shadow-md ${
                      isSelected ? 'border-black ring-2 ring-black/10' : 'border-neutral-200/90 hover:border-neutral-300'
                    }`}
                  >
                    {/* Media Thumbnail */}
                    <div 
                      className="relative aspect-video rounded-2xl overflow-hidden bg-neutral-100 cursor-pointer mb-3"
                      onClick={() => {
                        if (isSelectMode) toggleSelect(video.id);
                        else onPlayVideo(video, filteredVideos);
                      }}
                    >
                      <img
                        src={video.thumbnailUrl || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80'}
                        alt={video.title}
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />

                      {/* Floating Quality & Format Badges */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1">
                        <span className="px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-xs text-[10px] font-mono font-bold text-white uppercase">
                          .{video.format}
                        </span>
                        {video.quality && (
                          <span className="px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-xs text-[10px] font-mono font-bold text-neutral-900">
                            {video.quality}
                          </span>
                        )}
                      </div>

                      {/* Duration badge */}
                      <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-xs text-[10px] font-mono font-medium text-white">
                        {video.durationFormatted}
                      </div>

                      {/* Play hover button */}
                      {!isSelectMode && (
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          </div>
                        </div>
                      )}

                      {/* Multi-select check icon */}
                      {isSelectMode && (
                        <div className="absolute top-2.5 right-2.5">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                            isSelected ? 'bg-black text-white' : 'bg-white/80 border border-neutral-300 text-transparent'
                          }`}>
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Metadata & Controls */}
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs sm:text-sm font-semibold text-neutral-950 truncate group-hover:text-black">
                            {video.title}
                          </h4>
                          <p className="text-xs text-neutral-500 truncate mt-0.5">
                            {video.author || 'Universal Media'}
                          </p>
                        </div>

                        {/* Menu trigger */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenCardMenu(video);
                          }}
                          className="w-8 h-8 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 flex items-center justify-center transition-colors flex-shrink-0"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Footer tags */}
                      <div className="flex items-center justify-between pt-3 mt-2 border-t border-neutral-100 text-[11px] text-neutral-500 font-mono">
                        <span className="truncate">{video.fileSizeFormatted}</span>
                        {video.folder && (
                          <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-semibold truncate max-w-[100px]">
                            {video.folder}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* LIST VIEW */
            <div className="bg-white rounded-3xl border border-neutral-200 divide-y divide-neutral-100 overflow-hidden shadow-xs">
              {filteredVideos.map((video) => {
                const isSelected = selectedIds.includes(video.id);
                return (
                  <div
                    key={video.id}
                    onClick={() => {
                      if (isSelectMode) toggleSelect(video.id);
                      else onPlayVideo(video, filteredVideos);
                    }}
                    className={`p-3 sm:p-4 flex items-center justify-between gap-3 hover:bg-neutral-50 cursor-pointer transition-colors ${
                      isSelected ? 'bg-neutral-100' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {isSelectMode && (
                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all ${
                          isSelected ? 'bg-black text-white' : 'border border-neutral-300'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      )}

                      <div className="w-14 h-14 rounded-2xl bg-neutral-100 overflow-hidden flex-shrink-0 relative border border-neutral-200/80">
                        <img
                          src={video.thumbnailUrl || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80'}
                          alt={video.title}
                          className="w-full h-full object-cover grayscale"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute bottom-1 right-1 text-[9px] font-mono px-1 rounded bg-black/80 text-white">
                          {video.durationFormatted}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs sm:text-sm font-semibold text-neutral-950 truncate">{video.title}</h4>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-500 font-mono">
                          <span className="uppercase font-bold text-neutral-700">.{video.format}</span>
                          <span>·</span>
                          <span>{video.quality || '1080p'}</span>
                          <span>·</span>
                          <span>{video.fileSizeFormatted}</span>
                          {video.folder && (
                            <>
                              <span>·</span>
                              <span className="text-neutral-700 font-semibold">{video.folder}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenCardMenu(video);
                        }}
                        className="w-8 h-8 rounded-full hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 7. NEW FOLDER MODAL */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 border border-neutral-200 shadow-2xl text-neutral-900 animate-in zoom-in-95">
            <h3 className="text-base font-bold font-mono uppercase mb-1">Create Media Folder</h3>
            <p className="text-xs text-neutral-500 mb-4">Organize media into custom categories or projects</p>
            <input
              type="text"
              placeholder="e.g. Podcasts, Tutorials, Music"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-sm font-medium focus:outline-none focus:border-black mb-4"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="px-4 py-2 rounded-full text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewFolder}
                className="px-4 py-2 rounded-full bg-black text-white hover:bg-neutral-800 text-xs font-semibold"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MOVE TO FOLDER MODAL */}
      {showMoveFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 border border-neutral-200 shadow-2xl text-neutral-900 animate-in zoom-in-95">
            <h3 className="text-base font-bold font-mono uppercase mb-1">Move to Folder</h3>
            <p className="text-xs text-neutral-500 mb-4">Select target destination folder</p>
            <div className="space-y-1.5 mb-4 max-h-48 overflow-y-auto">
              {folders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setMoveTargetFolder(f.name)}
                  className={`w-full p-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between border ${
                    moveTargetFolder === f.name ? 'bg-black text-white border-black' : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border-neutral-200'
                  }`}
                >
                  <span>{f.name}</span>
                  {moveTargetFolder === f.name && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowMoveFolderModal(false)}
                className="px-4 py-2 rounded-full text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchMoveFolder}
                className="px-4 py-2 rounded-full bg-black text-white hover:bg-neutral-800 text-xs font-semibold"
              >
                Move {selectedIds.length} Item(s)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
