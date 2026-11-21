import {
  Category,
  Channel,
  Country,
  SystemStats,
  VodItem,
  StreamingProvider,
  DvrRecording,
  LocalXtreamUser,
  XtreamDownloadTask,
  PlaylistPreset,
  XtreamSeriesItem,
  XtreamSeriesInfo,
} from '../types';

const API_BASE = '/api/v1';

export interface ChannelQueryParams {
  q?: string;
  category?: string;
  country?: string;
  language?: string;
  limit?: number;
  offset?: number;
}

export interface ChannelsResponse {
  channels: Channel[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export const api = {
  async getChannels(params: ChannelQueryParams = {}): Promise<ChannelsResponse> {
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.set('q', params.q);
    if (params.category && params.category !== 'all') searchParams.set('category', params.category);
    if (params.country && params.country !== 'all') searchParams.set('country', params.country);
    if (params.language) searchParams.set('language', params.language);
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.offset) searchParams.set('offset', params.offset.toString());

    const res = await fetch(`${API_BASE}/channels?${searchParams.toString()}`);
    if (!res.ok) throw new Error(`Failed to load channels: HTTP ${res.status}`);
    return res.json();
  },

  async getCategories(): Promise<Category[]> {
    const res = await fetch(`${API_BASE}/categories`);
    if (!res.ok) throw new Error(`Failed to load categories: HTTP ${res.status}`);
    const data = await res.json();
    return data.categories || [];
  },

  async getCountries(): Promise<Country[]> {
    const res = await fetch(`${API_BASE}/countries`);
    if (!res.ok) throw new Error(`Failed to load countries: HTTP ${res.status}`);
    const data = await res.json();
    return data.countries || [];
  },

  async getSystemStats(): Promise<SystemStats> {
    const res = await fetch(`${API_BASE}/system/stats`);
    if (!res.ok) throw new Error(`Failed to load system stats: HTTP ${res.status}`);
    return res.json();
  },

  async parseRemoteM3U(url: string): Promise<Channel[]> {
    const res = await fetch(`${API_BASE}/playlists/parse-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) throw new Error(`Failed to parse playlist: HTTP ${res.status}`);
    const data = await res.json();
    return data.channels || [];
  },

  async getPlaylistPresets(): Promise<PlaylistPreset[]> {
    const res = await fetch(`${API_BASE}/playlists/presets`);
    if (!res.ok) throw new Error(`Failed to load presets: HTTP ${res.status}`);
    const data = await res.json();
    return data.presets || [];
  },

  async loadPreset(presetId: string): Promise<{ preset: PlaylistPreset; channels: Channel[]; total: number }> {
    const res = await fetch(`${API_BASE}/playlists/load-preset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preset_id: presetId }),
    });
    if (!res.ok) throw new Error(`Failed to load preset: HTTP ${res.status}`);
    return res.json();
  },

  async parseUploadedM3U(file: File): Promise<Channel[]> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/playlists/parse-file`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(`Failed to upload file: HTTP ${res.status}`);
    const data = await res.json();
    return data.channels || [];
  },

  async getFeatured(): Promise<VodItem[]> {
    const res = await fetch(`${API_BASE}/vod/featured`);
    if (!res.ok) throw new Error(`Failed to load featured billboard: HTTP ${res.status}`);
    const data = await res.json();
    return data.featured || [];
  },

  async getMovies(country?: string): Promise<VodItem[]> {
    const query = country && country !== 'all' ? `?country=${country}` : '';
    const res = await fetch(`${API_BASE}/vod/movies${query}`);
    if (!res.ok) throw new Error(`Failed to load movies: HTTP ${res.status}`);
    const data = await res.json();
    return data.movies || [];
  },

  async getShows(country?: string): Promise<VodItem[]> {
    const query = country && country !== 'all' ? `?country=${country}` : '';
    const res = await fetch(`${API_BASE}/vod/shows${query}`);
    if (!res.ok) throw new Error(`Failed to load shows: HTTP ${res.status}`);
    const data = await res.json();
    return data.shows || [];
  },

  async getProviders(): Promise<StreamingProvider[]> {
    const res = await fetch(`${API_BASE}/vod/providers`);
    if (!res.ok) throw new Error(`Failed to load streaming providers: HTTP ${res.status}`);
    const data = await res.json();
    return data.providers || [];
  },

  getProxiedStreamUrl(originalUrl: string): string {
    return `${API_BASE}/proxy/stream?url=${encodeURIComponent(originalUrl)}`;
  },

  async startDvr(
    channel_id: string,
    stream_url: string,
    channel_name?: string,
    channel_logo?: string
  ): Promise<DvrRecording> {
    const res = await fetch(`${API_BASE}/dvr/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel_id,
        stream_url,
        channel_name,
        channel_logo,
      }),
    });
    if (!res.ok) throw new Error(`Failed to start DVR: HTTP ${res.status}`);
    const data = await res.json();
    return data.dvr;
  },

  async stopDvr(channel_id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/dvr/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel_id }),
    });
    if (!res.ok) throw new Error(`Failed to stop DVR: HTTP ${res.status}`);
    const data = await res.json();
    return data.stopped;
  },

  async deleteDvr(channel_id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/dvr/${channel_id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Failed to delete DVR: HTTP ${res.status}`);
    const data = await res.json();
    return data.deleted;
  },

  async getAllDvrStatus(): Promise<DvrRecording[]> {
    const res = await fetch(`${API_BASE}/dvr/status`);
    if (!res.ok) throw new Error(`Failed to get DVR status: HTTP ${res.status}`);
    const data = await res.json();
    return data.recordings || [];
  },

  async getChannelDvrStatus(channel_id: string): Promise<DvrRecording | null> {
    const res = await fetch(`${API_BASE}/dvr/${channel_id}/status`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.is_active !== undefined ? data : null;
  },

  // =========================================================================
  // VOD Movies (Free, Local, Downloads)
  // =========================================================================
  async getFreeMovies(): Promise<VodItem[]> {
    const res = await fetch(`${API_BASE}/vod/free`);
    if (!res.ok) throw new Error(`Failed to load free movies: HTTP ${res.status}`);
    const data = await res.json();
    return data.movies || [];
  },

  async getLocalMovies(): Promise<VodItem[]> {
    const res = await fetch(`${API_BASE}/vod/local`);
    if (!res.ok) throw new Error(`Failed to load local movies: HTTP ${res.status}`);
    const data = await res.json();
    return data.movies || [];
  },

  async deleteLocalMovie(filename: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/vod/local/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    });
    return res.ok;
  },

  async startMovieDownload(title: string, stream_url: string): Promise<XtreamDownloadTask> {
    const res = await fetch(`${API_BASE}/vod/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, stream_url }),
    });
    if (!res.ok) throw new Error(`Failed to start download: HTTP ${res.status}`);
    const data = await res.json();
    return data.task;
  },

  async getMovieDownloads(): Promise<XtreamDownloadTask[]> {
    const res = await fetch(`${API_BASE}/vod/downloads`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.downloads || [];
  },

  async cancelMovieDownload(taskId: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/vod/download/${encodeURIComponent(taskId)}/cancel`, {
      method: 'POST',
    });
    return res.ok;
  },

  // =========================================================================
  // Upstream Xtream Client Connector (8kplayers.com, etc.)
  // =========================================================================
  async testXtreamAuth(server: string, username: string, password: string): Promise<any> {
    const res = await fetch(`${API_BASE}/xtream/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ server, username, password }),
    });
    if (!res.ok) throw new Error(`Xtream auth failed: HTTP ${res.status}`);
    return res.json();
  },

  async getXtreamVodCategories(server: string, username: string, password: string): Promise<any[]> {
    const params = new URLSearchParams({ server, username, password });
    const res = await fetch(`${API_BASE}/xtream/vod/categories?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.categories || [];
  },

  async getXtreamVodStreams(
    server: string,
    username: string,
    password: string,
    categoryId?: string
  ): Promise<VodItem[]> {
    const params = new URLSearchParams({ server, username, password });
    if (categoryId) params.set('category_id', categoryId);
    const res = await fetch(`${API_BASE}/xtream/vod/streams?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.movies || [];
  },

  async getXtreamSeriesCategories(server: string, username: string, password: string): Promise<any[]> {
    const params = new URLSearchParams({ server, username, password });
    const res = await fetch(`${API_BASE}/xtream/series/categories?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.categories || [];
  },

  async getXtreamSeries(
    server: string,
    username: string,
    password: string,
    categoryId?: string,
    search?: string
  ): Promise<XtreamSeriesItem[]> {
    const params = new URLSearchParams({ server, username, password });
    if (categoryId && categoryId !== 'all') params.set('category_id', categoryId);
    if (search && search.trim()) params.set('search', search.trim());
    const res = await fetch(`${API_BASE}/xtream/series?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.series || [];
  },

  async getXtreamSeriesInfo(
    server: string,
    username: string,
    password: string,
    seriesId: string | number
  ): Promise<XtreamSeriesInfo | null> {
    const params = new URLSearchParams({ server, username, password });
    const res = await fetch(`${API_BASE}/xtream/series/${seriesId}?${params.toString()}`);
    if (!res.ok) return null;
    return res.json();
  },

  async getXtreamLiveStreams(
    server: string,
    username: string,
    password: string,
    format: string = 'm3u8'
  ): Promise<Channel[]> {
    const params = new URLSearchParams({ server, username, password, format });
    const res = await fetch(`${API_BASE}/xtream/live/streams?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.channels || [];
  },

  // =========================================================================
  // Self-Hosted Xtream Server (Local Users on Pi)
  // =========================================================================
  async getLocalXtreamUsers(): Promise<LocalXtreamUser[]> {
    const res = await fetch(`${API_BASE}/xtream/local/users`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.users || [];
  },

  async createLocalXtreamUser(payload: {
    username: string;
    password: string;
    exp_days?: number;
    max_connections?: number;
    notes?: string;
  }): Promise<LocalXtreamUser> {
    const res = await fetch(`${API_BASE}/xtream/local/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to create user: HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.user;
  },

  async deleteLocalXtreamUser(username: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/xtream/local/users/${encodeURIComponent(username)}`, {
      method: 'DELETE',
    });
    return res.ok;
  },
};
