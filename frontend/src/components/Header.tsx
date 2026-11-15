import React, { useRef, useEffect } from 'react';
import {
  Search,
  X,
  Cpu,
  PlusCircle,
  RefreshCw,
  Tv,
  FileCode2,
  Sparkles,
  Film,
  Radio,
  Bookmark,
  Compass,
} from 'lucide-react';
import { SystemStats } from '../types';

export type ActiveTab = 'foryou' | 'live' | 'movies' | 'shows' | 'apps' | 'watchlist';

interface HeaderProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  selectedCountry: string;
  onSelectCountry: (country: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  systemStats: SystemStats | null;
  onOpenStats: () => void;
  onOpenCustomM3U: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  watchlistCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onChangeTab,
  selectedCountry,
  onSelectCountry,
  searchQuery,
  onSearchChange,
  systemStats,
  onOpenStats,
  onOpenCustomM3U,
  onRefresh,
  isRefreshing,
  watchlistCount,
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

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'foryou', label: 'For You', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'live', label: 'Live TV', icon: <Radio className="w-3.5 h-3.5" /> },
    { id: 'movies', label: 'Movies', icon: <Film className="w-3.5 h-3.5" /> },
    { id: 'shows', label: 'Shows', icon: <Tv className="w-3.5 h-3.5" /> },
    { id: 'apps', label: 'Apps & Hub', icon: <Compass className="w-3.5 h-3.5" /> },
    {
      id: 'watchlist',
      label: `Watchlist${watchlistCount > 0 ? ` (${watchlistCount})` : ''}`,
      icon: <Bookmark className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-header px-4 lg:px-8 py-3 flex flex-col gap-3">
      {/* Top Row: Brand, Search, Tools */}
      <div className="flex items-center justify-between gap-4">
        {/* Brand Logo (Google TV style) */}
        <div
          onClick={() => onChangeTab('foryou')}
          className="flex items-center gap-3 shrink-0 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.5)] group-hover:scale-105 transition-transform">
            <Tv className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-lg tracking-tight text-white">PKP</span>
              <span className="font-black text-lg tracking-tight text-indigo-400">TV</span>
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-live-dot ml-0.5" />
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Google TV Experience</p>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-lg relative hidden md:block">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search live channels, movies, shows... (Cmd+K)"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-10 py-2 bg-slate-900/90 text-slate-100 placeholder-slate-400 text-xs rounded-2xl border border-white/10 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 text-slate-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right Tools (Swagger, M3U, Pi Monitor, Refresh) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Swagger API link */}
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10 transition-all"
            title="Open Swagger API documentation"
          >
            <FileCode2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden lg:inline">API Docs</span>
          </a>

          {/* Add custom M3U */}
          <button
            onClick={onOpenCustomM3U}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10 transition-all"
            title="Import external M3U playlist"
          >
            <PlusCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden lg:inline">+ M3U</span>
          </button>

          {/* Pi System Monitor Pill */}
          <button
            onClick={onOpenStats}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium transition-all"
            title="View Raspberry Pi System Status"
          >
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-300 hidden sm:inline">
              {cpuPercent !== undefined ? `${Math.round(cpuPercent)}%` : '--'}
            </span>
            {tempCelsius !== undefined && tempCelsius !== null && (
              <span
                className={`font-bold ${
                  tempCelsius > 70
                    ? 'text-rose-400'
                    : tempCelsius > 60
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {tempCelsius}°C
              </span>
            )}
          </button>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all disabled:opacity-50"
            title="Resync live channels"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Bottom Row: Google TV Nav Tabs + Pinned Countries (India & US starred) */}
      <div className="flex items-center justify-between gap-3 overflow-x-auto no-scrollbar pt-1 border-t border-white/5">
        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onChangeTab(item.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === item.id
                  ? 'bg-white text-slate-950 shadow-md scale-105'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Pinned Countries: India 🇮🇳 & United States 🇺🇸 */}
        <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-white/10">
          <button
            onClick={() => onSelectCountry('IN')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border ${
              selectedCountry === 'IN'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
            }`}
          >
            <span>🇮🇳</span>
            <span>India</span>
            <span className="text-[10px] text-amber-400">★</span>
          </button>

          <button
            onClick={() => onSelectCountry('US')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border ${
              selectedCountry === 'US'
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
            }`}
          >
            <span>🇺🇸</span>
            <span>United States</span>
            <span className="text-[10px] text-indigo-400">★</span>
          </button>

          <button
            onClick={() => onSelectCountry('all')}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
              selectedCountry === 'all'
                ? 'bg-slate-200 text-slate-950 font-bold'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            🌐 All
          </button>
        </div>
      </div>
    </header>
  );
};
