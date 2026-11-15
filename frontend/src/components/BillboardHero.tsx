import React, { useState, useEffect } from 'react';
import { Play, Star, ChevronLeft, ChevronRight, Tv } from 'lucide-react';
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
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
      setImgError(false);
    }, 8000);
    return () => clearInterval(timer);
  }, [items.length]);

  if (!items || items.length === 0) return null;
  const current = items[currentIndex];
  const isFavorite = watchlist.includes(current.id);

  return (
    <div className="relative w-full rounded-3xl overflow-hidden mb-10 border border-white/10 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/60 shadow-2xl group min-h-[380px] md:min-h-[440px] flex items-center">
      {/* Ambient Lighting Orbs */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Flex Grid */}
      <div className="relative z-10 w-full p-6 md:p-12 lg:p-14 flex flex-col md:flex-row items-center justify-between gap-8">
        {/* Left Column: Metadata & Controls */}
        <div className="flex-1 max-w-2xl">
          {/* Top Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {/* Live Indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-black tracking-wider">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-live-dot" />
              <span>LIVE NOW</span>
            </div>

            {/* Country Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold border border-white/15 backdrop-blur-md">
              <span>{current.country_flag || '🌐'}</span>
              <span>{current.country_name || current.country}</span>
            </div>

            {/* Quality Tag */}
            {current.quality && (
              <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {current.quality}
              </span>
            )}

            {/* Genres Tag */}
            {current.genres && current.genres.length > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/5 text-slate-300 border border-white/10">
                {current.genres.join(' • ')}
              </span>
            )}
          </div>

          {/* Channel Title */}
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-3 drop-shadow-md">
            {current.title}
          </h1>

          {/* Broadcast Description */}
          <p className="text-sm md:text-base text-slate-300 line-clamp-2 md:line-clamp-3 mb-8 leading-relaxed max-w-xl">
            {current.description ||
              `Watch continuous 24/7 high-definition live streaming on ${current.title}. Direct HLS playback.`}
          </p>

          {/* Play & Favorite Action Buttons */}
          <div className="flex items-center gap-3.5 flex-wrap">
            <button
              onClick={() => onPlay(current)}
              className="px-6 py-3.5 rounded-2xl bg-white text-slate-950 hover:bg-slate-200 font-black text-sm flex items-center gap-2.5 shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              Watch Live Stream
            </button>

            <button
              onClick={() => onToggleWatchlist(current.id)}
              className={`px-5 py-3.5 rounded-2xl text-sm font-bold flex items-center gap-2 backdrop-blur-md border transition-all ${
                isFavorite
                  ? 'bg-amber-500/25 text-amber-300 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                  : 'bg-white/10 text-white border-white/15 hover:bg-white/20'
              }`}
            >
              <Star className={`w-4 h-4 ${isFavorite ? 'fill-current text-amber-400' : ''}`} />
              {isFavorite ? 'Starred Channel' : 'Add to Favorites'}
            </button>
          </div>
        </div>

        {/* Right Column: High-Res Broadcaster Logo Showcase Card */}
        <div className="shrink-0 flex items-center justify-center">
          <div
            onClick={() => onPlay(current)}
            className="w-56 h-36 md:w-80 md:h-52 rounded-2xl bg-slate-950/80 border border-white/15 p-6 flex flex-col items-center justify-center shadow-2xl backdrop-blur-xl group/card cursor-pointer hover:border-indigo-500/60 hover:shadow-[0_0_40px_rgba(99,102,241,0.3)] transition-all duration-300"
          >
            {current.poster && !imgError ? (
              <img
                src={current.poster}
                alt={current.title}
                onError={() => setImgError(true)}
                className="max-h-full max-w-full object-contain filter group-hover/card:scale-110 transition-transform duration-300 drop-shadow-xl"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400">
                <Tv className="w-16 h-16 text-indigo-400 mb-2 opacity-80" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  {current.title}
                </span>
              </div>
            )}
            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-slate-400 group-hover/card:text-indigo-300 transition-colors">
              <Play className="w-3 h-3 fill-current text-indigo-400" />
              <span>Click to Stream</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={() => {
          setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
          setImgError(false);
        }}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity z-20 border border-white/10"
        title="Previous spotlight channel"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        onClick={() => {
          setCurrentIndex((prev) => (prev + 1) % items.length);
          setImgError(false);
        }}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity z-20 border border-white/10"
        title="Next spotlight channel"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Carousel Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
        {items.map((_, idx) => (
          <button
            key={idx}
            onClick={() => {
              setCurrentIndex(idx);
              setImgError(false);
            }}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx === currentIndex ? 'w-8 bg-white' : 'w-2 bg-white/30 hover:bg-white/60'
            }`}
            title={`Slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
