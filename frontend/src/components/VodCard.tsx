import React from 'react';
import { Play, Star, Bookmark } from 'lucide-react';
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
  return (
    <div
      onClick={onPlay}
      className="group relative flex flex-col shrink-0 w-44 md:w-52 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-2 select-none"
    >
      {/* 2:3 Aspect Ratio Poster */}
      <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-slate-900 border border-white/10 group-hover:border-indigo-500/50 group-hover:shadow-[0_12px_32px_rgba(99,102,241,0.25)] transition-all">
        <img
          src={item.poster}
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Top Badges: Provider & Rating */}
        <div className="absolute top-2 inset-x-2 flex items-center justify-between z-10">
          {item.provider && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/60 backdrop-blur-md text-white border border-white/15">
              {item.provider}
            </span>
          )}
          {item.rating && (
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-black/70 backdrop-blur-md text-amber-300 flex items-center gap-0.5 border border-white/10">
              <Star className="w-2.5 h-2.5 fill-amber-400" />
              {item.rating}
            </span>
          )}
        </div>

        {/* Watchlist Bookmark Icon */}
        <button
          onClick={onToggleWatchlist}
          title={isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
          className={`absolute bottom-2 right-2 p-1.5 rounded-xl backdrop-blur-md transition-all z-10 ${
            isWatchlisted
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'bg-black/50 text-white hover:bg-black/80'
          }`}
        >
          <Bookmark className={`w-3.5 h-3.5 ${isWatchlisted ? 'fill-current' : ''}`} />
        </button>

        {/* Hover Play Button */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white text-slate-950 flex items-center justify-center shadow-xl transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>
      </div>

      {/* Title & Metadata */}
      <div className="pt-2 px-1">
        <h3 className="text-sm font-bold text-white truncate group-hover:text-indigo-400 transition-colors">
          {item.title}
        </h3>
        <p className="text-xs text-slate-400 truncate mt-0.5">
          {item.year} • {item.genres.slice(0, 2).join(', ')}
        </p>
      </div>
    </div>
  );
};
