import React, { useState, useEffect } from 'react';
import {
  X,
  Link2,
  Upload,
  RefreshCw,
  AlertCircle,
  Sparkles,
  ExternalLink,
  Radio,
  Play,
  Search,
} from 'lucide-react';
import { api } from '../services/api';
import { Channel, PlaylistPreset } from '../types';

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
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');
  const [presets, setPresets] = useState<PlaylistPreset[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('All');
  const [presetSearch, setPresetSearch] = useState<string>('');
  const [loadingPresetId, setLoadingPresetId] = useState<string | null>(null);

  // Custom tab form state
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPresets();
    }
  }, [isOpen]);

  const loadPresets = async () => {
    try {
      const data = await api.getPlaylistPresets();
      setPresets(data);
    } catch (e) {
      console.error('Failed to load playlist presets:', e);
    }
  };

  if (!isOpen) return null;

  const handleSelectPreset = async (preset: PlaylistPreset) => {
    setLoadingPresetId(preset.id);
    setError(null);
    try {
      const res = await api.loadPreset(preset.id);
      if (!res.channels || res.channels.length === 0) {
        setError(`No playable streams found in "${preset.name}".`);
      } else {
        onPlaylistLoaded(res.channels, `${preset.name} (${preset.badge || 'm3u8-xtream'})`);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || `Failed to load playlist for "${preset.name}".`);
    } finally {
      setLoadingPresetId(null);
    }
  };

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
        onPlaylistLoaded(channels, 'Custom Remote Playlist');
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

  // Filter presets
  const filteredPresets = presets.filter((p) => {
    const matchesGroup =
      selectedGroup === 'All' ||
      (selectedGroup === 'Featured' && p.group === 'Featured') ||
      (selectedGroup === 'Categories' && p.group === 'Categories') ||
      (selectedGroup === 'Countries' && p.group === 'Countries') ||
      (selectedGroup === 'Movies' && (p.category === 'Movies' || p.name.includes('Movie'))) ||
      (selectedGroup === 'Sports' && p.category === 'Sports') ||
      (selectedGroup === 'News' && p.category === 'News');

    const q = presetSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.badge.toLowerCase().includes(q);

    return matchesGroup && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col glass-panel rounded-2xl shadow-2xl border border-surface-border overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-border bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  m3u8-xtream Playlist Hub
                </h2>
                <a
                  href="https://github.com/m3u8-xtream/m3u8-xtream-playlist"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/10 text-indigo-300 text-[10px] font-semibold border border-indigo-500/30 transition-all"
                  title="View original repository on GitHub"
                >
                  <span>m3u8-xtream</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Curated public IPTV collections, trending cinema, and country television
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center justify-between px-6 pt-3 pb-2 border-b border-surface-border bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('presets')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'presets'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>m3u8-xtream Presets</span>
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-400/20 text-indigo-200 text-[10px]">
                {presets.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('custom')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'custom'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Custom URL or File</span>
            </button>
          </div>

          {activeTab === 'presets' && (
            <div className="relative hidden sm:flex items-center w-52">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search playlists..."
                value={presetSearch}
                onChange={(e) => setPresetSearch(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 text-xs bg-slate-900/80 border border-surface-border rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}
        </div>

        {/* Error notification banner */}
        {error && (
          <div className="m-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'presets' ? (
            <div>
              {/* Category Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-4 no-scrollbar">
                {['All', 'Featured', 'Movies', 'Sports', 'News', 'Entertainment', 'Countries'].map(
                  (group) => (
                    <button
                      key={group}
                      onClick={() => setSelectedGroup(group)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${
                        selectedGroup === group
                          ? 'bg-indigo-500 text-white shadow-sm'
                          : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {group}
                    </button>
                  )
                )}
              </div>

              {/* Presets Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredPresets.map((preset) => {
                  const isCurrentLoading = loadingPresetId === preset.id;
                  return (
                    <div
                      key={preset.id}
                      className="group relative flex flex-col justify-between p-4 rounded-xl bg-surface/40 hover:bg-surface/80 border border-surface-border hover:border-indigo-500/40 transition-all shadow-sm"
                    >
                      <div>
                        {/* Top Icon & Badge */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="text-2xl p-1.5 rounded-xl bg-white/5 border border-white/5">
                            {preset.icon}
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                            {preset.badge || preset.channel_count}
                          </span>
                        </div>

                        {/* Title & Description */}
                        <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                          {preset.name}
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {preset.description}
                        </p>
                      </div>

                      {/* Action Button */}
                      <div className="mt-4 pt-3 border-t border-surface-border/60 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-medium">
                          {preset.channel_count || 'Live Channels'}
                        </span>
                        <button
                          onClick={() => handleSelectPreset(preset)}
                          disabled={isCurrentLoading || loadingPresetId !== null}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-sm shadow-indigo-600/30"
                        >
                          {isCurrentLoading ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Play className="w-3 h-3 fill-current" />
                          )}
                          <span>{isCurrentLoading ? 'Loading...' : 'Load & Watch'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredPresets.length === 0 && (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No presets matched your search filter.
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-xl mx-auto space-y-6 py-2">
              {/* Remote URL Form */}
              <form onSubmit={handleUrlSubmit} className="space-y-3">
                <label className="block text-xs font-bold text-slate-300">
                  Remote Playlist URL (.m3u / .m3u8)
                </label>
                <div className="relative flex items-center">
                  <Link2 className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="url"
                    placeholder="https://example.com/playlist.m3u"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-surface-border text-slate-100 text-xs rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !url.trim()}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shadow-md shadow-indigo-600/20"
                >
                  {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  Load from URL
                </button>
              </form>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-surface-border"></div>
                <span className="flex-shrink mx-3 text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                  Or upload file
                </span>
                <div className="flex-grow border-t border-surface-border"></div>
              </div>

              {/* Local File Upload */}
              <label className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed border-surface-border hover:border-indigo-500/50 rounded-2xl cursor-pointer bg-surface/20 hover:bg-surface/50 transition-all text-center group">
                <div className="p-3 rounded-full bg-white/5 group-hover:bg-indigo-500/10 mb-2 transition-colors">
                  <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                </div>
                <span className="text-xs font-bold text-slate-200">
                  Choose .m3u or .m3u8 file
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5">
                  Click to browse from your device
                </span>
                <input
                  type="file"
                  accept=".m3u,.m3u8,text/plain"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isLoading}
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
