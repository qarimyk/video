import React from 'react';
import { ArrowDown, HardDrive, Settings, Scissors, DownloadCloud, FolderLock } from 'lucide-react';

export type TabType = 'downloader' | 'downloads' | 'library' | 'settings' | 'studio';

interface BottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  downloadingCount?: number;
  videoCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  downloadingCount = 0,
  videoCount = 0,
}) => {
  return (
    <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
      <nav 
        className="pointer-events-auto bg-white/95 backdrop-blur-xl border border-neutral-200/90 rounded-full px-4 sm:px-6 py-2 shadow-[0_10px_35px_rgba(0,0,0,0.08)] flex items-center gap-3 sm:gap-6 transition-all"
        aria-label="Main Navigation"
      >
        {/* Tab 1: Downloader */}
        <button
          id="nav-tab-downloader"
          onClick={() => setActiveTab('downloader')}
          className="group relative flex flex-col items-center justify-center min-w-[50px] sm:min-w-[60px] focus:outline-none transition-transform active:scale-95"
        >
          <div className="h-1.5 flex items-center justify-center mb-0.5">
            {activeTab === 'downloader' ? (
              <span className="w-1.5 h-1.5 rounded-full bg-black animate-in zoom-in duration-150" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-transparent" />
            )}
          </div>

          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all ${
            activeTab === 'downloader' 
              ? 'bg-black text-white shadow-xs' 
              : 'text-neutral-500 group-hover:text-neutral-900 group-hover:bg-neutral-100'
          }`}>
            <ArrowDown className="w-4 h-4 stroke-[2.2]" />
          </div>

          <span className={`text-[10px] sm:text-[11px] font-medium tracking-tight mt-0.5 transition-colors ${
            activeTab === 'downloader' ? 'text-black font-semibold' : 'text-neutral-500'
          }`}>
            Downloader
          </span>
        </button>

        {/* Tab 2: Downloads (Queue / In-progress / Finished) */}
        <button
          id="nav-tab-downloads"
          onClick={() => setActiveTab('downloads')}
          className="group relative flex flex-col items-center justify-center min-w-[50px] sm:min-w-[60px] focus:outline-none transition-transform active:scale-95"
        >
          <div className="h-1.5 flex items-center justify-center mb-0.5">
            {activeTab === 'downloads' ? (
              <span className="w-1.5 h-1.5 rounded-full bg-black animate-in zoom-in duration-150" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-transparent" />
            )}
          </div>

          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all ${
            activeTab === 'downloads' 
              ? 'bg-black text-white shadow-xs' 
              : 'text-neutral-500 group-hover:text-neutral-900 group-hover:bg-neutral-100'
          }`}>
            <DownloadCloud className="w-4 h-4 stroke-[2.2]" />
          </div>

          <span className={`text-[10px] sm:text-[11px] font-medium tracking-tight mt-0.5 transition-colors ${
            activeTab === 'downloads' ? 'text-black font-semibold' : 'text-neutral-500'
          }`}>
            Downloads
          </span>

          {downloadingCount > 0 && (
            <span className="absolute -top-1 right-2 w-4 h-4 rounded-full bg-black text-white text-[9px] font-mono font-bold flex items-center justify-center ring-2 ring-white animate-pulse">
              {downloadingCount}
            </span>
          )}
        </button>

        {/* Tab 3: Universal Library */}
        <button
          id="nav-tab-library"
          onClick={() => setActiveTab('library')}
          className="group relative flex flex-col items-center justify-center min-w-[50px] sm:min-w-[60px] focus:outline-none transition-transform active:scale-95"
        >
          <div className="h-1.5 flex items-center justify-center mb-0.5">
            {activeTab === 'library' ? (
              <span className="w-1.5 h-1.5 rounded-full bg-black animate-in zoom-in duration-150" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-transparent" />
            )}
          </div>

          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all ${
            activeTab === 'library' 
              ? 'bg-black text-white shadow-xs' 
              : 'text-neutral-500 group-hover:text-neutral-900 group-hover:bg-neutral-100'
          }`}>
            <HardDrive className="w-4 h-4 stroke-[2.2]" />
          </div>

          <span className={`text-[10px] sm:text-[11px] font-medium tracking-tight mt-0.5 transition-colors ${
            activeTab === 'library' ? 'text-black font-semibold' : 'text-neutral-500'
          }`}>
            Library
          </span>

          {videoCount > 0 && activeTab !== 'library' && (
            <span className="absolute -top-1 right-2 w-4 h-4 rounded-full bg-neutral-200 text-neutral-800 text-[9px] font-mono font-semibold flex items-center justify-center ring-2 ring-white">
              {videoCount}
            </span>
          )}
        </button>

        {/* Tab 4: Settings */}
        <button
          id="nav-tab-settings"
          onClick={() => setActiveTab('settings')}
          className="group relative flex flex-col items-center justify-center min-w-[50px] sm:min-w-[60px] focus:outline-none transition-transform active:scale-95"
        >
          <div className="h-1.5 flex items-center justify-center mb-0.5">
            {activeTab === 'settings' ? (
              <span className="w-1.5 h-1.5 rounded-full bg-black animate-in zoom-in duration-150" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-transparent" />
            )}
          </div>

          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all ${
            activeTab === 'settings' 
              ? 'bg-black text-white shadow-xs' 
              : 'text-neutral-500 group-hover:text-neutral-900 group-hover:bg-neutral-100'
          }`}>
            <Settings className="w-4 h-4 stroke-[2.2]" />
          </div>

          <span className={`text-[10px] sm:text-[11px] font-medium tracking-tight mt-0.5 transition-colors ${
            activeTab === 'settings' ? 'text-black font-semibold' : 'text-neutral-500'
          }`}>
            Settings
          </span>
        </button>
      </nav>
    </div>
  );
};
