import React, { useState } from 'react';
import { X, Link2, Upload, FileText, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { Channel } from '../types';

interface CustomPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaylistLoaded: (channels: Channel[], playlistName: string) => void;
}

export const CustomPlaylistModal: React.FC<CustomPlaylistModalProps> = ({
  isOpen,
  onClose,
  onPlaylistLoaded,
}) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const channels = await api.parseRemoteM3U(url.trim());
      if (channels.length === 0) {
        setError('No valid streaming channels found in this playlist.');
      } else {
        onPlaylistLoaded(channels, 'Remote Playlist');
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch and parse M3U URL.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    try {
      const channels = await api.parseUploadedM3U(file);
      if (channels.length === 0) {
        setError('No playable streams found in the uploaded file.');
      } else {
        onPlaylistLoaded(channels, file.name);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to parse uploaded playlist file.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="relative w-full max-w-md glass-panel rounded-2xl p-6 shadow-2xl border border-surface-border">
        <div className="flex items-center justify-between pb-3 border-b border-surface-border mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Import M3U Playlist</h2>
              <p className="text-xs text-slate-400">Load streams from URL or local file</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Remote URL Form */}
        <form onSubmit={handleUrlSubmit} className="space-y-3 mb-5">
          <label className="block text-xs font-semibold text-slate-300">
            Playlist URL (.m3u / .m3u8)
          </label>
          <div className="relative flex items-center">
            <Link2 className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="url"
              placeholder="https://example.com/streams.m3u"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface border border-surface-border text-slate-100 text-xs rounded-xl focus:outline-none focus:border-brand-primary"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="w-full py-2 bg-brand-primary hover:bg-brand-hover text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
          >
            {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
            Load from URL
          </button>
        </form>

        <div className="relative flex py-2 items-center mb-5">
          <div className="flex-grow border-t border-surface-border"></div>
          <span className="flex-shrink mx-3 text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
            Or upload file
          </span>
          <div className="flex-grow border-t border-surface-border"></div>
        </div>

        {/* Local File Upload */}
        <label className="flex flex-col items-center justify-center w-full p-4 border-2 border-dashed border-surface-border hover:border-brand-primary/50 rounded-xl cursor-pointer bg-surface/30 hover:bg-surface/60 transition-all text-center">
          <Upload className="w-6 h-6 text-slate-400 mb-2" />
          <span className="text-xs font-semibold text-slate-300">Choose .m3u or .m3u8 file</span>
          <span className="text-[10px] text-slate-500 mt-0.5">Click to browse from laptop</span>
          <input
            type="file"
            accept=".m3u,.m3u8,text/plain"
            onChange={handleFileUpload}
            className="hidden"
            disabled={isLoading}
          />
        </label>
      </div>
    </div>
  );
};
