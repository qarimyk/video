import React, { useState } from 'react';
import { 
  Menu, 
  X, 
  Wifi, 
  WifiOff, 
  HardDrive, 
  PlusCircle, 
  HelpCircle,
  FolderDown,
  Info,
  Trash2
} from 'lucide-react';
import { DotMatrixLogo } from './DotMatrixLogo';
import { StorageStats } from '../types';

interface NavbarProps {
  isOnline: boolean;
  storageStats: StorageStats;
  onOpenImport: () => void;
  onOpenHelp: () => void;
  onClearCache?: () => void;
  onNavigateToHistory: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isOnline,
  storageStats,
  onOpenImport,
  onOpenHelp,
  onClearCache,
  onNavigateToHistory,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 w-full bg-[#f7f7f9]/80 backdrop-blur-md transition-all">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Left: Dot Matrix Logo */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="p-1 rounded-xl hover:bg-neutral-200/50 transition-colors focus:outline-none"
              title="Nothing CMF System"
            >
              <DotMatrixLogo size="md" />
            </button>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-[11px] font-mono tracking-widest text-neutral-400 uppercase">Nothing CMF</span>
              <span className="text-xs font-semibold text-neutral-800 tracking-tight">Offline Engine</span>
            </div>
          </div>

          {/* Center: Network Pill */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                isOnline
                  ? 'bg-white/80 border-neutral-200 text-neutral-800 shadow-2xs'
                  : 'bg-neutral-900 border-neutral-800 text-white shadow-xs'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-[11px] font-medium tracking-tight">
                {isOnline ? 'Online' : 'Offline Mode'}
              </span>
            </div>
          </div>

          {/* Right: Circular Hamburger Menu Button */}
          <div className="flex items-center gap-2">
            <button
              id="top-menu-btn"
              onClick={() => setIsMenuOpen(true)}
              className="w-10 h-10 rounded-full bg-white/90 hover:bg-neutral-100 text-neutral-900 border border-neutral-200/80 flex items-center justify-center shadow-2xs transition-all active:scale-95"
              title="Menu & Storage"
            >
              <Menu className="w-4 h-4 stroke-[2]" />
            </button>
          </div>
        </div>
      </header>

      {/* Quick Menu Sheet / Drawer */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
          onClick={() => setIsMenuOpen(false)}
        >
          <div 
            className="w-full max-w-sm h-full bg-white p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-250 border-l border-neutral-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                <div className="flex items-center gap-3">
                  <DotMatrixLogo size="sm" />
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-900">VIDEO DOWNLOADER</h3>
                    <p className="text-[11px] text-neutral-500 font-mono">Nothing / CMF Design v2.4</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Storage Info Card */}
              <div className="mt-5 p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800">
                    <HardDrive className="w-3.5 h-3.5 text-neutral-600" />
                    <span>Offline Storage</span>
                  </div>
                  <span className="text-xs font-mono text-neutral-500">{storageStats.formattedUsed}</span>
                </div>
                
                <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden mb-2">
                  <div 
                    className="h-full bg-black rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(4, Math.min(100, storageStats.percentUsed))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-neutral-500">
                  <span>{storageStats.videoCount} saved items</span>
                  <span>{storageStats.percentUsed}% capacity</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-6 space-y-2">
                <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider px-1">Quick Tools</p>
                
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenImport();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl hover:bg-neutral-100 text-neutral-800 text-sm font-medium transition-colors text-left"
                >
                  <PlusCircle className="w-4 h-4 text-neutral-700" />
                  <div>
                    <div className="font-semibold text-xs">Import Local Video</div>
                    <div className="text-[11px] text-neutral-500">Add .mp4 or .mp3 from device</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onNavigateToHistory();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl hover:bg-neutral-100 text-neutral-800 text-sm font-medium transition-colors text-left"
                >
                  <FolderDown className="w-4 h-4 text-neutral-700" />
                  <div>
                    <div className="font-semibold text-xs">Offline Library ({storageStats.videoCount})</div>
                    <div className="text-[11px] text-neutral-500">Search and organize saved media</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenHelp();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl hover:bg-neutral-100 text-neutral-800 text-sm font-medium transition-colors text-left"
                >
                  <HelpCircle className="w-4 h-4 text-neutral-700" />
                  <div>
                    <div className="font-semibold text-xs">Shortcuts & Player Help</div>
                    <div className="text-[11px] text-neutral-500">Keyboard shortcuts & guides</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-neutral-100 text-center">
              <p className="text-[11px] text-neutral-400 font-mono">
                Pure Industrial Minimalist UI
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
