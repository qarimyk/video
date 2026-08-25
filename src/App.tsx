/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { DownloadCenter } from './components/DownloadCenter';
import { OfflineLibrary } from './components/OfflineLibrary';
import { VideoStudio } from './components/VideoStudio';
import { SettingsView } from './components/SettingsView';
import { BottomNav, TabType } from './components/BottomNav';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { MiniPlayerBar } from './components/MiniPlayerBar';
import { DownloadQueueModal } from './components/DownloadQueueModal';
import { PlaylistModal } from './components/PlaylistModal';
import { LocalImportModal } from './components/LocalImportModal';
import { HelpModal } from './components/HelpModal';
import { DownloadedVideo, Playlist, StorageStats, DownloadTask } from './types';
import { 
  getAllDownloadedVideos, 
  deleteDownloadedVideo, 
  toggleFavoriteVideo, 
  updateVideoMetadata, 
  getStorageStats,
  seedDefaultVideosIfEmpty,
  getAllPlaylists,
  getDB
} from './services/storage';
import { downloadQueue } from './services/downloadQueue';
import { WifiOff } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('downloader');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [videos, setVideos] = useState<DownloadedVideo[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [storageStats, setStorageStats] = useState<StorageStats>({
    usedBytes: 0,
    quotaBytes: 10 * 1024 * 1024 * 1024,
    percentUsed: 0,
    formattedUsed: '0 MB',
    formattedQuota: '10 GB',
    videoCount: 0,
  });
  
  // Modals
  const [playingVideo, setPlayingVideo] = useState<DownloadedVideo | null>(null);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [playlistTargetVideo, setPlaylistTargetVideo] = useState<DownloadedVideo | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Video Studio selected video target
  const [studioTargetVideoId, setStudioTargetVideoId] = useState<string | undefined>(undefined);

  // Playback Queue & Mini player state
  const [playerQueue, setPlayerQueue] = useState<DownloadedVideo[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Active downloading count from queue
  const [activeDownloadsCount, setActiveDownloadsCount] = useState(0);

  // Monitor network connectivity
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Monitor download queue tasks count
  useEffect(() => {
    const unsubscribe = downloadQueue.subscribe((tasks) => {
      const active = tasks.filter(t => t.status === 'downloading' || t.status === 'saving' || t.status === 'queued').length;
      setActiveDownloadsCount(active);
    });
    return () => unsubscribe();
  }, []);

  // Reload offline library & playlists data
  const reloadLibrary = useCallback(async () => {
    try {
      // Seed initial sample videos if empty
      const items = await seedDefaultVideosIfEmpty();
      setVideos(items);

      const pl = await getAllPlaylists();
      setPlaylists(pl);

      const stats = await getStorageStats();
      setStorageStats(stats);
    } catch (e) {
      console.error('Failed to load offline media:', e);
    }
  }, []);

  useEffect(() => {
    reloadLibrary();
  }, [reloadLibrary]);

  const handlePlayVideo = (video: DownloadedVideo, queueList?: DownloadedVideo[]) => {
    setPlayingVideo(video);
    setIsPlayerModalOpen(true);
    setIsPlaying(true);
    setPlayerQueue(queueList || videos);
  };

  const handlePlayPlaylist = (playlist: Playlist) => {
    const playlistVideos = videos.filter(v => playlist.videoIds.includes(v.id));
    if (playlistVideos.length > 0) {
      handlePlayVideo(playlistVideos[0], playlistVideos);
    }
  };

  const handleNextInQueue = () => {
    if (!playingVideo || playerQueue.length === 0) return;
    const curIdx = playerQueue.findIndex(v => v.id === playingVideo.id);
    if (curIdx >= 0 && curIdx < playerQueue.length - 1) {
      setPlayingVideo(playerQueue[curIdx + 1]);
    } else if (playerQueue.length > 0) {
      setPlayingVideo(playerQueue[0]);
    }
  };

  const handlePrevInQueue = () => {
    if (!playingVideo || playerQueue.length === 0) return;
    const curIdx = playerQueue.findIndex(v => v.id === playingVideo.id);
    if (curIdx > 0) {
      setPlayingVideo(playerQueue[curIdx - 1]);
    } else {
      setPlayingVideo(playerQueue[playerQueue.length - 1]);
    }
  };

  const handleOpenStudio = (videoId?: string) => {
    if (videoId) {
      setStudioTargetVideoId(videoId);
    }
    setActiveTab('studio');
  };

  const handleOpenPlaylistModal = (targetVideo?: DownloadedVideo) => {
    setPlaylistTargetVideo(targetVideo || null);
    setIsPlaylistModalOpen(true);
  };

  const handleDeleteVideo = async (id: string) => {
    await deleteDownloadedVideo(id);
    if (playingVideo && playingVideo.id === id) {
      setPlayingVideo(null);
      setIsPlayerModalOpen(false);
    }
    reloadLibrary();
  };

  const handleToggleFavorite = async (id: string) => {
    await toggleFavoriteVideo(id);
    reloadLibrary();
  };

  const handleUpdateMetadata = async (id: string, updates: Partial<DownloadedVideo>) => {
    await updateVideoMetadata(id, updates);
    reloadLibrary();
  };

  const handleClearAllData = async () => {
    try {
      const db = await getDB();
      const tx = db.transaction('videos', 'readwrite');
      await tx.store.clear();
      await tx.done;
      setVideos([]);
      setPlayingVideo(null);
      setIsPlayerModalOpen(false);
      reloadLibrary();
    } catch (e) {
      console.error('Failed to clear database:', e);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f9] text-[#0a0a0a] flex flex-col font-sans selection:bg-black selection:text-white relative">
      
      {/* Top Header matching Nothing CMF design */}
      <Navbar
        isOnline={isOnline}
        storageStats={storageStats}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        onClearCache={handleClearAllData}
        onNavigateToHistory={() => setActiveTab('library')}
      />

      {/* Offline Banner when network is lost */}
      {!isOnline && (
        <div className="bg-neutral-900 text-white px-4 py-2 text-xs flex items-center justify-center gap-2 tracking-tight">
          <WifiOff className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 animate-pulse" />
          <span>
            <strong>Offline Mode:</strong> Internet disconnected. Saved media in your library is 100% accessible.
          </span>
        </div>
      )}

      {/* Main Views */}
      <main className="flex-1 w-full">
        {/* TAB 1: Downloader */}
        {activeTab === 'downloader' && (
          <DownloadCenter
            recentVideos={videos}
            onDownloadComplete={reloadLibrary}
            onPlayVideo={handlePlayVideo}
            onDeleteVideo={handleDeleteVideo}
            onToggleFavorite={handleToggleFavorite}
            onUpdateMetadata={handleUpdateMetadata}
            onOpenQueueModal={() => setIsQueueModalOpen(true)}
            onOpenStudio={handleOpenStudio}
            onAddToPlaylist={handleOpenPlaylistModal}
            isOnline={isOnline}
          />
        )}

        {/* TAB 2: Video Studio */}
        {activeTab === 'studio' && (
          <VideoStudio
            videos={videos}
            selectedVideoId={studioTargetVideoId}
            onVideoCreated={reloadLibrary}
            onPlayVideo={handlePlayVideo}
          />
        )}

        {/* TAB 3: Smart Library */}
        {activeTab === 'library' && (
          <OfflineLibrary
            videos={videos}
            playlists={playlists}
            onPlayVideo={handlePlayVideo}
            onDeleteVideo={handleDeleteVideo}
            onToggleFavorite={handleToggleFavorite}
            onUpdateMetadata={handleUpdateMetadata}
            onNavigateToDownloader={() => setActiveTab('downloader')}
            onOpenImport={() => setIsImportOpen(true)}
            onOpenStudio={handleOpenStudio}
            onOpenPlaylistModal={handleOpenPlaylistModal}
            onPlayPlaylist={handlePlayPlaylist}
          />
        )}

        {/* TAB 4: Settings */}
        {activeTab === 'settings' && (
          <SettingsView
            storageStats={storageStats}
            isOnline={isOnline}
            onOpenImport={() => setIsImportOpen(true)}
            onOpenHelp={() => setIsHelpOpen(true)}
            onClearAllData={handleClearAllData}
          />
        )}
      </main>

      {/* Floating Mini Player Bar (shown when media is loaded and full player is dismissed) */}
      {playingVideo && !isPlayerModalOpen && (
        <MiniPlayerBar
          currentVideo={playingVideo}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration || playingVideo.duration || 10}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          onNext={handleNextInQueue}
          onPrev={handlePrevInQueue}
          onExpand={() => setIsPlayerModalOpen(true)}
          onClose={() => {
            setPlayingVideo(null);
            setIsPlaying(false);
          }}
        />
      )}

      {/* Floating Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        downloadingCount={activeDownloadsCount}
        videoCount={videos.length}
      />

      {/* Full Media Player Modal */}
      {playingVideo && isPlayerModalOpen && (
        <VideoPlayerModal
          video={playingVideo}
          queue={playerQueue}
          isOpen={isPlayerModalOpen}
          onClose={() => setIsPlayerModalOpen(false)}
          onOpenStudio={handleOpenStudio}
          onAddToPlaylist={handleOpenPlaylistModal}
          onPlayNext={handleNextInQueue}
          onPlayPrev={handlePrevInQueue}
        />
      )}

      {/* Download Queue Modal */}
      <DownloadQueueModal
        isOpen={isQueueModalOpen}
        onClose={() => setIsQueueModalOpen(false)}
        onOpenStudio={() => {
          setIsQueueModalOpen(false);
          setActiveTab('studio');
        }}
      />

      {/* Playlist Manager Modal */}
      <PlaylistModal
        isOpen={isPlaylistModalOpen}
        onClose={() => {
          setIsPlaylistModalOpen(false);
          setPlaylistTargetVideo(null);
        }}
        playlists={playlists}
        allVideos={videos}
        targetVideoForAdd={playlistTargetVideo}
        onPlayPlaylist={handlePlayPlaylist}
        onPlayVideo={handlePlayVideo}
        onRefreshPlaylists={reloadLibrary}
      />

      {/* Local Media Import Modal */}
      {isImportOpen && (
        <LocalImportModal
          onClose={() => setIsImportOpen(false)}
          onImportComplete={(video) => {
            reloadLibrary();
            handlePlayVideo(video);
          }}
        />
      )}

      {/* Help & Shortcuts Modal */}
      {isHelpOpen && (
        <HelpModal onClose={() => setIsHelpOpen(false)} />
      )}

    </div>
  );
}
