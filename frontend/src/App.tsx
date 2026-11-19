import React, { useState, useEffect, useCallback } from 'react';
import { Header, ActiveTab } from './components/Header';
import { BillboardHero } from './components/BillboardHero';
import { HorizontalRail } from './components/HorizontalRail';
import { ChannelCard } from './components/ChannelCard';
import { Player } from './components/Player';
import { SystemStatsModal } from './components/SystemStatsModal';
import { CustomPlaylistModal } from './components/CustomPlaylistModal';
import { DvrModal } from './components/DvrModal';
import { XtreamModal } from './components/XtreamModal';
import { VodCard } from './components/VodCard';
import { api } from './services/api';
import {
  Category,
  Channel,
  Country,
  SystemStats,
  VodItem,
  XtreamAccount,
  XtreamDownloadTask,
} from './types';
import {
  Tv,
  Sparkles,
  RefreshCw,
  Film,
  Radio,
  Bookmark,
  Server,
  HardDrive,
  Zap,
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

  // Spotlight Billboard Items
  const [spotlightItems, setSpotlightItems] = useState<VodItem[]>([]);

  // Subsets for Google TV Rails
  const [indiaChannels, setIndiaChannels] = useState<Channel[]>([]);
  const [usChannels, setUsChannels] = useState<Channel[]>([]);
  const [inMovieChannels, setInMovieChannels] = useState<Channel[]>([]);
  const [usMovieChannels, setUsMovieChannels] = useState<Channel[]>([]);
  const [seriesChannels, setSeriesChannels] = useState<Channel[]>([]);
  const [newsChannels, setNewsChannels] = useState<Channel[]>([]);
  const [sportsChannels, setSportsChannels] = useState<Channel[]>([]);
  const [musicChannels, setMusicChannels] = useState<Channel[]>([]);

  // Category specific view datasets
  const [movieTabChannels, setMovieTabChannels] = useState<Channel[]>([]);
  const [movieTabCountry, setMovieTabCountry] = useState<string>('IN');
  const [showsTabChannels, setShowsTabChannels] = useState<Channel[]>([]);
  const [showsTabCountry, setShowsTabCountry] = useState<string>('IN');

  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);
  const [isCustomM3UOpen, setIsCustomM3UOpen] = useState<boolean>(false);
  const [isDvrOpen, setIsDvrOpen] = useState<boolean>(false);
  const [activeDvrCount, setActiveDvrCount] = useState<number>(0);
  const [isXtreamOpen, setIsXtreamOpen] = useState<boolean>(false);
  const [xtreamAccount, setXtreamAccount] = useState<XtreamAccount | null>(() => {
    try {
      const saved = localStorage.getItem('pkp_tv_xtream_account');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Local & Free Movie Datasets
  const [localSavedMovies, setLocalSavedMovies] = useState<VodItem[]>([]);
  const [freeCinemaMovies, setFreeCinemaMovies] = useState<VodItem[]>([]);
  const [xtreamVodMovies, setXtreamVodMovies] = useState<VodItem[]>([]);
  const [activeDownloads, setActiveDownloads] = useState<XtreamDownloadTask[]>([]);
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
    localStorage.setItem('pkp_tv_recents', JSON.stringify(recents));
  }, [recents]);

  // Initial Data & Telemetry Fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [cats, counts, stats, feat] = await Promise.all([
          api.getCategories().catch(() => []),
          api.getCountries().catch(() => []),
          api.getSystemStats().catch(() => null),
          api.getFeatured().catch(() => []),
        ]);
        setCategories(cats);
        setCountries(counts);
        setSystemStats(stats);
        setSpotlightItems(feat);

        // Preload Google TV curated rails with authentic broadcaster logos
        const [
          inRes,
          usRes,
          inMovieRes,
          usMovieRes,
          seriesRes,
          newsRes,
          sportsRes,
          musicRes,
        ] = await Promise.all([
          api.getChannels({ country: 'IN', limit: 25 }),
          api.getChannels({ country: 'US', limit: 25 }),
          api.getChannels({ country: 'IN', category: 'movies', limit: 25 }),
          api.getChannels({ country: 'US', category: 'movies', limit: 25 }),
          api.getChannels({ category: 'series', limit: 25 }),
          api.getChannels({ category: 'news', limit: 25 }),
          api.getChannels({ category: 'sports', limit: 25 }),
          api.getChannels({ category: 'music', limit: 25 }),
        ]);

        setIndiaChannels(inRes.channels);
        setUsChannels(usRes.channels);
        setInMovieChannels(inMovieRes.channels);
        setUsMovieChannels(usMovieRes.channels);
        setSeriesChannels(seriesRes.channels);
        setNewsChannels(newsRes.channels);
        setSportsChannels(sportsRes.channels);
        setMusicChannels(musicRes.channels);
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

  // Poll Active 12h DVR buffer count
  useEffect(() => {
    let mounted = true;
    const fetchDvr = async () => {
      try {
        const list = await api.getAllDvrStatus();
        if (mounted) {
          setActiveDvrCount(list.filter((r) => r.is_active).length);
        }
      } catch {}
    };
    fetchDvr();
    const interval = setInterval(fetchDvr, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
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

  // Load Movies Tab (Channels, Saved Pi Movies, Free Cinema, Xtream VOD)
  useEffect(() => {
    const loadMovieTab = async () => {
      try {
        const [res, local, free] = await Promise.all([
          api.getChannels({
            category: 'movies',
            country: movieTabCountry !== 'all' ? movieTabCountry : undefined,
            limit: 80,
          }),
          api.getLocalMovies().catch(() => []),
          api.getFreeMovies().catch(() => []),
        ]);
        setMovieTabChannels(res.channels);
        setLocalSavedMovies(local);
        setFreeCinemaMovies(free);

        if (xtreamAccount?.isActive && xtreamAccount.server && xtreamAccount.username) {
          api.getXtreamVodStreams(xtreamAccount.server, xtreamAccount.username, xtreamAccount.password)
            .then((v) => setXtreamVodMovies(v.slice(0, 50)))
            .catch(() => {});
        }
      } catch (e) {
        console.error('Failed to load movies tab channels:', e);
      }
    };
    if (activeTab === 'movies') {
      loadMovieTab();
    }
  }, [activeTab, movieTabCountry, xtreamAccount]);

  const handleSaveAccount = (acc: XtreamAccount | null) => {
    setXtreamAccount(acc);
    if (acc) {
      localStorage.setItem('pkp_tv_xtream_account', JSON.stringify(acc));
      api.getXtreamVodStreams(acc.server, acc.username, acc.password)
        .then((v) => setXtreamVodMovies(v.slice(0, 50)))
        .catch(() => {});
    } else {
      localStorage.removeItem('pkp_tv_xtream_account');
      setXtreamVodMovies([]);
    }
  };

  const handleDownloadMovie = async (movie: VodItem) => {
    if (!movie.stream_url) return;
    try {
      await api.startMovieDownload(movie.title, movie.stream_url);
      const dl = await api.getMovieDownloads();
      setActiveDownloads(dl);
    } catch (e) {
      console.error('Failed to start download:', e);
    }
  };

  const handleDeleteLocalMovie = async (filename?: string) => {
    if (!filename) return;
    if (confirm(`Delete '${filename}' from Pi storage?`)) {
      await api.deleteLocalMovie(filename);
      const updated = await api.getLocalMovies();
      setLocalSavedMovies(updated);
    }
  };

  // Load Shows Tab Channels
  useEffect(() => {
    const loadShowsTab = async () => {
      try {
        const res = await api.getChannels({
          category: 'series',
          country: showsTabCountry !== 'all' ? showsTabCountry : undefined,
          limit: 80,
        });
        // If series count is small, also append entertainment channels
        if (res.channels.length < 30) {
          const entRes = await api.getChannels({
            category: 'entertainment',
            country: showsTabCountry !== 'all' ? showsTabCountry : undefined,
            limit: 50,
          });
          const seen = new Set(res.channels.map((c) => c.id));
          const merged = [...res.channels];
          for (const ec of entRes.channels) {
            if (!seen.has(ec.id)) {
              merged.push(ec);
              seen.add(ec.id);
            }
          }
          setShowsTabChannels(merged);
        } else {
          setShowsTabChannels(res.channels);
        }
      } catch (e) {
        console.error('Failed to load shows tab channels:', e);
      }
    };
    if (activeTab === 'shows') {
      loadShowsTab();
    }
  }, [activeTab, showsTabCountry]);

  const toggleFavorite = (channelId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(channelId) ? prev.filter((id) => id !== channelId) : [...prev, channelId]
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
      logo: vod.poster || '',
      country: vod.country || 'IN',
      country_name: vod.country_name || (vod.country === 'IN' ? 'India' : 'United States'),
      country_flag: vod.country_flag || (vod.country === 'IN' ? '🇮🇳' : '🇺🇸'),
      categories: vod.genres || ['Live TV'],
      stream_url: vod.stream_url || '',
      quality: vod.quality || '1080p FHD',
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
      const [cats, counts, stats, feat] = await Promise.all([
        api.getCategories(),
        api.getCountries(),
        api.getSystemStats(),
        api.getFeatured(),
      ]);
      setCategories(cats);
      setCountries(counts);
      setSystemStats(stats);
      setSpotlightItems(feat);
      await loadChannels(true);
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const quickPlaylists = [
    { id: 'xtream-cat-movies', name: 'Cinema & Movies', icon: '🎬' },
    { id: 'xtream-cat-sports', name: 'Live Sports', icon: '⚽' },
    { id: 'xtream-cat-news', name: 'Global News', icon: '📰' },
    { id: 'xtream-cat-entertainment', name: 'Entertainment', icon: '🍿' },
    { id: 'xtream-country-us', name: 'USA Live', icon: '🇺🇸' },
    { id: 'xtream-country-in', name: 'India Live', icon: '🇮🇳' },
    { id: 'xtream-country-uk', name: 'UK Live', icon: '🇬🇧' },
    { id: 'xtream-country-vn', name: 'Vietnam Live', icon: '🇻🇳' },
    { id: 'xtream-trending-series', name: 'Trending Series', icon: '🔥' },
  ];

  const handleQuickLoadPlaylist = async (presetId: string) => {
    setIsLoading(true);
    try {
      const res = await api.loadPreset(presetId);
      if (res.channels && res.channels.length > 0) {
        setCustomPlaylist({
          name: `${res.preset.name} (${res.preset.badge || 'm3u8-xtream'})`,
          channels: res.channels,
        });
        setActiveTab('live');
        handleSelectChannel(res.channels[0]);
      }
    } catch (e) {
      console.error('Failed to quick-load preset:', e);
    } finally {
      setIsLoading(false);
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
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        systemStats={systemStats}
        onOpenStats={() => setIsStatsOpen(true)}
        onOpenCustomM3U={() => setIsCustomM3UOpen(true)}
        customPlaylistName={customPlaylist?.name}
        onClearCustomPlaylist={() => setCustomPlaylist(null)}
        onOpenDvr={() => setIsDvrOpen(true)}
        activeDvrCount={activeDvrCount}
        onOpenXtream={() => setIsXtreamOpen(true)}
        isXtreamConnected={!!xtreamAccount?.isActive}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        watchlistCount={favorites.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6">
        {/* Active Playlist Banner (m3u8-xtream) */}
        {customPlaylist && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-slate-900/90 to-cyan-950/80 border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    {customPlaylist.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-black uppercase tracking-wider">
                    m3u8-xtream
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {channels.length} channels loaded • Play, search, favorite, or record with 12h DVR
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={() => setIsCustomM3UOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold transition-all"
              >
                Switch Playlist
              </button>
              <button
                onClick={() => setCustomPlaylist(null)}
                className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold border border-rose-500/30 transition-all"
              >
                Clear & Reset
              </button>
            </div>
          </div>
        )}
        {/* Active Player Deck (always pinned on top when playing) */}
        {selectedChannel && (
          <div className="mb-8">
            <Player
              key={selectedChannel.id}
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
              items={spotlightItems}
              onPlay={handlePlayVod}
              watchlist={favorites}
              onToggleWatchlist={(id) => toggleFavorite(id)}
            />

            {/* Rail 1: Top Channels in India 🇮🇳 */}
            {indiaChannels.length > 0 && (
              <HorizontalRail
                title="Top Live Channels in India"
                subtitle="Leading Indian national and regional broadcast television"
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
            )}

            {/* Rail 2: 24/7 Live Indian Cinema 🎬 */}
            {inMovieChannels.length > 0 && (
              <HorizontalRail
                title="24/7 Live Indian Cinema"
                subtitle="Bollywood classics, regional hits, and non-stop film channels"
                icon="🎬"
                onViewAll={() => {
                  setMovieTabCountry('IN');
                  setActiveTab('movies');
                }}
              >
                {inMovieChannels.map((c) => (
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
            )}

            {/* Rail 3: 24/7 Hollywood & US Movies 🍿 */}
            {usMovieChannels.length > 0 && (
              <HorizontalRail
                title="24/7 Hollywood & US Movies"
                subtitle="Free movie channels, classic cinema, action, and sci-fi"
                icon="🍿"
                onViewAll={() => {
                  setMovieTabCountry('US');
                  setActiveTab('movies');
                }}
              >
                {usMovieChannels.map((c) => (
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
            )}

            {/* Rail 4: Popular in United States 🇺🇸 */}
            {usChannels.length > 0 && (
              <HorizontalRail
                title="Popular in United States"
                subtitle="CBS, ABC, NBC, Fox, Bloomberg, and top US television networks"
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
            )}

            {/* Rail 5: Popular TV Shows & Series 📺 */}
            {seriesChannels.length > 0 && (
              <HorizontalRail
                title="24/7 TV Series & Dramas"
                subtitle="Continuous serials, sitcoms, crime series, and entertainment"
                icon="📺"
                onViewAll={() => setActiveTab('shows')}
              >
                {seriesChannels.map((c) => (
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
            )}

            {/* Rail 6: Live Breaking News & Headlines 🔴 */}
            {newsChannels.length > 0 && (
              <HorizontalRail
                title="Live News & Global Headlines"
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
            )}

            {/* Rail 7: Sports Arena 🏆 */}
            {sportsChannels.length > 0 && (
              <HorizontalRail
                title="Live Sports & Motors"
                subtitle="Cricket, football, racing, combat, and outdoor sports"
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
            )}

            {/* Rail 8: Music & 24/7 Visuals 🎵 */}
            {musicChannels.length > 0 && (
              <HorizontalRail
                title="Live Music Television"
                subtitle="Continuous hits, retro tracks, and concerts"
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
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 2: MOVIES (24/7 Live Movie Channels)
            ========================================================================= */}
        {activeTab === 'movies' && (
          <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                  <Film className="w-6 h-6 text-indigo-400" />
                  Live Movies & Cinema Channels
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  24/7 non-stop movie broadcasts from India, United States, and international networks.
                </p>
              </div>

              {/* Country selector chips */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMovieTabCountry('IN')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                    movieTabCountry === 'IN'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  🇮🇳 India Cinema ★
                </button>
                <button
                  onClick={() => setMovieTabCountry('US')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                    movieTabCountry === 'US'
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-md'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  🇺🇸 US Movies ★
                </button>
                <button
                  onClick={() => setMovieTabCountry('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    movieTabCountry === 'all'
                      ? 'bg-white text-slate-950 font-bold'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  🌐 Worldwide
                </button>
              </div>
            </div>

            {/* Active Pi Downloads Progress Banner */}
            {activeDownloads.filter((d) => d.status === 'downloading').length > 0 && (
              <div className="mb-6 p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between text-xs text-indigo-300">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping" />
                  <span className="font-bold">
                    Saving {activeDownloads.filter((d) => d.status === 'downloading').length} movie(s) to Pi drive in background...
                  </span>
                </div>
                <span className="text-[11px] opacity-80">Permanent Archive</span>
              </div>
            )}

            {/* Section 1: Permanently Saved Movies on Pi Drive */}
            {localSavedMovies.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <HardDrive className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">Permanently Saved on Pi Storage</h3>
                      <p className="text-[11px] text-slate-400">Offline ready • Zero buffering • Never expires</p>
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                    {localSavedMovies.length} {localSavedMovies.length === 1 ? 'Movie' : 'Movies'}
                  </span>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                  {localSavedMovies.map((m) => (
                    <VodCard
                      key={m.id}
                      item={m}
                      onPlay={() => handlePlayVod(m)}
                      isWatchlisted={favorites.includes(m.id)}
                      onToggleWatchlist={(e) => {
                        e.stopPropagation();
                        toggleFavorite(m.id);
                      }}
                      onDelete={(e) => {
                        e.stopPropagation();
                        handleDeleteLocalMovie(m.filename);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Section 2: Xtream Codes Provider Movies */}
            {xtreamAccount?.isActive ? (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">
                        Xtream Provider VOD ({xtreamAccount.username})
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        On-demand movies from your provider • Click download icon to save permanently to Pi
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsXtreamOpen(true)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-bold"
                  >
                    Manage Account →
                  </button>
                </div>
                {xtreamVodMovies.length > 0 ? (
                  <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                    {xtreamVodMovies.map((m) => (
                      <VodCard
                        key={m.id}
                        item={m}
                        onPlay={() => handlePlayVod(m)}
                        isWatchlisted={favorites.includes(m.id)}
                        onToggleWatchlist={(e) => {
                          e.stopPropagation();
                          toggleFavorite(m.id);
                        }}
                        onDownload={(e) => {
                          e.stopPropagation();
                          handleDownloadMovie(m);
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/5 text-center text-xs text-slate-400">
                    Loading movies from {xtreamAccount.server}...
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Connect Your Xtream Codes Subscription</h4>
                    <p className="text-xs text-slate-400">
                      Link your provider (e.g. 8kplayers.com) to stream thousands of movies and save them permanently to your Pi.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsXtreamOpen(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-xs text-white shadow-lg shadow-indigo-600/30 transition-all shrink-0"
                >
                  Connect Xtream Account
                </button>
              </div>
            )}

            {/* Section 3: Free HD Cinema & Open Cinema */}
            {freeCinemaMovies.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                      <Film className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">Free HD Cinema (Permanent)</h3>
                      <p className="text-[11px] text-slate-400">
                        Permanent open cinema • Full 1080p • Ready to watch or archive to Pi
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                  {freeCinemaMovies.map((m) => (
                    <VodCard
                      key={m.id}
                      item={m}
                      onPlay={() => handlePlayVod(m)}
                      isWatchlisted={favorites.includes(m.id)}
                      onToggleWatchlist={(e) => {
                        e.stopPropagation();
                        toggleFavorite(m.id);
                      }}
                      onDownload={(e) => {
                        e.stopPropagation();
                        handleDownloadMovie(m);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Section 4: 24/7 Live Broadcast Channels */}
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">
                24/7 Live Cinema Channels
              </h3>
            </div>

            {/* Movie Channels Grid */}
            {movieTabChannels.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {movieTabChannels.map((c) => (
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
              <div className="text-center py-20">
                <Film className="w-16 h-16 text-slate-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white">Loading movie channels...</h3>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 3: SHOWS (24/7 TV Series & Serials)
            ========================================================================= */}
        {activeTab === 'shows' && (
          <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                  <Tv className="w-6 h-6 text-indigo-400" />
                  Live TV Series & Entertainment Channels
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Continuous 24/7 drama serials, sitcoms, crime series, and entertainment television.
                </p>
              </div>

              {/* Country selector chips */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowsTabCountry('IN')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                    showsTabCountry === 'IN'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  🇮🇳 India Serials ★
                </button>
                <button
                  onClick={() => setShowsTabCountry('US')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                    showsTabCountry === 'US'
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-md'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  🇺🇸 US TV Shows ★
                </button>
                <button
                  onClick={() => setShowsTabCountry('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    showsTabCountry === 'all'
                      ? 'bg-white text-slate-950 font-bold'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  🌐 Worldwide
                </button>
              </div>
            </div>

            {/* Shows Channels Grid */}
            {showsTabChannels.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {showsTabChannels.map((c) => (
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
              <div className="text-center py-20">
                <Tv className="w-16 h-16 text-slate-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white">Loading TV series channels...</h3>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 4: ALL LIVE CHANNELS (Directory with Filters)
            ========================================================================= */}
        {activeTab === 'live' && (
          <div>
            {/* Quick Presets Bar from m3u8-xtream */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1.5 px-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                m3u8-xtream:
              </span>
              {quickPlaylists.map((qp) => (
                <button
                  key={qp.id}
                  onClick={() => handleQuickLoadPlaylist(qp.id)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-indigo-600/30 text-slate-300 hover:text-white border border-white/10 hover:border-indigo-500/40 transition-all shrink-0 flex items-center gap-1.5"
                >
                  <span>{qp.icon}</span>
                  <span>{qp.name}</span>
                </button>
              ))}
              <button
                onClick={() => setIsCustomM3UOpen(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 transition-all shrink-0 flex items-center gap-1"
              >
                + Browse All Presets
              </button>
            </div>

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
            TAB 5: FAVORITES & RECENTLY WATCHED
            ========================================================================= */}
        {activeTab === 'watchlist' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <Bookmark className="w-6 h-6 text-amber-400" />
                Favorites & Recently Watched
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Your starred live channels and viewing history.
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

      {/* Custom M3U / m3u8-xtream Modal */}
      <CustomPlaylistModal
        isOpen={isCustomM3UOpen}
        onClose={() => setIsCustomM3UOpen(false)}
        onPlaylistLoaded={(importedChannels, name) => {
          setCustomPlaylist({ name, channels: importedChannels });
          setActiveTab('live');
          if (importedChannels.length > 0) {
            handleSelectChannel(importedChannels[0]);
          }
        }}
      />

      {/* 12-Hour Sliding Window DVR Manager Modal */}
      <DvrModal
        isOpen={isDvrOpen}
        onClose={() => setIsDvrOpen(false)}
        onSelectChannel={handleSelectChannel}
      />

      {/* Xtream Codes & Self-Hosted Server Modal */}
      <XtreamModal
        isOpen={isXtreamOpen}
        onClose={() => setIsXtreamOpen(false)}
        account={xtreamAccount}
        onSaveAccount={handleSaveAccount}
        onLoadLiveChannels={(xtreamChannels, name) => {
          setCustomPlaylist({ name, channels: xtreamChannels });
          setActiveTab('live');
          if (xtreamChannels.length > 0) {
            handleSelectChannel(xtreamChannels[0]);
          }
        }}
        onSwitchToMovies={() => {
          setActiveTab('movies');
          setIsXtreamOpen(false);
        }}
      />
    </div>
  );
};
