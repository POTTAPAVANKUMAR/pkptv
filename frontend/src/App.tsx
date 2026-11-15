import React, { useState, useEffect, useCallback } from 'react';
import { Header, ActiveTab } from './components/Header';
import { BillboardHero } from './components/BillboardHero';
import { HorizontalRail } from './components/HorizontalRail';
import { VodCard } from './components/VodCard';
import { ProviderBar } from './components/ProviderBar';
import { ChannelCard } from './components/ChannelCard';
import { Player } from './components/Player';
import { SystemStatsModal } from './components/SystemStatsModal';
import { CustomPlaylistModal } from './components/CustomPlaylistModal';
import { api } from './services/api';
import { Category, Channel, Country, SystemStats, VodItem, StreamingProvider } from './types';
import {
  Tv,
  Sparkles,
  RefreshCw,
  Film,
  Radio,
  Bookmark,
  Compass,
} from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('foryou');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [totalChannels, setTotalChannels] = useState<number>(0);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('IN'); // Starred India by default
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [categories, setCategories] = useState<Category[]>([]);
  const [, setCountries] = useState<Country[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);

  // VOD Datasets
  const [featuredItems, setFeaturedItems] = useState<VodItem[]>([]);
  const [movies, setMovies] = useState<VodItem[]>([]);
  const [shows, setShows] = useState<VodItem[]>([]);
  const [providers, setProviders] = useState<StreamingProvider[]>([]);

  // Subsets for Google TV Rails
  const [indiaChannels, setIndiaChannels] = useState<Channel[]>([]);
  const [usChannels, setUsChannels] = useState<Channel[]>([]);
  const [newsChannels, setNewsChannels] = useState<Channel[]>([]);
  const [sportsChannels, setSportsChannels] = useState<Channel[]>([]);
  const [musicChannels, setMusicChannels] = useState<Channel[]>([]);
  const [movieChannels, setMovieChannels] = useState<Channel[]>([]);

  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);
  const [isCustomM3UOpen, setIsCustomM3UOpen] = useState<boolean>(false);
  const [customPlaylist, setCustomPlaylist] = useState<{ name: string; channels: Channel[] } | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [offset, setOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);

  // Favorites & Watchlist stored in localStorage
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('pkp_tv_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('pkp_tv_watchlist');
      return saved ? JSON.parse(saved) : ['m-1', 'bb-1'];
    } catch {
      return ['m-1', 'bb-1'];
    }
  });

  const [recents, setRecents] = useState<Channel[]>(() => {
    try {
      const saved = localStorage.getItem('pkp_tv_recents');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('pkp_tv_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('pkp_tv_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem('pkp_tv_recents', JSON.stringify(recents));
  }, [recents]);

  // Initial Data & Telemetry Fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [cats, counts, stats, feat, mov, shw, prov] = await Promise.all([
          api.getCategories().catch(() => []),
          api.getCountries().catch(() => []),
          api.getSystemStats().catch(() => null),
          api.getFeatured().catch(() => []),
          api.getMovies().catch(() => []),
          api.getShows().catch(() => []),
          api.getProviders().catch(() => []),
        ]);
        setCategories(cats);
        setCountries(counts);
        setSystemStats(stats);
        setFeaturedItems(feat);
        setMovies(mov);
        setShows(shw);
        setProviders(prov);

        // Preload Google TV curated rails
        const [inRes, usRes, newsRes, sportsRes, musicRes, movieRes] = await Promise.all([
          api.getChannels({ country: 'IN', limit: 20 }),
          api.getChannels({ country: 'US', limit: 20 }),
          api.getChannels({ category: 'news', limit: 20 }),
          api.getChannels({ category: 'sports', limit: 20 }),
          api.getChannels({ category: 'music', limit: 20 }),
          api.getChannels({ category: 'movies', limit: 20 }),
        ]);
        setIndiaChannels(inRes.channels);
        setUsChannels(usRes.channels);
        setNewsChannels(newsRes.channels);
        setSportsChannels(sportsRes.channels);
        setMusicChannels(musicRes.channels);
        setMovieChannels(movieRes.channels);
      } catch (err) {
        console.error('Initial data fetch error:', err);
      }
    };
    fetchInitialData();

    // Poll system stats every 15s
    const interval = setInterval(async () => {
      try {
        const stats = await api.getSystemStats();
        setSystemStats(stats);
      } catch {}
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  // Fetch Channels for the Live / Grid View
  const loadChannels = useCallback(
    async (resetOffset = true) => {
      if (customPlaylist) {
        let filtered = customPlaylist.channels;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          filtered = filtered.filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              c.categories.some((cat) => cat.toLowerCase().includes(q))
          );
        }
        setChannels(filtered);
        setTotalChannels(filtered.length);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const currentOffset = resetOffset ? 0 : offset;

      try {
        const res = await api.getChannels({
          q: searchQuery.trim() || undefined,
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          country: selectedCountry !== 'all' ? selectedCountry : undefined,
          limit: 60,
          offset: currentOffset,
        });

        if (resetOffset) {
          setChannels(res.channels);
          setOffset(60);
        } else {
          setChannels((prev) => [...prev, ...res.channels]);
          setOffset((prev) => prev + 60);
        }
        setTotalChannels(res.total);
        setHasMore(res.has_more);
      } catch (err) {
        console.error('Failed to load channels:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [searchQuery, selectedCategory, selectedCountry, customPlaylist, offset]
  );

  useEffect(() => {
    setOffset(0);
    loadChannels(true);
  }, [searchQuery, selectedCategory, selectedCountry, customPlaylist]);

  const toggleFavorite = (channelId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(channelId) ? prev.filter((id) => id !== channelId) : [...prev, channelId]
    );
  };

  const toggleWatchlist = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setWatchlist((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectChannel = (channel: Channel) => {
    setSelectedChannel(channel);
    setRecents((prev) => {
      const filtered = prev.filter((c) => c.id !== channel.id);
      return [channel, ...filtered].slice(0, 30);
    });
    // Smooth scroll to top player
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePlayVod = (vod: VodItem) => {
    const channelAdapter: Channel = {
      id: vod.id,
      name: vod.title,
      logo: vod.poster || vod.backdrop || '',
      country: vod.country || 'IN',
      country_name: vod.country === 'IN' ? 'India' : 'United States',
      country_flag: vod.country === 'IN' ? '🇮🇳' : '🇺🇸',
      categories: vod.genres || ['Movies'],
      stream_url:
        vod.stream_url ||
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      quality: vod.quality || '4K HDR',
    };
    handleSelectChannel(channelAdapter);
  };

  // Next / Previous Channel Switching
  const handleNextChannel = () => {
    const currentList = channels;
    const currentIndex = selectedChannel
      ? currentList.findIndex((c) => c.id === selectedChannel.id)
      : -1;
    if (currentIndex !== -1 && currentIndex < currentList.length - 1) {
      handleSelectChannel(currentList[currentIndex + 1]);
    } else if (currentList.length > 0) {
      handleSelectChannel(currentList[0]);
    }
  };

  const handlePrevChannel = () => {
    const currentList = channels;
    const currentIndex = selectedChannel
      ? currentList.findIndex((c) => c.id === selectedChannel.id)
      : -1;
    if (currentIndex > 0) {
      handleSelectChannel(currentList[currentIndex - 1]);
    } else if (currentList.length > 0) {
      handleSelectChannel(currentList[currentList.length - 1]);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await api.getChannels({ limit: 1 });
      const [cats, counts, stats] = await Promise.all([
        api.getCategories(),
        api.getCountries(),
        api.getSystemStats(),
      ]);
      setCategories(cats);
      setCountries(counts);
      setSystemStats(stats);
      await loadChannels(true);
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top Google TV Header Bar */}
      <Header
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        selectedCountry={selectedCountry}
        onSelectCountry={(c) => {
          setSelectedCountry(c);
          if (activeTab === 'foryou') {
            // Stay in For You and adjust view
          }
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        systemStats={systemStats}
        onOpenStats={() => setIsStatsOpen(true)}
        onOpenCustomM3U={() => setIsCustomM3UOpen(true)}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        watchlistCount={watchlist.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6">
        {/* Active Player Deck (always pinned on top when playing) */}
        {selectedChannel && (
          <div className="mb-8">
            <Player
              channel={selectedChannel}
              onClose={() => setSelectedChannel(null)}
              onNext={handleNextChannel}
              onPrev={handlePrevChannel}
              isFavorite={favorites.includes(selectedChannel.id)}
              onToggleFavorite={() => toggleFavorite(selectedChannel.id)}
            />
          </div>
        )}

        {/* =========================================================================
            TAB 1: FOR YOU (The Core Google TV Experience)
            ========================================================================= */}
        {activeTab === 'foryou' && (
          <div>
            {/* Top Billboard Hero Showcase */}
            <BillboardHero
              items={featuredItems}
              onPlay={handlePlayVod}
              watchlist={watchlist}
              onToggleWatchlist={toggleWatchlist}
            />

            {/* Quick Connected Apps Bar */}
            <ProviderBar providers={providers} />

            {/* Rail 1: Top Channels in India 🇮🇳 */}
            <HorizontalRail
              title="Top Channels in India"
              subtitle="Popular live television from Hotstar, Star, Zee, Sony, and regional networks"
              icon="🇮🇳"
              onViewAll={() => {
                setSelectedCountry('IN');
                setActiveTab('live');
              }}
            >
              {indiaChannels.map((c) => (
                <ChannelCard
                  key={c.id}
                  channel={c}
                  isSelected={selectedChannel?.id === c.id}
                  isFavorite={favorites.includes(c.id)}
                  onSelect={() => handleSelectChannel(c)}
                  onToggleFavorite={(e) => toggleFavorite(c.id, e)}
                  layout="rail"
                />
              ))}
            </HorizontalRail>

            {/* Rail 2: Trending Movies & Cinema 🎬 */}
            <HorizontalRail
              title="Trending Movies & Cinema"
              subtitle="Stream blockbusters, Bollywood hits, and Hollywood favorites"
              icon="🎬"
              onViewAll={() => setActiveTab('movies')}
            >
              {movies.map((m) => (
                <VodCard
                  key={m.id}
                  item={m}
                  onPlay={() => handlePlayVod(m)}
                  isWatchlisted={watchlist.includes(m.id)}
                  onToggleWatchlist={(e) => toggleWatchlist(m.id, e)}
                />
              ))}
            </HorizontalRail>

            {/* Rail 3: Popular in United States 🇺🇸 */}
            <HorizontalRail
              title="Popular in United States"
              subtitle="CBS, ABC, NBC, Fox, Bloomberg, and top US cable networks"
              icon="🇺🇸"
              onViewAll={() => {
                setSelectedCountry('US');
                setActiveTab('live');
              }}
            >
              {usChannels.map((c) => (
                <ChannelCard
                  key={c.id}
                  channel={c}
                  isSelected={selectedChannel?.id === c.id}
                  isFavorite={favorites.includes(c.id)}
                  onSelect={() => handleSelectChannel(c)}
                  onToggleFavorite={(e) => toggleFavorite(c.id, e)}
                  layout="rail"
                />
              ))}
            </HorizontalRail>

            {/* Rail 4: Popular TV Shows & Series 📺 */}
            <HorizontalRail
              title="Popular TV Shows & Series"
              subtitle="Binge-worthy shows from Netflix, Hotstar, and Prime Video"
              icon="📺"
              onViewAll={() => setActiveTab('shows')}
            >
              {shows.map((s) => (
                <VodCard
                  key={s.id}
                  item={s}
                  onPlay={() => handlePlayVod(s)}
                  isWatchlisted={watchlist.includes(s.id)}
                  onToggleWatchlist={(e) => toggleWatchlist(s.id, e)}
                />
              ))}
            </HorizontalRail>

            {/* Rail 5: Live Breaking News & Headlines 🔴 */}
            <HorizontalRail
              title="Live News & World Coverage"
              subtitle="Continuous 24/7 breaking news and weather feeds"
              icon="🔴"
              onViewAll={() => {
                setSelectedCategory('news');
                setActiveTab('live');
              }}
            >
              {newsChannels.map((c) => (
                <ChannelCard
                  key={c.id}
                  channel={c}
                  isSelected={selectedChannel?.id === c.id}
                  isFavorite={favorites.includes(c.id)}
                  onSelect={() => handleSelectChannel(c)}
                  onToggleFavorite={(e) => toggleFavorite(c.id, e)}
                  layout="rail"
                />
              ))}
            </HorizontalRail>

            {/* Rail 6: Sports Arena 🏆 */}
            <HorizontalRail
              title="Live Sports & Events"
              subtitle="Cricket, Football, Motorsports, and Extreme Sports"
              icon="🏆"
              onViewAll={() => {
                setSelectedCategory('sports');
                setActiveTab('live');
              }}
            >
              {sportsChannels.map((c) => (
                <ChannelCard
                  key={c.id}
                  channel={c}
                  isSelected={selectedChannel?.id === c.id}
                  isFavorite={favorites.includes(c.id)}
                  onSelect={() => handleSelectChannel(c)}
                  onToggleFavorite={(e) => toggleFavorite(c.id, e)}
                  layout="rail"
                />
              ))}
            </HorizontalRail>

            {/* Rail 7: Music & 24/7 Concerts 🎵 */}
            <HorizontalRail
              title="Music & Non-Stop Visuals"
              subtitle="Top hits, indie tracks, and live music channels"
              icon="🎵"
              onViewAll={() => {
                setSelectedCategory('music');
                setActiveTab('live');
              }}
            >
              {musicChannels.map((c) => (
                <ChannelCard
                  key={c.id}
                  channel={c}
                  isSelected={selectedChannel?.id === c.id}
                  isFavorite={favorites.includes(c.id)}
                  onSelect={() => handleSelectChannel(c)}
                  onToggleFavorite={(e) => toggleFavorite(c.id, e)}
                  layout="rail"
                />
              ))}
            </HorizontalRail>
          </div>
        )}

        {/* =========================================================================
            TAB 2: LIVE TV (Full Channels Directory with Filters)
            ========================================================================= */}
        {activeTab === 'live' && (
          <div>
            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-6">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                  selectedCategory === 'all'
                    ? 'bg-white text-slate-950 shadow-md'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                All Genres
              </button>
              {categories.slice(0, 15).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${
                    selectedCategory === cat.id
                      ? 'bg-indigo-500 text-white shadow-md'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {cat.name} ({cat.count})
                </button>
              ))}
            </div>

            {/* Section Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Radio className="w-5 h-5 text-indigo-400" />
                  Live Channels Directory
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Showing {channels.length} of {totalChannels.toLocaleString()} playable channels •{' '}
                  {selectedCountry !== 'all' ? `Filtered by ${selectedCountry}` : 'Worldwide'}
                </p>
              </div>

              {customPlaylist && (
                <button
                  onClick={() => setCustomPlaylist(null)}
                  className="px-3 py-1 rounded-xl bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30"
                >
                  Clear Custom Playlist
                </button>
              )}
            </div>

            {/* Channels Grid */}
            {channels.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {channels.map((channel) => (
                  <ChannelCard
                    key={channel.id}
                    channel={channel}
                    isSelected={selectedChannel?.id === channel.id}
                    isFavorite={favorites.includes(channel.id)}
                    onSelect={() => handleSelectChannel(channel)}
                    onToggleFavorite={(e) => toggleFavorite(channel.id, e)}
                  />
                ))}
              </div>
            ) : !isLoading ? (
              <div className="text-center py-20">
                <Tv className="w-16 h-16 text-slate-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white">No channels found</h3>
                <p className="text-xs text-slate-400 mt-1">Try resetting the filter or search query.</p>
              </div>
            ) : null}

            {isLoading && (
              <div className="flex justify-center py-12">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
              </div>
            )}

            {!isLoading && hasMore && !customPlaylist && (
              <div className="flex justify-center mt-10 mb-6">
                <button
                  onClick={() => loadChannels(false)}
                  className="px-6 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Load More Channels
                </button>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 3: MOVIES
            ========================================================================= */}
        {activeTab === 'movies' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <Film className="w-6 h-6 text-indigo-400" />
                Movies & Cinema Collection
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Stream on-demand blockbusters, Bollywood releases, Hollywood epics, and 24/7 movie channels.
              </p>
            </div>

            {/* Movies Grid */}
            <div className="mb-10">
              <h3 className="text-base font-bold text-white mb-3">Featured On-Demand Releases</h3>
              <div className="flex flex-wrap gap-4">
                {movies.map((m) => (
                  <VodCard
                    key={m.id}
                    item={m}
                    onPlay={() => handlePlayVod(m)}
                    isWatchlisted={watchlist.includes(m.id)}
                    onToggleWatchlist={(e) => toggleWatchlist(m.id, e)}
                  />
                ))}
              </div>
            </div>

            {/* 24/7 Movie Television Channels */}
            <div>
              <h3 className="text-base font-bold text-white mb-3">Live 24/7 Movie Channels</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {movieChannels.map((c) => (
                  <ChannelCard
                    key={c.id}
                    channel={c}
                    isSelected={selectedChannel?.id === c.id}
                    isFavorite={favorites.includes(c.id)}
                    onSelect={() => handleSelectChannel(c)}
                    onToggleFavorite={(e) => toggleFavorite(c.id, e)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: SHOWS & SERIES
            ========================================================================= */}
        {activeTab === 'shows' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <Tv className="w-6 h-6 text-indigo-400" />
                TV Shows & Binge Series
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Popular episodic dramas, crime series, and regional TV serials.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 mb-10">
              {shows.map((s) => (
                <VodCard
                  key={s.id}
                  item={s}
                  onPlay={() => handlePlayVod(s)}
                  isWatchlisted={watchlist.includes(s.id)}
                  onToggleWatchlist={(e) => toggleWatchlist(s.id, e)}
                />
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 5: APPS & STREAMING HUB
            ========================================================================= */}
        {activeTab === 'apps' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <Compass className="w-6 h-6 text-indigo-400" />
                Streaming Apps & Content Providers
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Access your subscriptions, live cricket on Hotstar, Netflix originals, Prime Video, and JioCinema.
              </p>
            </div>
            <ProviderBar providers={providers} />
          </div>
        )}

        {/* =========================================================================
            TAB 6: MY LIBRARY & WATCHLIST
            ========================================================================= */}
        {activeTab === 'watchlist' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <Bookmark className="w-6 h-6 text-amber-400" />
                My Library & Watchlist
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Your saved movies, series, starred TV channels, and recently watched history.
              </p>
            </div>

            {/* Starred Channels */}
            <div className="mb-10">
              <h3 className="text-base font-bold text-white mb-3">
                Starred TV Channels ({favorites.length})
              </h3>
              {favorites.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {channels
                    .filter((c) => favorites.includes(c.id))
                    .map((c) => (
                      <ChannelCard
                        key={c.id}
                        channel={c}
                        isSelected={selectedChannel?.id === c.id}
                        isFavorite={true}
                        onSelect={() => handleSelectChannel(c)}
                        onToggleFavorite={(e) => toggleFavorite(c.id, e)}
                      />
                    ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 bg-white/5 p-4 rounded-xl border border-white/5">
                  No channels starred yet. Click the star on any channel to pin it here.
                </p>
              )}
            </div>

            {/* Saved Movies & Shows */}
            <div className="mb-10">
              <h3 className="text-base font-bold text-white mb-3">
                Saved Movies & Shows ({watchlist.length})
              </h3>
              <div className="flex flex-wrap gap-4">
                {[...movies, ...shows, ...featuredItems]
                  .filter((item, index, self) => self.findIndex((i) => i.id === item.id) === index)
                  .filter((item) => watchlist.includes(item.id))
                  .map((item) => (
                    <VodCard
                      key={item.id}
                      item={item}
                      onPlay={() => handlePlayVod(item)}
                      isWatchlisted={true}
                      onToggleWatchlist={(e) => toggleWatchlist(item.id, e)}
                    />
                  ))}
              </div>
            </div>

            {/* Recently Played */}
            <div>
              <h3 className="text-base font-bold text-white mb-3">Recently Watched ({recents.length})</h3>
              {recents.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {recents.map((c) => (
                    <ChannelCard
                      key={c.id}
                      channel={c}
                      isSelected={selectedChannel?.id === c.id}
                      isFavorite={favorites.includes(c.id)}
                      onSelect={() => handleSelectChannel(c)}
                      onToggleFavorite={(e) => toggleFavorite(c.id, e)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 bg-white/5 p-4 rounded-xl border border-white/5">
                  No recently played channels yet.
                </p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* System Diagnostics Modal */}
      <SystemStatsModal
        stats={systemStats}
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
      />

      {/* Custom M3U Modal */}
      <CustomPlaylistModal
        isOpen={isCustomM3UOpen}
        onClose={() => setIsCustomM3UOpen(false)}
        onPlaylistLoaded={(importedChannels, name) => {
          setCustomPlaylist({ name, channels: importedChannels });
          setActiveTab('live');
        }}
      />
    </div>
  );
};
