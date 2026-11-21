import React, { useState } from 'react';
import { Play, Star, Tv, Layers } from 'lucide-react';
import { XtreamSeriesItem } from '../types';

interface SeriesCardProps {
  series: XtreamSeriesItem;
  onSelect: () => void;
}

export const SeriesCard: React.FC<SeriesCardProps> = ({ series, onSelect }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={onSelect}
      className="group relative flex flex-col rounded-2xl p-3 bg-slate-900/80 border border-white/10 hover:border-indigo-500/50 hover:shadow-[0_0_24px_rgba(99,102,241,0.3)] transition-all duration-300 cursor-pointer select-none"
    >
      {/* Poster Aspect Ratio [2/3] */}
      <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center border border-white/5 mb-2.5">
        {series.poster && !imgError ? (
          <img
            src={series.poster}
            alt={series.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-4 text-center text-slate-500">
            <Tv className="w-10 h-10 mb-2 text-indigo-400 opacity-60" />
            <span className="text-xs font-bold text-slate-300 line-clamp-2">
              {series.title}
            </span>
          </div>
        )}

        {/* Top-left Indicator Pill */}
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[10px] font-bold text-indigo-300 border border-white/10">
          <Layers className="w-3 h-3" />
          <span>SERIES</span>
        </div>

        {/* Top-right Rating Pill */}
        {series.rating && series.rating !== 'TV Series' && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/75 backdrop-blur-md text-amber-300 border border-white/10 flex items-center gap-1">
            <Star className="w-3 h-3 fill-current" />
            <span>{series.rating.replace('★', '').trim()}</span>
          </div>
        )}

        {/* Hover View Episodes Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-end p-4">
          <div className="w-full py-2 px-3 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-transform">
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>View Episodes</span>
          </div>
        </div>
      </div>

      {/* Details Row */}
      <div className="flex flex-col px-1">
        <h3 className="text-xs md:text-sm font-bold text-white truncate group-hover:text-indigo-400 transition-colors">
          {series.title || series.name}
        </h3>
        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-0.5">
          <span>{series.genre || 'Entertainment'}</span>
          {series.year && <span>{series.year}</span>}
        </div>
      </div>
    </div>
  );
};
