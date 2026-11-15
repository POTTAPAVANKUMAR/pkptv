import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ChannelCard } from './components/ChannelCard';
import { Player } from './components/Player';
import { SystemStatsModal } from './components/SystemStatsModal';
import { CustomPlaylistModal } from './components/CustomPlaylistModal';
import { api } from './services/api';
import { Category, Channel, Country, SystemStats } from './types';
import { Tv, Sparkles, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [totalChannels, setTotalChannels] = useState<number>(0);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'all' | 'favorites' | 'recents'>('all');

  const [categories, setCategories] = useState<Category[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);

  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);
  const [isCustomM3UOpen, setIsCustomM3UOpen] = useState<boolean>(false);
  const [customPlaylist, setCustomPlaylist] = useState<{ name: string; channels: Channel[] } | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [offset, setOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);

  // Favorites stored in localStorage
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('pkp_tv_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Recently played channels stored in localStorage
  const [recents, setRecents] = useState<Channel[]>(() => {
    try {
      const saved = localStorage.getItem('pkp_tv_recents');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persist favorites
  useEffect(() => {
    localStorage.setItem('pkp_tv_favorites', JSON.stringify(favorites));
  }, [favorites]);

  // Persist recents
  useEffect(() => {
    localStorage.setItem('pkp_tv_recents', JSON.stringify(recents));
  }, [recents]);

  // Load Categories, Countries & System Stats on start
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [cats, counts, stats] = await Promise.all([
          api.getCategories().catch(() => []),
          api.getCountries().catch(() => []),
          api.getSystemStats().catch(() => null),
        ]);
        setCategories(cats);
        setCountries(counts);
        setSystemStats(stats);
      } catch (err) {
        console.error('Initial data fetch error:', err);
      }
    };
    fetchInitialData();

    // Poll system stats every 15 seconds
    const interval = setInterval(async () => {
      try {
        const stats = await api.getSystemStats();
        setSystemStats(stats);
      } catch {}
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  // Fetch Channels based on filters
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

  // Trigger search/filter changes with reset
  useEffect(() => {
    setOffset(0);
    loadChannels(true);
  }, [searchQuery, selectedCategory, selectedCountry, customPlaylist]);

  // Toggle favorite
  const toggleFavorite = (channelId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(channelId) ? prev.filter((id) => id !== channelId) : [...prev, channelId]
    );
  };

  // Select channel and add to recents
  const handleSelectChannel = (channel: Channel) => {
    setSelectedChannel(channel);
    setRecents((prev) => {
      const filtered = prev.filter((c) => c.id !== channel.id);
      return [channel, ...filtered].slice(0, 30);
    });
  };

  // Channel switching in player (Next / Prev)
  const currentChannelsList =
    viewMode === 'favorites'
      ? channels.filter((c) => favorites.includes(c.id))
      : viewMode === 'recents'
      ? recents
      : channels;

  const currentChannelIndex = selectedChannel
    ? currentChannelsList.findIndex((c) => c.id === selectedChannel.id)
    : -1;

  const handleNextChannel = () => {
    if (currentChannelIndex !== -1 && currentChannelIndex < currentChannelsList.length - 1) {
      handleSelectChannel(currentChannelsList[currentChannelIndex + 1]);
    } else if (currentChannelsList.length > 0) {
      handleSelectChannel(currentChannelsList[0]);
    }
  };

  const handlePrevChannel = () => {
    if (currentChannelIndex > 0) {
      handleSelectChannel(currentChannelsList[currentChannelIndex - 1]);
    } else if (currentChannelsList.length > 0) {
      handleSelectChannel(currentChannelsList[currentChannelsList.length - 1]);
    }
  };

  // Manual refresh of channels and metadata
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await api.getChannels({ limit: 1 }); // probe
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

  // Determine channels to display
  let displayedChannels = channels;
  if (viewMode === 'favorites') {
    displayedChannels = channels.filter((c) => favorites.includes(c.id));
  } else if (viewMode === 'recents') {
    displayedChannels = recents;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-slate-100">
      {/* Top Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        systemStats={systemStats}
        onOpenStats={() => setIsStatsOpen(true)}
        onOpenCustomM3U={() => setIsCustomM3UOpen(true)}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Main Content Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => {
            setViewMode('all');
            setSelectedCategory(cat);
          }}
          selectedCountry={selectedCountry}
          onSelectCountry={(country) => {
            setViewMode('all');
            setSelectedCountry(country);
          }}
          categories={categories}
          countries={countries}
          viewMode={viewMode}
          onChangeViewMode={(mode) => {
            setViewMode(mode);
            if (mode !== 'all') {
              setSelectedCategory('all');
            }
          }}
          favoritesCount={favorites.length}
          recentsCount={recents.length}
        />

        {/* Channels Grid & Active Player Content Area */}
        <main className="flex-1 overflow-y-auto px-4 lg:px-8 py-6">
          {/* Active Player Deck */}
          {selectedChannel && (
            <div className="mb-8 max-w-5xl mx-auto">
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

          {/* Section Heading & Stats Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-white">
                  {customPlaylist
                    ? customPlaylist.name
                    : viewMode === 'favorites'
                    ? 'Starred Favorites'
                    : viewMode === 'recents'
                    ? 'Recently Watched'
                    : selectedCategory !== 'all'
                    ? `${selectedCategory.toUpperCase()} Channels`
                    : 'All Channels'}
                </h1>
                {selectedCountry !== 'all' && (
                  <span className="px-2 py-0.5 rounded-lg bg-surface text-xs font-bold border border-surface-border">
                    {countries.find((c) => c.code === selectedCountry)?.flag || '🌐'}{' '}
                    {selectedCountry}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Showing {displayedChannels.length} of {totalChannels.toLocaleString()} live streams
              </p>
            </div>

            {/* Custom Playlist Active Badge */}
            {customPlaylist && (
              <button
                onClick={() => setCustomPlaylist(null)}
                className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-hover text-rose-400 text-xs font-medium border border-rose-500/20"
              >
                Clear Custom Playlist & Restore Directory
              </button>
            )}
          </div>

          {/* Channel Cards Grid */}
          {displayedChannels.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {displayedChannels.map((channel) => (
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
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Tv className="w-16 h-16 text-slate-600 mb-4" />
              <h3 className="text-lg font-bold text-slate-200">No channels found</h3>
              <p className="text-sm text-slate-400 max-w-md mt-1 mb-4">
                {viewMode === 'favorites'
                  ? "You haven't starred any channels yet. Click the star on any channel to save it here!"
                  : viewMode === 'recents'
                  ? 'No recently played channels yet.'
                  : 'Try searching with a different term, category, or country filter.'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 bg-brand-primary text-white rounded-xl text-xs font-semibold"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : null}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-brand-primary animate-spin" />
            </div>
          )}

          {/* Load More Button for Infinite Pagination */}
          {!isLoading && hasMore && viewMode === 'all' && !customPlaylist && (
            <div className="flex justify-center mt-10 mb-6">
              <button
                onClick={() => loadChannels(false)}
                className="px-6 py-2.5 rounded-xl bg-surface hover:bg-surface-hover text-slate-200 text-xs font-bold border border-surface-border transition-all flex items-center gap-2 hover:border-slate-600"
              >
                <Sparkles className="w-4 h-4 text-brand-primary" />
                Load More Channels
              </button>
            </div>
          )}
        </main>
      </div>

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
          setViewMode('all');
        }}
      />
    </div>
  );
};
