import React, { useRef, useEffect } from 'react';
import { Search, X, Cpu, PlusCircle, RefreshCw, Tv, FileCode2 } from 'lucide-react';
import { SystemStats } from '../types';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  systemStats: SystemStats | null;
  onOpenStats: () => void;
  onOpenCustomM3U: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  systemStats,
  onOpenStats,
  onOpenCustomM3U,
  onRefresh,
  isRefreshing,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const tempCelsius = systemStats?.cpu?.temperature?.celsius;
  const cpuPercent = systemStats?.cpu?.usage_percent;

  return (
    <header className="sticky top-0 z-30 w-full glass-header px-4 lg:px-8 py-3.5 flex items-center justify-between gap-4">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-primary to-brand-accent flex items-center justify-center shadow-glow-primary">
          <Tv className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-base tracking-tight text-white">PKP</span>
            <span className="font-extrabold text-base tracking-tight text-brand-primary">TV</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-brand-primary/20 text-brand-primary border border-brand-primary/30 uppercase tracking-wider">
              IPTV
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">Raspberry Pi Streaming Station</p>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="flex-1 max-w-xl relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search channels, genres, countries... (Press Cmd+K)"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-10 py-2 bg-surface text-slate-100 placeholder-slate-400 text-sm rounded-xl border border-surface-border focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 text-slate-400 hover:text-white p-0.5 rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Right Action Tools (Swagger API, Custom M3U, Pi Monitor, Sync) */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Swagger API Docs link */}
        <a
          href="/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface hover:bg-surface-hover text-slate-200 text-xs font-semibold border border-surface-border transition-all"
          title="Interactive OpenAPI / Swagger Documentation"
        >
          <FileCode2 className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Swagger API</span>
        </a>

        {/* Custom M3U loader */}
        <button
          onClick={onOpenCustomM3U}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface hover:bg-surface-hover text-slate-200 text-xs font-semibold border border-surface-border transition-all"
          title="Add external M3U playlist URL or file"
        >
          <PlusCircle className="w-3.5 h-3.5 text-brand-primary" />
          <span className="hidden sm:inline">Add M3U</span>
        </button>

        {/* Pi System Monitor Pill */}
        <button
          onClick={onOpenStats}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-hover border border-surface-border text-xs transition-all"
          title="View Raspberry Pi System Metrics"
        >
          <Cpu className="w-4 h-4 text-emerald-400" />
          <div className="flex items-center gap-1.5 font-medium">
            <span className="text-slate-300">
              CPU: {cpuPercent !== undefined ? `${Math.round(cpuPercent)}%` : '--'}
            </span>
            {tempCelsius !== undefined && tempCelsius !== null && (
              <>
                <span className="text-slate-600">•</span>
                <span
                  className={
                    tempCelsius > 70
                      ? 'text-rose-400 font-bold'
                      : tempCelsius > 60
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }
                >
                  {tempCelsius}°C
                </span>
              </>
            )}
          </div>
        </button>

        {/* Refresh catalog button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-xl bg-surface hover:bg-surface-hover text-slate-300 hover:text-white border border-surface-border transition-all disabled:opacity-50"
          title="Resync channel directory"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-brand-primary' : ''}`} />
        </button>
      </div>
    </header>
  );
};
