import React, { useState } from 'react';
import { Play, Star, Tv } from 'lucide-react';
import { Channel } from '../types';

interface ChannelCardProps {
  channel: Channel;
  isSelected: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
}

export const ChannelCard: React.FC<ChannelCardProps> = ({
  channel,
  isSelected,
  isFavorite,
  onSelect,
  onToggleFavorite,
}) => {
  const [imageError, setImageError] = useState(false);

  return (
    <div
      onClick={onSelect}
      className={`group relative flex flex-col justify-between p-3.5 rounded-xl transition-all duration-200 cursor-pointer border ${
        isSelected
          ? 'bg-brand-primary/10 border-brand-primary shadow-glow-primary'
          : 'bg-surface-card hover:bg-surface-hover border-surface-border hover:border-slate-700 hover:shadow-lg'
      }`}
    >
      {/* Top row: Country flag, Quality tag, Favorite Star */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm" title={channel.country_name || channel.country}>
            {channel.country_flag || '🌐'}
          </span>
          {channel.quality && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {channel.quality}
            </span>
          )}
        </div>

        <button
          onClick={onToggleFavorite}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          className={`p-1.5 rounded-md transition-all ${
            isFavorite
              ? 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/20'
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-400' : ''}`} />
        </button>
      </div>

      {/* Channel Logo / Icon Container */}
      <div className="relative w-full h-24 mb-3 rounded-lg bg-surface flex items-center justify-center p-2 overflow-hidden border border-surface-border">
        {channel.logo && !imageError ? (
          <img
            src={channel.logo}
            alt={channel.name}
            className="w-full h-full object-contain filter group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-500">
            <Tv className="w-8 h-8 mb-1 opacity-40" />
            <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
              {channel.name.slice(0, 3)}
            </span>
          </div>
        )}

        {/* Play Overlay Button on hover */}
        <div className="absolute inset-0 bg-brand-primary/20 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>
      </div>

      {/* Channel Title & Categories */}
      <div>
        <h3 className="text-sm font-semibold text-slate-100 truncate group-hover:text-brand-primary transition-colors">
          {channel.name}
        </h3>
        <p className="text-xs text-slate-400 truncate mt-0.5">
          {channel.categories.length > 0 ? channel.categories.join(', ') : 'Live Stream'}
        </p>
      </div>
    </div>
  );
};
