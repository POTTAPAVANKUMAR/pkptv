import React, { useState, useEffect } from 'react';
import { Play, Plus, Check, Star, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { VodItem } from '../types';

interface BillboardHeroProps {
  items: VodItem[];
  onPlay: (item: VodItem) => void;
  watchlist: string[];
  onToggleWatchlist: (id: string) => void;
}

export const BillboardHero: React.FC<BillboardHeroProps> = ({
  items,
  onPlay,
  watchlist,
  onToggleWatchlist,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 9000);
    return () => clearInterval(timer);
  }, [items.length]);

  if (!items || items.length === 0) return null;
  const current = items[currentIndex];
  const inWatchlist = watchlist.includes(current.id);

  return (
    <div className="relative w-full h-[460px] lg:h-[520px] rounded-3xl overflow-hidden mb-10 shadow-2xl border border-white/10 group">
      {/* Background Backdrop Image */}
      <img
        src={current.backdrop || current.poster}
        alt={current.title}
        className="absolute inset-0 w-full h-full object-cover object-center filter brightness-90 transform scale-100 transition-all duration-1000 ease-out"
      />

      {/* Cinematic Gradient Fade Overlays */}
      <div className="absolute inset-0 billboard-mask" />

      {/* Content Container */}
      <div className="absolute inset-0 p-6 md:p-12 lg:p-16 flex flex-col justify-end max-w-2xl z-10">
        {/* Badges Row */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {current.provider && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md text-white border border-white/20 flex items-center gap-1.5">
              <span>{current.provider_logo || '🎬'}</span>
              <span>{current.provider}</span>
            </span>
          )}
          {current.quality && (
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {current.quality}
            </span>
          )}
          {current.rating && (
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <Star className="w-3 h-3 fill-emerald-400" />
              {current.rating}
            </span>
          )}
          {current.year && (
            <span className="text-xs text-slate-300 font-medium">
              {current.year} • {current.duration || current.seasons}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-3 drop-shadow-md">
          {current.title}
        </h1>

        {/* Genres */}
        <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
          {current.genres.join(' • ')}
        </p>

        {/* Description */}
        <p className="text-sm md:text-base text-slate-300 line-clamp-2 md:line-clamp-3 mb-6 leading-relaxed max-w-xl">
          {current.description}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => onPlay(current)}
            className="px-6 py-3 rounded-2xl bg-white text-slate-950 hover:bg-slate-200 font-extrabold text-sm flex items-center gap-2 shadow-2xl hover:scale-105 active:scale-95 transition-all"
          >
            <Play className="w-4 h-4 fill-current" />
            Watch Now
          </button>

          <button
            onClick={() => onToggleWatchlist(current.id)}
            className={`px-4 py-3 rounded-2xl text-sm font-semibold flex items-center gap-2 backdrop-blur-md border transition-all ${
              inWatchlist
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-white/10 text-white border-white/15 hover:bg-white/20'
            }`}
          >
            {inWatchlist ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {inWatchlist ? 'In Watchlist' : 'Watchlist'}
          </button>

          {current.provider_url && (
            <a
              href={current.provider_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-3 rounded-2xl text-xs font-semibold bg-white/5 hover:bg-white/15 text-slate-300 border border-white/10 flex items-center gap-1.5 transition-all"
            >
              <span>Open on {current.provider}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={() => setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1))}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity z-20"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        onClick={() => setCurrentIndex((prev) => (prev + 1) % items.length)}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity z-20"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Carousel Dots */}
      <div className="absolute bottom-5 right-6 md:right-12 flex items-center gap-2 z-20">
        {items.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx === currentIndex ? 'w-8 bg-white' : 'w-2 bg-white/30 hover:bg-white/60'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
