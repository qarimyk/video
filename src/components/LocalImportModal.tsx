import React, { useState, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  Film, 
  Music, 
  CheckCircle2, 
  Loader2, 
  FileVideo,
  HardDrive
} from 'lucide-react';
import { DownloadedVideo } from '../types';
import { saveDownloadedVideo, formatBytes } from '../services/storage';

interface LocalImportModalProps {
  onClose: () => void;
  onImportComplete: (video: DownloadedVideo) => void;
}

export const LocalImportModal: React.FC<LocalImportModalProps> = ({ onClose, onImportComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewThumb, setPreviewThumb] = useState<string | null>(null);
  const [thumbBlob, setThumbBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [durationFormatted, setDurationFormatted] = useState<string>('0:00');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const formatSeconds = (sec: number) => {
    if (isNaN(sec) || sec <= 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const processFile = async (file: File) => {
    setSelectedFile(file);
    const defaultTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    setCustomTitle(defaultTitle);

    const isVideo = file.type.startsWith('video') || /\.(mp4|webm|mkv|mov|avi)$/i.test(file.name);
    const isAudio = file.type.startsWith('audio') || /\.(mp3|m4a|wav|aac|ogg|flac)$/i.test(file.name);

    if (isVideo) {
      const videoEl = document.createElement('video');
      videoEl.preload = 'metadata';
      videoEl.muted = true;
      videoEl.playsInline = true;
      const fileUrl = URL.createObjectURL(file);
      videoEl.src = fileUrl;

      videoEl.onloadedmetadata = () => {
        const dur = Math.floor(videoEl.duration) || 0;
        setDuration(dur);
        setDurationFormatted(formatSeconds(dur));
        videoEl.currentTime = Math.min(1, dur / 2);
      };

      videoEl.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.min(640, videoEl.videoWidth || 640);
          canvas.height = Math.min(360, videoEl.videoHeight || 360);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
              if (blob) {
                setThumbBlob(blob);
                setPreviewThumb(URL.createObjectURL(blob));
              }
            }, 'image/jpeg', 0.85);
          }
        } catch (e) {
          console.warn('Canvas thumbnail snapshot skipped:', e);
        } finally {
          URL.revokeObjectURL(fileUrl);
        }
      };
    } else if (isAudio) {
      const audioEl = new Audio();
      const fileUrl = URL.createObjectURL(file);
      audioEl.src = fileUrl;
      audioEl.onloadedmetadata = () => {
        const dur = Math.floor(audioEl.duration) || 0;
        setDuration(dur);
        setDurationFormatted(formatSeconds(dur));
        URL.revokeObjectURL(fileUrl);
      };
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleSaveToStorage = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    try {
      const isAudio = selectedFile.type.startsWith('audio') || /\.(mp3|m4a|wav|aac)$/i.test(selectedFile.name);
      const ext = selectedFile.name.split('.').pop()?.toLowerCase() || (isAudio ? 'mp3' : 'mp4');

      const importedVideo: DownloadedVideo = {
        id: `imported-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sourceUrl: `local://${selectedFile.name}`,
        title: customTitle.trim() || selectedFile.name,
        author: 'Local Device',
        duration,
        durationFormatted,
        thumbnailBlob: thumbBlob || undefined,
        videoBlob: selectedFile,
        format: ext,
        quality: isAudio ? 'Audio Only' : 'Local HD',
        fileSize: selectedFile.size,
        fileSizeFormatted: formatBytes(selectedFile.size),
        downloadedAt: Date.now(),
        isFavorite: false,
        tags: ['Local Import', isAudio ? 'Audio' : 'Video'],
        type: isAudio ? 'audio' : 'video',
      };

      await saveDownloadedVideo(importedVideo);
      onImportComplete(importedVideo);
      onClose();
    } catch (err: any) {
      alert('Failed to import file: ' + (err.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white border border-neutral-200 rounded-[32px] max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 text-neutral-900 border border-neutral-200 flex items-center justify-center">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">Import Local Media</h3>
              <p className="text-xs text-neutral-500">Save video or audio to offline storage</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dropzone */}
        {!selectedFile ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-black bg-neutral-100'
                : 'border-neutral-200 bg-neutral-50 hover:border-neutral-400 hover:bg-white'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,audio/*,.mp4,.webm,.mkv,.mov,.avi,.mp3,.m4a,.wav,.aac"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center mx-auto mb-3 shadow-sm">
              <FileVideo className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-neutral-900">
              Drag & drop media file here
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Supports MP4, WebM, MKV, MOV, MP3, M4A, WAV
            </p>
            <button
              type="button"
              className="mt-4 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-full text-xs font-semibold border border-neutral-200 pointer-events-none"
            >
              Select from Files
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center gap-3">
              {previewThumb ? (
                <img src={previewThumb} alt="Preview" className="w-16 h-12 object-cover rounded-xl grayscale flex-shrink-0" />
              ) : (
                <div className="w-16 h-12 bg-neutral-200 rounded-xl flex items-center justify-center text-neutral-600 flex-shrink-0">
                  <Film className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-neutral-900 truncate">{selectedFile.name}</p>
                <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                  {formatBytes(selectedFile.size)} · {durationFormatted}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewThumb(null);
                }}
                className="p-1 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Title in Offline Library
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-black"
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
          <button
            onClick={onClose}
            className="px-4 py-2 hover:bg-neutral-100 text-neutral-600 text-xs font-semibold rounded-full transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveToStorage}
            disabled={!selectedFile || isProcessing}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-black hover:bg-neutral-900 disabled:opacity-50 text-white text-xs font-semibold rounded-full transition-all cursor-pointer shadow-sm"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Save to Offline Library</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
