import React from 'react';
import { X, Cpu, HardDrive, MemoryStick, Clock, Activity, ShieldCheck } from 'lucide-react';
import { SystemStats } from '../types';

interface SystemStatsModalProps {
  stats: SystemStats | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SystemStatsModal: React.FC<SystemStatsModalProps> = ({ stats, isOpen, onClose }) => {
  if (!isOpen || !stats) return null;

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const temp = stats.cpu.temperature.celsius;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="relative w-full max-w-lg glass-panel rounded-2xl p-6 shadow-2xl border border-surface-border">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-surface-border mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">System Diagnostics</h2>
              <p className="text-xs text-slate-400">
                {stats.platform.is_raspberry_pi ? 'Raspberry Pi System Node' : 'Host System Node'} •{' '}
                {stats.platform.machine}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* System Overview Grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {/* CPU Usage & Temp */}
          <div className="p-4 rounded-xl bg-surface/60 border border-surface-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-brand-primary" /> CPU Load
              </span>
              <span className="text-sm font-bold text-white">
                {Math.round(stats.cpu.usage_percent)}%
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-2">
              <div
                className="bg-brand-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, stats.cpu.usage_percent)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{stats.cpu.cores} Cores</span>
              {temp !== null ? (
                <span
                  className={
                    temp > 70
                      ? 'text-rose-400 font-bold'
                      : temp > 60
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }
                >
                  {temp}°C
                </span>
              ) : (
                <span className="text-slate-500">Temp N/A</span>
              )}
            </div>
          </div>

          {/* Memory Usage */}
          <div className="p-4 rounded-xl bg-surface/60 border border-surface-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <MemoryStick className="w-3.5 h-3.5 text-cyan-400" /> RAM
              </span>
              <span className="text-sm font-bold text-white">{stats.memory.percent}%</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-2">
              <div
                className="bg-cyan-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${stats.memory.percent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{Math.round(stats.memory.used_mb)} MB</span>
              <span>{Math.round(stats.memory.total_mb)} MB</span>
            </div>
          </div>

          {/* Disk Space */}
          <div className="p-4 rounded-xl bg-surface/60 border border-surface-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-amber-400" /> Disk Space
              </span>
              <span className="text-sm font-bold text-white">{stats.disk.percent}%</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-2">
              <div
                className="bg-amber-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${stats.disk.percent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{stats.disk.free_gb} GB Free</span>
              <span>{stats.disk.total_gb} GB</span>
            </div>
          </div>

          {/* Uptime */}
          <div className="p-4 rounded-xl bg-surface/60 border border-surface-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-400" /> App Uptime
              </span>
              <span className="text-sm font-bold text-white">
                {formatUptime(stats.uptime.app_seconds)}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-3">
              Host: {formatUptime(stats.uptime.system_seconds)}
            </p>
          </div>
        </div>

        {/* Catalog Metadata info */}
        {stats.catalog && (
          <div className="p-3.5 rounded-xl bg-surface/40 border border-surface-border mb-4 flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Catalog Index
            </span>
            <div className="flex items-center gap-3 font-semibold text-slate-300">
              <span>{stats.catalog.channels_total.toLocaleString()} Channels</span>
              <span>•</span>
              <span>{stats.catalog.countries_total} Countries</span>
              <span>•</span>
              <span>{stats.catalog.categories_total} Categories</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface hover:bg-surface-hover text-slate-200 rounded-xl text-xs font-semibold border border-surface-border transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
