import { Category, Channel, Country, SystemStats } from '../types';

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

  getProxiedStreamUrl(originalUrl: string): string {
    return `${API_BASE}/proxy/stream?url=${encodeURIComponent(originalUrl)}`;
  },
};
