import React from 'react';
import { 
  X, 
  HelpCircle, 
  Play, 
  HardDrive, 
  Download, 
  Sliders, 
  Wifi, 
  Command, 
  ShieldCheck,
  Film
} from 'lucide-react';
import { DotMatrixLogo } from './DotMatrixLogo';

interface HelpModalProps {
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white border border-neutral-200 rounded-[32px] max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <DotMatrixLogo size="sm" />
            <div>
              <h3 className="text-base font-bold text-neutral-900">User Guide & Shortcuts</h3>
              <p className="text-xs text-neutral-500 font-mono">Nothing CMF Minimal System</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feature Highlights */}
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-black text-white flex-shrink-0">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-neutral-900">True Offline Persistence</h4>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Videos and audio tracks are saved as raw binary blobs inside your browser's local IndexedDB. Once downloaded, they play with zero internet connection.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-neutral-200 text-neutral-900 flex-shrink-0">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-neutral-900">Export & Import Freedom</h4>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Save any offline video to your device's disk file system (.mp4 / .mp3) at any time, or import existing files into your offline library.
              </p>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2.5 font-mono">
            Player Keyboard Shortcuts
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 border border-neutral-200/60">
              <span className="text-neutral-600">Play / Pause</span>
              <kbd className="px-2 py-0.5 bg-white border border-neutral-200 rounded-md font-mono text-[10px] text-neutral-800 shadow-2xs">Space</kbd>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 border border-neutral-200/60">
              <span className="text-neutral-600">Seek ±5s</span>
              <kbd className="px-2 py-0.5 bg-white border border-neutral-200 rounded-md font-mono text-[10px] text-neutral-800 shadow-2xs">← / →</kbd>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 border border-neutral-200/60">
              <span className="text-neutral-600">Volume ±10%</span>
              <kbd className="px-2 py-0.5 bg-white border border-neutral-200 rounded-md font-mono text-[10px] text-neutral-800 shadow-2xs">↑ / ↓</kbd>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 border border-neutral-200/60">
              <span className="text-neutral-600">Mute / Unmute</span>
              <kbd className="px-2 py-0.5 bg-white border border-neutral-200 rounded-md font-mono text-[10px] text-neutral-800 shadow-2xs">M</kbd>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 border border-neutral-200/60">
              <span className="text-neutral-600">Fullscreen</span>
              <kbd className="px-2 py-0.5 bg-white border border-neutral-200 rounded-md font-mono text-[10px] text-neutral-800 shadow-2xs">F</kbd>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 border border-neutral-200/60">
              <span className="text-neutral-600">Close</span>
              <kbd className="px-2 py-0.5 bg-white border border-neutral-200 rounded-md font-mono text-[10px] text-neutral-800 shadow-2xs">Esc</kbd>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="pt-2 border-t border-neutral-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-black text-white text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-2xs"
          >
            Got it
          </button>
        </div>

      </div>
    </div>
  );
};
