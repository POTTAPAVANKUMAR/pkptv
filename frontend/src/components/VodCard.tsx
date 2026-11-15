import React, { useState } from 'react';
import { Play, Star, Tv } from 'lucide-react';
import { VodItem } from '../types';

interface VodCardProps {
  item: VodItem;
  onPlay: () => void;
  isWatchlisted: boolean;
  onToggleWatchlist: (e: React.MouseEvent) => void;
}

export const VodCard: React.FC<VodCardProps> = ({
  item,
  onPlay,
  isWatchlisted,
  onToggleWatchlist,
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={onPlay}
      className="group relative flex flex-col shrink-0 w-48 md:w-56 rounded-2xl p-3 bg-slate-900/80 border border-white/10 hover:border-indigo-500/50 hover:shadow-[0_0_24px_rgba(99,102,241,0.3)] transition-all duration-300 cursor-pointer select-none"
    >
      {/* 16:9 Aspect Ratio Display */}
      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center p-3 border border-white/5 mb-2.5">
        {item.poster && !imgError ? (
          <img
            src={item.poster}
            alt={item.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-contain filter group-hover:scale-110 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-500">
            <Tv className="w-8 h-8 mb-1 text-indigo-400 opacity-60" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {item.title.slice(0, 4)}
            </span>
          </div>
        )}

        {/* Live Indicator Pill on top-left */}
        <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[9px] font-black text-white border border-white/10">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-live-dot" />
          <span>LIVE</span>
        </div>

        {/* Quality Pill on top-right */}
        {item.quality && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-black/75 backdrop-blur-md text-amber-300 border border-white/10">
            {item.quality}
          </div>
        )}

        {/* Hover Play Button Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-white text-slate-950 flex items-center justify-center shadow-2xl transform scale-75 group-hover:scale-100 transition-transform duration-200">
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </div>
        </div>
      </div>

      {/* Details Row */}
      <div className="flex items-start justify-between gap-2 px-1">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs" title={item.country || 'Live'}>
              {item.country === 'IN' ? '🇮🇳' : item.country === 'US' ? '🇺🇸' : '🌐'}
            </span>
            <h3 className="text-xs md:text-sm font-bold text-white truncate group-hover:text-indigo-400 transition-colors">
              {item.title}
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            {item.genres && item.genres.length > 0 ? item.genres.join(', ') : 'Live Channel'}
          </p>
        </div>

        {/* Favorite Bookmark */}
        <button
          onClick={onToggleWatchlist}
          title={isWatchlisted ? 'Remove from favorites' : 'Add to favorites'}
          className={`p-1.5 rounded-xl transition-all shrink-0 ${
            isWatchlisted
              ? 'text-amber-400 bg-amber-400/15 hover:bg-amber-400/25'
              : 'text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${isWatchlisted ? 'fill-current text-amber-400' : ''}`} />
        </button>
      </div>
    </div>
  );
};
