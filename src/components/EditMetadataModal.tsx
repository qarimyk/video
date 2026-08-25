import React, { useState } from 'react';
import { X, Tag, Edit3, Check, Folder } from 'lucide-react';
import { DownloadedVideo } from '../types';

interface EditMetadataModalProps {
  video: DownloadedVideo;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<DownloadedVideo>) => void;
}

export const EditMetadataModal: React.FC<EditMetadataModalProps> = ({
  video,
  isOpen,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState(video.title);
  const [author, setAuthor] = useState(video.author || '');
  const [artist, setArtist] = useState(video.artist || '');
  const [album, setAlbum] = useState(video.album || '');
  const [folder, setFolder] = useState(video.folder || 'Downloads');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(video.tags || []);
  const [notes, setNotes] = useState(video.notes || '');

  if (!isOpen) return null;

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(video.id, {
      title: title.trim() || video.title,
      author: author.trim(),
      artist: artist.trim() || undefined,
      album: album.trim() || undefined,
      folder: folder.trim() || 'Downloads',
      tags,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-white rounded-[32px] p-6 border border-neutral-200 shadow-2xl text-neutral-900 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-4">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-neutral-700" />
            <h3 className="text-sm font-bold font-mono uppercase tracking-wide">Edit Media Metadata</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-[11px] font-mono text-neutral-500 mb-1 uppercase font-semibold">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 font-medium focus:outline-none focus:border-black text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-neutral-500 mb-1 uppercase font-semibold">Author / Channel</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 border border-neutral-200 font-medium focus:outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-neutral-500 mb-1 uppercase font-semibold">Folder</label>
              <input
                type="text"
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 border border-neutral-200 font-medium focus:outline-none focus:border-black"
              />
            </div>
          </div>

          {video.type === 'audio' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-neutral-500 mb-1 uppercase font-semibold">Artist</label>
                <input
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 border border-neutral-200 font-medium focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-neutral-500 mb-1 uppercase font-semibold">Album</label>
                <input
                  type="text"
                  value={album}
                  onChange={(e) => setAlbum(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 border border-neutral-200 font-medium focus:outline-none focus:border-black"
                />
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="block text-[11px] font-mono text-neutral-500 mb-1 uppercase font-semibold">Tags</label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                placeholder="Add tag (e.g. Favorite, 4K, Synthwave)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1 px-3 py-1.5 rounded-xl bg-neutral-50 border border-neutral-200 font-medium focus:outline-none focus:border-black text-xs"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-1.5 rounded-xl bg-black text-white text-xs font-semibold"
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span
                  key={t}
                  className="px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-800 text-[11px] font-mono flex items-center gap-1 border border-neutral-200"
                >
                  <span>{t}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="text-neutral-400 hover:text-red-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-neutral-500 mb-1 uppercase font-semibold">Personal Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Timestamps, research notes, or bookmarks..."
              className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 font-normal focus:outline-none focus:border-black text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-full bg-black text-white text-xs font-semibold hover:bg-neutral-800"
            >
              Save Metadata
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
