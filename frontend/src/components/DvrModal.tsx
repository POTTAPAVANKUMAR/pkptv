import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Square,
  Trash2,
  HardDrive,
  Clock,
  Radio,
  RefreshCw,
  Tv,
} from 'lucide-react';
import { DvrRecording, Channel } from '../types';
import { api } from '../services/api';

interface DvrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectChannel: (channel: Channel) => void;
}

export const DvrModal: React.FC<DvrModalProps> = ({
  isOpen,
  onClose,
  onSelectChannel,
}) => {
  const [recordings, setRecordings] = useState<DvrRecording[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchRecordings = async () => {
    setIsLoading(true);
    try {
      const list = await api.getAllDvrStatus();
      setRecordings(list);
    } catch (e) {
      console.error('Failed to load DVR status:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRecordings();
      const interval = setInterval(fetchRecordings, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStop = async (channelId: string) => {
    try {
      await api.stopDvr(channelId);
      await fetchRecordings();
    } catch (e) {
      console.error('Stop DVR error:', e);
    }
  };

  const handleDelete = async (channelId: string) => {
    try {
      await api.deleteDvr(channelId);
      await fetchRecordings();
    } catch (e) {
      console.error('Delete DVR error:', e);
    }
  };

  const handlePlayDvr = (rec: DvrRecording) => {
    const channelAdapter: Channel = {
      id: rec.channel_id,
      name: `${rec.channel_name} (12h DVR)`,
      logo: rec.channel_logo || '',
      country: 'IN',
      country_flag: '⏺',
      categories: ['12h DVR Replay'],
      stream_url: rec.dvr_url,
      quality: '12h DVR Buffer',
    };
    onSelectChannel(channelAdapter);
    onClose();
  };

  const totalSizeMb = recordings.reduce((acc, r) => acc + (r.size_mb || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">12-Hour Sliding Window DVR</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  Rolling Buffer
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Continuous rolling recording stored on Raspberry Pi NVMe SSD
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchRecordings}
              disabled={isLoading}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-all"
              title="Refresh recordings"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-3.5 mb-4 text-xs text-indigo-200 leading-relaxed flex items-start gap-3">
          <Clock className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white">How 12-Hour DVR works: </span>
            The Raspberry Pi continuously keeps the last 12 hours of broadcast in a circular buffer.
            Older segments are automatically purged as new ones arrive, allowing you to rewind anytime
            while capping disk space.
          </div>
        </div>

        {/* Stats Summary Bar */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
            <Radio className="w-5 h-5 text-rose-400" />
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Active Channels</p>
              <p className="text-base font-black text-white">{recordings.length}</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
            <HardDrive className="w-5 h-5 text-cyan-400" />
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Total Buffer Size</p>
              <p className="text-base font-black text-white">
                {totalSizeMb > 1024
                  ? `${(totalSizeMb / 1024).toFixed(2)} GB`
                  : `${Math.round(totalSizeMb)} MB`}
              </p>
            </div>
          </div>
        </div>

        {/* Recordings List */}
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-1">
          {recordings.length > 0 ? (
            recordings.map((rec) => (
              <div
                key={rec.channel_id}
                className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 hover:border-white/20 transition-all flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {rec.channel_logo ? (
                    <img
                      src={rec.channel_logo}
                      alt={rec.channel_name}
                      className="w-12 h-12 object-contain rounded-xl bg-black/40 p-1 border border-white/10"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-indigo-400">
                      <Tv className="w-6 h-6" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white truncate">{rec.channel_name}</h4>
                      {rec.is_active && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-live-dot" />
                          RECORDING
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                      <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                        <Clock className="w-3.5 h-3.5" />
                        {rec.buffered_display} Buffer
                      </span>
                      <span>•</span>
                      <span>{rec.size_mb} MB</span>
                      <span>•</span>
                      <span>12h Max Window</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Play from 12h DVR */}
                  <button
                    onClick={() => handlePlayDvr(rec)}
                    className="px-3.5 py-2 rounded-xl bg-white text-slate-950 hover:bg-slate-200 text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
                    title="Watch channel with full 12-hour rewind capability"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Watch DVR</span>
                  </button>

                  {/* Stop DVR */}
                  {rec.is_active ? (
                    <button
                      onClick={() => handleStop(rec.channel_id)}
                      className="p-2 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 transition-all"
                      title="Pause recording"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                  ) : null}

                  {/* Delete DVR buffer */}
                  <button
                    onClick={() => handleDelete(rec.channel_id)}
                    className="p-2 rounded-xl bg-white/5 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 transition-all"
                    title="Delete recording and free disk space"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : !isLoading ? (
            <div className="text-center py-12 text-slate-500">
              <Radio className="w-12 h-12 mx-auto mb-2 opacity-40 text-rose-400" />
              <p className="text-sm font-semibold text-slate-300">No active 12-hour DVR buffers</p>
              <p className="text-xs text-slate-400 mt-1">
                While watching any live channel, click <span className="text-white font-bold">"12h DVR"</span> in the player to start recording a continuous 12-hour sliding window.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
