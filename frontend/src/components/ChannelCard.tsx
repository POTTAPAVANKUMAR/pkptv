import React, { useState } from 'react';
import { Play, Star, Tv } from 'lucide-react';
import { Channel } from '../types';

interface ChannelCardProps {
  channel: Channel;
  isSelected: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
  layout?: 'grid' | 'rail';
}

export const ChannelCard: React.FC<ChannelCardProps> = ({
  channel,
  isSelected,
  isFavorite,
  onSelect,
  onToggleFavorite,
  layout = 'grid',
}) => {
  const [imageError, setImageError] = useState(false);

  const containerClasses =
    layout === 'rail'
      ? 'w-48 md:w-56 shrink-0'
      : 'w-full';

  return (
    <div
      onClick={onSelect}
      className={`group relative flex flex-col justify-between p-3 rounded-2xl cursor-pointer select-none tv-card ${containerClasses} ${
        isSelected
          ? 'border-indigo-500 shadow-[0_0_24px_rgba(99,102,241,0.35)] ring-1 ring-indigo-500'
          : ''
      }`}
    >
      {/* 16:9 Thumbnail / Logo Canvas */}
      <div className="relative w-full aspect-video mb-2.5 rounded-xl bg-slate-900/90 flex items-center justify-center p-3 overflow-hidden border border-white/5 group-hover:border-white/15 transition-all">
        {channel.logo && !imageError ? (
          <img
            src={channel.logo}
            alt={channel.name}
            className="w-full h-full object-contain filter group-hover:scale-108 transition-transform duration-300"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-500">
            <Tv className="w-8 h-8 mb-1 opacity-50 text-indigo-400" />
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              {channel.name.slice(0, 4)}
            </span>
          </div>
        )}

        {/* Live Indicator Pill on top-left */}
        <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[9px] font-bold text-white border border-white/10">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-live-dot" />
          <span>LIVE</span>
        </div>

        {/* Quality Pill on top-right */}
        {channel.quality && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-black/70 backdrop-blur-md text-amber-300 border border-white/10">
            {channel.quality}
          </div>
        )}

        {/* Hover Play Button */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-white text-slate-950 flex items-center justify-center shadow-2xl transform scale-80 group-hover:scale-100 transition-transform duration-200">
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </div>
        </div>
      </div>

      {/* Details Row: Name, Flag, Category, Favorite */}
      <div className="flex items-start justify-between gap-2 px-1">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs" title={channel.country_name || channel.country}>
              {channel.country_flag || '🌐'}
            </span>
            <h3 className="text-xs md:text-sm font-bold text-white truncate group-hover:text-indigo-400 transition-colors">
              {channel.name}
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            {channel.categories.length > 0 ? channel.categories.join(', ') : 'Live Stream'}
          </p>
        </div>

        {/* Favorite Button */}
        <button
          onClick={onToggleFavorite}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          className={`p-1.5 rounded-xl transition-all shrink-0 ${
            isFavorite
              ? 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/20'
              : 'text-slate-500 hover:text-slate-300 hover:bg-white/10'
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-amber-400' : ''}`} />
        </button>
      </div>
    </div>
  );
};
