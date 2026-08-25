import React from 'react';
import { 
  HardDrive, 
  Trash2, 
  PlusCircle, 
  HelpCircle, 
  Wifi, 
  WifiOff, 
  Sliders, 
  Sparkles,
  Download,
  Info,
  Check
} from 'lucide-react';
import { StorageStats } from '../types';
import { DotMatrixLogo } from './DotMatrixLogo';

interface SettingsViewProps {
  storageStats: StorageStats;
  isOnline: boolean;
  onOpenImport: () => void;
  onOpenHelp: () => void;
  onClearAllData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  storageStats,
  isOnline,
  onOpenImport,
  onOpenHelp,
  onClearAllData,
}) => {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-32">
      
      {/* Title */}
      <div className="text-left mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 uppercase">
          SETTINGS & STORAGE
        </h1>
        <p className="text-sm text-neutral-500 font-normal mt-1.5">
          Manage offline disk persistence, local files, and device preferences.
        </p>
      </div>

      {/* Storage & Hardware Overview Card */}
      <div className="bg-white rounded-[28px] p-6 border border-neutral-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.03)] mb-6">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-900 border border-neutral-200/60">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">Device Storage Quota</h3>
              <p className="text-xs text-neutral-500 font-mono">Client-side IndexedDB</p>
            </div>
          </div>
          <span className="text-xs font-mono font-semibold bg-neutral-100 px-3 py-1 rounded-full text-neutral-800">
            {storageStats.percentUsed}% Full
          </span>
        </div>

        <div className="py-4">
          <div className="flex justify-between text-xs font-mono text-neutral-600 mb-2">
            <span>Used: <strong>{storageStats.formattedUsed}</strong></span>
            <span>Capacity: <strong>{storageStats.formattedQuota}</strong></span>
          </div>

          <div className="w-full h-3 bg-neutral-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-black rounded-full transition-all duration-500"
              style={{ width: `${Math.max(4, Math.min(100, storageStats.percentUsed))}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-neutral-100 text-center">
          <div className="p-3 bg-neutral-50 rounded-2xl">
            <div className="text-lg font-bold text-neutral-900">{storageStats.videoCount}</div>
            <div className="text-[11px] text-neutral-500 uppercase tracking-wider font-mono">Saved Items</div>
          </div>
          <div className="p-3 bg-neutral-50 rounded-2xl">
            <div className="text-lg font-bold text-neutral-900">{isOnline ? 'Online' : 'Offline'}</div>
            <div className="text-[11px] text-neutral-500 uppercase tracking-wider font-mono">Network</div>
          </div>
          <div className="p-3 bg-neutral-50 rounded-2xl col-span-2 sm:col-span-1">
            <div className="text-lg font-bold text-neutral-900">Zero Buffer</div>
            <div className="text-[11px] text-neutral-500 uppercase tracking-wider font-mono">100% Offline</div>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="space-y-4 mb-8">
        {/* Import Local Media */}
        <div className="bg-white rounded-[24px] p-5 border border-neutral-200/90 shadow-2xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 text-neutral-900 flex items-center justify-center border border-neutral-200/60">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-neutral-900">Import Local Media</h4>
              <p className="text-xs text-neutral-500">Add videos or audio files directly from your computer or phone</p>
            </div>
          </div>
          <button
            onClick={onOpenImport}
            className="px-4 py-2 rounded-full bg-black text-white text-xs font-semibold hover:bg-neutral-800 transition-colors flex-shrink-0"
          >
            Import File
          </button>
        </div>

        {/* Keyboard Shortcuts & Help */}
        <div className="bg-white rounded-[24px] p-5 border border-neutral-200/90 shadow-2xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 text-neutral-900 flex items-center justify-center border border-neutral-200/60">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-neutral-900">Shortcuts & Player Controls</h4>
              <p className="text-xs text-neutral-500">Space to toggle play, arrows to seek/volume, F for fullscreen</p>
            </div>
          </div>
          <button
            onClick={onOpenHelp}
            className="px-4 py-2 rounded-full bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-200 text-xs font-semibold transition-colors flex-shrink-0"
          >
            View Help
          </button>
        </div>

        {/* Clear All Storage */}
        <div className="bg-white rounded-[24px] p-5 border border-neutral-200/90 shadow-2xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-neutral-900">Clear Offline Cache</h4>
              <p className="text-xs text-neutral-500">Erase all downloaded media files from this browser</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete all offline videos? This action cannot be undone.')) {
                onClearAllData();
              }
            }}
            className="px-4 py-2 rounded-full bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold transition-colors flex-shrink-0"
          >
            Clear Data
          </button>
        </div>
      </div>

      {/* Industrial Philosophy Footer */}
      <div className="p-6 rounded-[28px] bg-neutral-100/60 border border-neutral-200/60 text-center">
        <div className="flex justify-center mb-2">
          <DotMatrixLogo size="sm" />
        </div>
        <p className="text-xs font-mono uppercase tracking-widest text-neutral-500">Nothing / CMF Design Philosophy</p>
        <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
          Monochrome aesthetics, glassmorphism translucency, and local hardware persistence.
        </p>
      </div>
    </div>
  );
};
