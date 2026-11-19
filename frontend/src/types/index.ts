export interface StreamInfo {
  url: string;
  quality?: string;
  feed?: string;
}

export interface Channel {
  id: string;
  name: string;
  alt_names?: string[];
  logo: string;
  country: string;
  country_name?: string;
  country_flag?: string;
  categories: string[];
  languages?: string[];
  website?: string;
  stream_url: string;
  quality?: string;
  available_streams?: StreamInfo[];
}

export interface Category {
  id: string;
  name: string;
  count: number;
}

export interface Country {
  code: string;
  name: string;
  flag: string;
  count: number;
}

export interface VodItem {
  id: string;
  title: string;
  type?: 'movie' | 'show';
  country?: string;
  country_name?: string;
  country_flag?: string;
  poster: string;
  backdrop?: string;
  rating?: string;
  year?: string;
  duration?: string;
  seasons?: string;
  genres: string[];
  provider?: string;
  provider_logo?: string;
  provider_url?: string;
  description?: string;
  stream_url?: string;
  is_streamable?: boolean;
  quality?: string;
  is_local?: boolean;
  is_free?: boolean;
  is_xtream?: boolean;
  filename?: string;
  file_size_mb?: number;
}

export interface XtreamAccount {
  server: string;
  username: string;
  password: string;
  format: 'm3u8' | 'ts';
  isActive?: boolean;
  status?: string;
  exp_date?: string;
  max_connections?: string;
}

export interface XtreamDownloadTask {
  id: string;
  title: string;
  stream_url: string;
  filename: string;
  total_bytes: number;
  downloaded_bytes: number;
  progress_percent: number;
  speed_kbps: number;
  status: 'starting' | 'downloading' | 'completed' | 'cancelled' | 'error';
  error?: string;
  started_at: number;
}

export interface LocalXtreamUser {
  username: string;
  password: string;
  created_at: number;
  exp_date: number;
  max_connections: number;
  active: boolean;
  notes?: string;
}

export interface StreamingProvider {
  id: string;
  name: string;
  color: string;
  accent: string;
  icon: string;
  url: string;
  description: string;
  badge: string;
}

export interface SystemStats {
  platform: {
    system: string;
    release: string;
    machine: string;
    is_raspberry_pi: boolean;
  };
  cpu: {
    usage_percent: number;
    cores: number;
    temperature: {
      celsius: number | null;
      source: string;
    };
  };
  memory: {
    total_mb: number;
    used_mb: number;
    free_mb: number;
    percent: number;
  };
  disk: {
    total_gb: number;
    used_gb: number;
    free_gb: number;
    percent: number;
  };
  uptime: {
    system_seconds: number;
    app_seconds: number;
  };
  catalog?: {
    channels_total: number;
    categories_total: number;
    countries_total: number;
    last_synced: number;
  };
}

export interface DvrRecording {
  channel_id: string;
  channel_name: string;
  channel_logo?: string;
  stream_url: string;
  started_at: number;
  playlist_path?: string;
  dvr_url: string;
  max_window_hours: number;
  is_active: boolean;
  size_mb: number;
  segments_count: number;
  buffered_seconds: number;
  buffered_display: string;
  elapsed_seconds: number;
}

export interface PlaylistPreset {
  id: string;
  name: string;
  category: string;
  group: 'Featured' | 'Categories' | 'Countries' | 'Genres' | 'Master';
  icon: string;
  badge: string;
  description: string;
  url: string;
  original_url?: string;
  channel_count?: string;
}

