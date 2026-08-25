import React from 'react';
import { ArrowDown, Clock, Settings, Scissors } from 'lucide-react';

export type TabType = 'downloader' | 'studio' | 'library' | 'settings';

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
        className="pointer-events-auto bg-white/90 backdrop-blur-xl border border-neutral-200/90 rounded-full px-5 sm:px-8 py-2.5 shadow-[0_10px_35px_rgba(0,0,0,0.07)] flex items-center gap-4 sm:gap-8 transition-all"
        aria-label="Main Navigation"
      >
        {/* Tab 1: Download */}
        <button
          id="nav-tab-download"
          onClick={() => setActiveTab('downloader')}
          className="group relative flex flex-col items-center justify-center min-w-[50px] sm:min-w-[56px] focus:outline-none transition-transform active:scale-95"
        >
          {/* Active Dot Indicator */}
          <div className="h-2 flex items-center justify-center mb-0.5">
            {activeTab === 'downloader' ? (
              <span className="w-1.5 h-1.5 rounded-full bg-black animate-in zoom-in duration-150" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-transparent" />
            )}
          </div>

          {/* Icon */}
          <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            activeTab === 'downloader' 
              ? 'bg-black text-white shadow-xs' 
              : 'text-neutral-500 group-hover:text-neutral-900 group-hover:bg-neutral-100'
          }`}>
            <ArrowDown className="w-4 h-4 stroke-[2.2]" />
          </div>

          {/* Label */}
          <span className={`text-[11px] font-medium tracking-tight mt-1 transition-colors ${
            activeTab === 'downloader' ? 'text-black font-semibold' : 'text-neutral-500'
          }`}>
            Download
          </span>

          {/* Downloading Badge */}
          {downloadingCount > 0 && (
            <span className="absolute -top-1 right-2 w-4 h-4 rounded-full bg-black text-white text-[9px] font-mono font-bold flex items-center justify-center ring-2 ring-white animate-pulse">
              {downloadingCount}
            </span>
          )}
        </button>

        {/* Tab 2: Studio (Video Tools & Processing) */}
        <button
          id="nav-tab-studio"
          onClick={() => setActiveTab('studio')}
          className="group relative flex flex-col items-center justify-center min-w-[50px] sm:min-w-[56px] focus:outline-none transition-transform active:scale-95"
        >
          <div className="h-2 flex items-center justify-center mb-0.5">
            {activeTab === 'studio' ? (
              <span className="w-1.5 h-1.5 rounded-full bg-black animate-in zoom-in duration-150" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-transparent" />
            )}
          </div>

          <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            activeTab === 'studio' 
              ? 'bg-black text-white shadow-xs' 
              : 'text-neutral-500 group-hover:text-neutral-900 group-hover:bg-neutral-100'
          }`}>
            <Scissors className="w-4 h-4 stroke-[2.2]" />
          </div>

          <span className={`text-[11px] font-medium tracking-tight mt-1 transition-colors ${
            activeTab === 'studio' ? 'text-black font-semibold' : 'text-neutral-500'
          }`}>
            Studio
          </span>
        </button>

        {/* Tab 3: History / Smart Library */}
        <button
          id="nav-tab-history"
          onClick={() => setActiveTab('library')}
          className="group relative flex flex-col items-center justify-center min-w-[50px] sm:min-w-[56px] focus:outline-none transition-transform active:scale-95"
        >
          <div className="h-2 flex items-center justify-center mb-0.5">
            {activeTab === 'library' ? (
              <span className="w-1.5 h-1.5 rounded-full bg-black animate-in zoom-in duration-150" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-transparent" />
            )}
          </div>

          <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            activeTab === 'library' 
              ? 'bg-black text-white shadow-xs' 
              : 'text-neutral-500 group-hover:text-neutral-900 group-hover:bg-neutral-100'
          }`}>
            <Clock className="w-4 h-4 stroke-[2.2]" />
          </div>

          <span className={`text-[11px] font-medium tracking-tight mt-1 transition-colors ${
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
          className="group relative flex flex-col items-center justify-center min-w-[50px] sm:min-w-[56px] focus:outline-none transition-transform active:scale-95"
        >
          <div className="h-2 flex items-center justify-center mb-0.5">
            {activeTab === 'settings' ? (
              <span className="w-1.5 h-1.5 rounded-full bg-black animate-in zoom-in duration-150" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-transparent" />
            )}
          </div>

          <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            activeTab === 'settings' 
              ? 'bg-black text-white shadow-xs' 
              : 'text-neutral-500 group-hover:text-neutral-900 group-hover:bg-neutral-100'
          }`}>
            <Settings className="w-4 h-4 stroke-[2.2]" />
          </div>

          <span className={`text-[11px] font-medium tracking-tight mt-1 transition-colors ${
            activeTab === 'settings' ? 'text-black font-semibold' : 'text-neutral-500'
          }`}>
            Settings
          </span>
        </button>
      </nav>
    </div>
  );
};
