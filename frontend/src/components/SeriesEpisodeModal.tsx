import React, { useEffect, useState, useMemo } from 'react';
import {
  X,
  Play,
  Tv,
  Star,
  Calendar,
  Clock,
  Search,
  Film,
  Layers,
  AlertCircle,
} from 'lucide-react';
import { XtreamAccount, XtreamEpisode, XtreamSeriesInfo, XtreamSeriesItem } from '../types';
import { api } from '../services/api';

interface SeriesEpisodeModalProps {
  series: XtreamSeriesItem | null;
  xtreamAccount: XtreamAccount | null;
  isOpen: boolean;
  onClose: () => void;
  onPlayEpisode: (episode: XtreamEpisode, series: XtreamSeriesItem) => void;
}

export const SeriesEpisodeModal: React.FC<SeriesEpisodeModalProps> = ({
  series,
  xtreamAccount,
  isOpen,
  onClose,
  onPlayEpisode,
}) => {
  const [seriesInfo, setSeriesInfo] = useState<XtreamSeriesInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [episodeSearch, setEpisodeSearch] = useState<string>('');

  useEffect(() => {
    if (!isOpen || !series || !xtreamAccount) {
      setSeriesInfo(null);
      setSelectedSeason('');
      setError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    api
      .getXtreamSeriesInfo(
        xtreamAccount.server,
        xtreamAccount.username,
        xtreamAccount.password,
        series.series_id
      )
      .then((data) => {
        if (!isMounted) return;
        if (!data || !data.episodes) {
          setError('No episodes found for this series.');
          return;
        }
        setSeriesInfo(data);

        // Sort season numbers numerically descending (latest season first)
        const seasonKeys = Object.keys(data.episodes).sort((a, b) => {
          const numA = parseInt(a, 10);
          const numB = parseInt(b, 10);
          if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
          return b.localeCompare(a);
        });

        if (seasonKeys.length > 0) {
          setSelectedSeason(seasonKeys[0]);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Failed to load series details.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, series, xtreamAccount]);

  const seasonsList = useMemo(() => {
    if (!seriesInfo?.episodes) return [];
    return Object.keys(seriesInfo.episodes).sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
      return b.localeCompare(a);
    });
  }, [seriesInfo]);

  const currentEpisodes = useMemo(() => {
    if (!seriesInfo?.episodes || !selectedSeason) return [];
    const list = seriesInfo.episodes[selectedSeason] || [];
    if (!episodeSearch.trim()) return list;

    const q = episodeSearch.toLowerCase();
    return list.filter(
      (ep) =>
        ep.title.toLowerCase().includes(q) ||
        String(ep.episode_num).includes(q) ||
        (ep.info?.plot && ep.info.plot.toLowerCase().includes(q))
    );
  }, [seriesInfo, selectedSeason, episodeSearch]);

  if (!isOpen || !series) return null;

  const info = seriesInfo?.info || {};
  const coverImg = series.poster || info.cover || series.backdrop;
  const rating = series.rating || (info.rating ? `★ ${info.rating}` : null);
  const releaseDate = series.year || info.releaseDate || info.year;
  const genre = series.genre || info.genre;
  const plot = series.plot || info.plot;
  const cast = series.cast || info.cast;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center border border-white/20 transition-all hover:scale-105"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Banner Header */}
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent">
          {coverImg && (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-25 blur-md scale-110"
              style={{ backgroundImage: `url(${coverImg})` }}
            />
          )}
          <div className="relative z-10 p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 border-b border-white/10 bg-gradient-to-b from-transparent to-slate-900/90">
            {/* Poster Thumbnail */}
            <div className="w-28 sm:w-36 aspect-[2/3] shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-slate-800">
              {coverImg ? (
                <img
                  src={coverImg}
                  alt={series.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500">
                  <Tv className="w-10 h-10" />
                </div>
              )}
            </div>

            {/* Series Metadata */}
            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                  <Tv className="w-3 h-3" /> TV Series
                </span>
                {rating && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" /> {rating}
                  </span>
                )}
                {releaseDate && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/5 text-slate-300 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {releaseDate}
                  </span>
                )}
                {genre && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/5 text-slate-300">
                    {genre}
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {series.title || series.name}
              </h2>

              {plot && (
                <p className="text-xs sm:text-sm text-slate-300 line-clamp-3 max-w-3xl leading-relaxed">
                  {plot}
                </p>
              )}

              {cast && (
                <p className="text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">Starring:</span> {cast}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Season Selector Tabs & Episode Search Bar */}
        <div className="px-6 py-4 bg-slate-950/70 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Season Chips */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1.5 mr-1">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Seasons:
            </span>
            {seasonsList.map((sNum) => {
              const epCount = seriesInfo?.episodes?.[sNum]?.length || 0;
              const isSelected = selectedSeason === sNum;
              return (
                <button
                  key={sNum}
                  onClick={() => setSelectedSeason(sNum)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/30'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  Season {sNum} {epCount > 0 && `(${epCount})`}
                </button>
              );
            })}
          </div>

          {/* Episode Quick Filter */}
          <div className="relative shrink-0 w-full md:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={episodeSearch}
              onChange={(e) => setEpisodeSearch(e.target.value)}
              placeholder="Search episodes..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Episodes Scrollable List / Grid */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {isLoading && (
            <div className="text-center py-16 space-y-3">
              <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-300">
                Fetching episodes and stream links...
              </p>
            </div>
          )}

          {error && !isLoading && (
            <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="text-sm font-semibold">{error}</span>
            </div>
          )}

          {!isLoading && !error && currentEpisodes.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <Film className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No episodes found for the selected season or filter.</p>
            </div>
          )}

          {!isLoading && !error && currentEpisodes.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {currentEpisodes.map((ep) => {
                const epImg = ep.info?.movie_image || coverImg;
                const duration = ep.info?.duration || (ep.info?.duration_secs ? `${Math.round(ep.info.duration_secs / 60)}m` : null);

                return (
                  <div
                    key={ep.id}
                    onClick={() => {
                      onPlayEpisode(ep, series);
                      onClose();
                    }}
                    className="group relative bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-indigo-500/50 rounded-2xl p-3.5 transition-all cursor-pointer flex gap-3.5 items-center hover:scale-[1.01]"
                  >
                    {/* Thumbnail / Play Overlay */}
                    <div className="w-20 sm:w-24 aspect-video rounded-xl bg-slate-800 overflow-hidden relative shrink-0 border border-white/10">
                      {epImg ? (
                        <img
                          src={epImg}
                          alt={ep.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <Tv className="w-6 h-6" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-indigo-600/40 flex items-center justify-center transition-colors">
                        <div className="w-8 h-8 rounded-full bg-white/90 text-slate-950 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>

                    {/* Episode Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          EP {ep.episode_num}
                        </span>
                        {duration && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {duration}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                        {ep.title}
                      </h4>

                      {ep.info?.plot && (
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {ep.info.plot}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
