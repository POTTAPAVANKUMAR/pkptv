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
