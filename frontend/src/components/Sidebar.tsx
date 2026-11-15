import React from 'react';
import {
  Compass,
  Star,
  Clock,
  Globe,
  Radio,
  Flame,
  Newspaper,
  Trophy,
  Music,
  Film,
  Smile,
  GraduationCap,
} from 'lucide-react';
import { Category, Country } from '../types';

interface SidebarProps {
  selectedCategory: string;
  onSelectCategory: (catId: string) => void;
  selectedCountry: string;
  onSelectCountry: (code: string) => void;
  categories: Category[];
  countries: Country[];
  viewMode: 'all' | 'favorites' | 'recents';
  onChangeViewMode: (mode: 'all' | 'favorites' | 'recents') => void;
  favoritesCount: number;
  recentsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  selectedCategory,
  onSelectCategory,
  selectedCountry,
  onSelectCountry,
  categories,
  countries,
  viewMode,
  onChangeViewMode,
  favoritesCount,
  recentsCount,
}) => {
  const getCategoryIcon = (id: string) => {
    switch (id.toLowerCase()) {
      case 'news':
        return <Newspaper className="w-4 h-4" />;
      case 'sports':
        return <Trophy className="w-4 h-4" />;
      case 'music':
        return <Music className="w-4 h-4" />;
      case 'movies':
      case 'film':
        return <Film className="w-4 h-4" />;
      case 'kids':
      case 'animation':
        return <Smile className="w-4 h-4" />;
      case 'documentary':
      case 'education':
        return <GraduationCap className="w-4 h-4" />;
      default:
        return <Flame className="w-4 h-4" />;
    }
  };

  // Top popular countries quick-picker
  const popularCountryCodes = ['US', 'IN', 'GB', 'CA', 'AU', 'DE', 'FR'];

  return (
    <aside className="w-64 shrink-0 flex flex-col h-[calc(100vh-65px)] overflow-y-auto px-4 py-5 border-r border-surface-border bg-background/50">
      {/* Primary Navigation Views */}
      <div className="space-y-1 mb-6">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2 block">
          Library
        </span>
        <button
          onClick={() => onChangeViewMode('all')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
            viewMode === 'all'
              ? 'bg-brand-primary text-white shadow-glow-primary'
              : 'text-slate-300 hover:bg-surface-hover hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Compass className="w-4 h-4" />
            <span>Discover All</span>
          </div>
        </button>

        <button
          onClick={() => onChangeViewMode('favorites')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
            viewMode === 'favorites'
              ? 'bg-brand-primary text-white shadow-glow-primary'
              : 'text-slate-300 hover:bg-surface-hover hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Star className="w-4 h-4 text-amber-400" />
            <span>Favorites</span>
          </div>
          {favoritesCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface text-slate-300">
              {favoritesCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onChangeViewMode('recents')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
            viewMode === 'recents'
              ? 'bg-brand-primary text-white shadow-glow-primary'
              : 'text-slate-300 hover:bg-surface-hover hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Recently Played</span>
          </div>
          {recentsCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface text-slate-300">
              {recentsCount}
            </span>
          )}
        </button>
      </div>

      {/* Country Filter Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between px-3 mb-2.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Country / Region
          </span>
          <Globe className="w-3.5 h-3.5 text-slate-500" />
        </div>

        {/* Quick country pills */}
        <div className="flex flex-wrap gap-1.5 px-1 mb-2">
          <button
            onClick={() => onSelectCountry('all')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
              selectedCountry === 'all'
                ? 'bg-slate-200 text-slate-900 font-bold'
                : 'bg-surface text-slate-400 hover:text-white hover:bg-surface-hover'
            }`}
          >
            All 🌐
          </button>
          {popularCountryCodes.map((code) => {
            const c = countries.find((item) => item.code === code);
            if (!c) return null;
            return (
              <button
                key={code}
                onClick={() => onSelectCountry(code)}
                className={`px-2 py-1 text-xs rounded-lg font-medium transition-all flex items-center gap-1 ${
                  selectedCountry === code
                    ? 'bg-brand-primary text-white font-bold'
                    : 'bg-surface text-slate-400 hover:text-white hover:bg-surface-hover'
                }`}
                title={c.name}
              >
                <span>{c.flag}</span>
                <span>{c.code}</span>
              </button>
            );
          })}
        </div>

        {/* Full Country Select Dropdown */}
        <div className="px-1">
          <select
            value={selectedCountry}
            onChange={(e) => onSelectCountry(e.target.value)}
            className="w-full bg-surface border border-surface-border text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-brand-primary cursor-pointer"
          >
            <option value="all">All Countries ({countries.length})</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name} ({c.count})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Categories List */}
      <div className="flex-1">
        <div className="flex items-center justify-between px-3 mb-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Categories ({categories.length})
          </span>
          <Radio className="w-3.5 h-3.5 text-slate-500" />
        </div>

        <div className="space-y-1">
          <button
            onClick={() => onSelectCategory('all')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              selectedCategory === 'all'
                ? 'bg-surface-hover text-brand-primary font-bold border-l-2 border-brand-primary'
                : 'text-slate-400 hover:bg-surface hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Compass className="w-3.5 h-3.5" />
              <span>All Categories</span>
            </div>
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                selectedCategory === cat.id
                  ? 'bg-surface-hover text-brand-primary font-bold border-l-2 border-brand-primary'
                  : 'text-slate-400 hover:bg-surface hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                {getCategoryIcon(cat.id)}
                <span className="truncate">{cat.name}</span>
              </div>
              <span className="text-[10px] text-slate-500 ml-1">{cat.count}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};
