import asyncio
import hashlib
import json
import logging
import os
import time
from typing import Any, Dict, List, Optional, Tuple
import httpx
from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel
from app.services.playlist_service import playlist_service
from app.core.config import settings

logger = logging.getLogger("pkp_tv.playlists")
router = APIRouter(prefix="/playlists", tags=["playlists"])

CACHE_DIR = os.path.join(settings.DATA_DIR, "playlist_cache")
PRESETS_DIR = os.path.join(settings.DATA_DIR, "presets")
os.makedirs(CACHE_DIR, exist_ok=True)
os.makedirs(PRESETS_DIR, exist_ok=True)
CACHE_TTL = 3600  # 1 hour in seconds

# =============================================================================
# Curated Presets from https://github.com/m3u8-xtream/m3u8-xtream-playlist
# =============================================================================
M3U8_XTREAM_PRESETS: List[Dict[str, Any]] = [
    # --- Featured & Trending ---
    {
        "id": "xtream-trending-series",
        "name": "Trending TV Shows",
        "category": "Trending",
        "group": "Featured",
        "icon": "🔥",
        "badge": "m3u8-xtream",
        "description": "Latest trending television series and broadcast episodes.",
        "url": "https://iptv-org.github.io/iptv/categories/series.m3u",
        "original_url": "https://aymrgknetzpucldhpkwm.supabase.co/storage/v1/object/public/tmdb/trending-series.m3u",
        "channel_count": "180+ Channels",
    },
    {
        "id": "xtream-top-movies",
        "name": "Top IMDB Movies (2024-2025)",
        "category": "Movies",
        "group": "Featured",
        "icon": "⭐",
        "badge": "m3u8-xtream",
        "description": "Highest rated blockbusters and trending movie releases.",
        "url": "local:top-movies.m3u",
        "original_url": "https://aymrgknetzpucldhpkwm.supabase.co/storage/v1/object/public/tmdb/top-movies.m3u",
        "channel_count": "4,000+ Movies",
    },
    # --- Public TV Categories ---
    {
        "id": "xtream-cat-movies",
        "name": "Cinema & Movies Live",
        "category": "Movies",
        "group": "Categories",
        "icon": "🎬",
        "badge": "780+ Channels",
        "description": "24/7 non-stop movie broadcasts from international cinema networks.",
        "url": "https://iptv-org.github.io/iptv/categories/movies.m3u",
        "channel_count": "780 Channels",
    },
    {
        "id": "xtream-cat-entertainment",
        "name": "Entertainment Networks",
        "category": "Entertainment",
        "group": "Categories",
        "icon": "🍿",
        "badge": "910+ Channels",
        "description": "Prime entertainment networks, reality TV, drama, and comedy.",
        "url": "https://iptv-org.github.io/iptv/categories/entertainment.m3u",
        "channel_count": "918 Channels",
    },
    {
        "id": "xtream-cat-sports",
        "name": "Live Sports Worldwide",
        "category": "Sports",
        "group": "Categories",
        "icon": "⚽",
        "badge": "530+ Channels",
        "description": "Football, cricket, motorsports, basketball, combat sports, and athletics.",
        "url": "https://iptv-org.github.io/iptv/categories/sports.m3u",
        "channel_count": "533 Channels",
    },
    {
        "id": "xtream-cat-news",
        "name": "Global 24/7 News",
        "category": "News",
        "group": "Categories",
        "icon": "📰",
        "badge": "1,060+ Channels",
        "description": "Breaking international news, financial headlines, and live reporting.",
        "url": "https://iptv-org.github.io/iptv/categories/news.m3u",
        "channel_count": "1,066 Channels",
    },
    {
        "id": "xtream-cat-music",
        "name": "Music Television Live",
        "category": "Music",
        "group": "Categories",
        "icon": "🎵",
        "badge": "780+ Channels",
        "description": "Continuous music videos, retro hits, pop, rock, EDM, and concerts.",
        "url": "https://iptv-org.github.io/iptv/categories/music.m3u",
        "channel_count": "780 Channels",
    },
    {
        "id": "xtream-cat-documentary",
        "name": "Documentary & Science",
        "category": "Documentary",
        "group": "Categories",
        "icon": "🦁",
        "badge": "250+ Channels",
        "description": "Nature, wildlife, history, science, space exploration, and archaeology.",
        "url": "https://iptv-org.github.io/iptv/categories/documentary.m3u",
        "channel_count": "250 Channels",
    },
    {
        "id": "xtream-cat-series",
        "name": "TV Series Broadcasts",
        "category": "Series",
        "group": "Categories",
        "icon": "📺",
        "badge": "180+ Channels",
        "description": "Continuous television drama, sitcoms, serials, and classic shows.",
        "url": "https://iptv-org.github.io/iptv/categories/series.m3u",
        "channel_count": "180+ Channels",
    },
    {
        "id": "xtream-cat-animation",
        "name": "Animation & Anime Live",
        "category": "Animation",
        "group": "Categories",
        "icon": "🎨",
        "badge": "140+ Channels",
        "description": "Anime networks, cartoon broadcasts, and animated features.",
        "url": "https://iptv-org.github.io/iptv/categories/animation.m3u",
        "channel_count": "140 Channels",
    },
    {
        "id": "xtream-cat-comedy",
        "name": "Comedy Central & Classics",
        "category": "Comedy",
        "group": "Categories",
        "icon": "😂",
        "badge": "110+ Channels",
        "description": "Stand-up specials, comedy movies, funny shows, and comedic broadcasts.",
        "url": "https://iptv-org.github.io/iptv/categories/comedy.m3u",
        "channel_count": "110 Channels",
    },
    {
        "id": "xtream-cat-kids",
        "name": "Kids & Family Television",
        "category": "Kids",
        "group": "Categories",
        "icon": "🧸",
        "badge": "220+ Channels",
        "description": "Cartoons, educational shows, teen series, and family entertainment.",
        "url": "https://iptv-org.github.io/iptv/categories/kids.m3u",
        "channel_count": "220 Channels",
    },
    # --- Public TV by Country ---
    {
        "id": "xtream-country-us",
        "name": "United States Live",
        "category": "Country",
        "group": "Countries",
        "icon": "🇺🇸",
        "badge": "1,490+ Channels",
        "description": "US national networks, local news, sports, entertainment, and public broadcasts.",
        "url": "https://iptv-org.github.io/iptv/countries/us.m3u",
        "channel_count": "1,498 Channels",
    },
    {
        "id": "xtream-country-in",
        "name": "India Television Live",
        "category": "Country",
        "group": "Countries",
        "icon": "🇮🇳",
        "badge": "820+ Channels",
        "description": "Hindi, Telugu, Tamil, Malayalam, Kannada, Punjabi, and Bengali television.",
        "url": "https://iptv-org.github.io/iptv/countries/in.m3u",
        "channel_count": "820 Channels",
    },
    {
        "id": "xtream-country-uk",
        "name": "United Kingdom Live",
        "category": "Country",
        "group": "Countries",
        "icon": "🇬🇧",
        "badge": "300+ Channels",
        "description": "British broadcasting, UK entertainment, news, movies, and music.",
        "url": "https://iptv-org.github.io/iptv/countries/uk.m3u",
        "channel_count": "308 Channels",
    },
    {
        "id": "xtream-country-ca",
        "name": "Canada Live",
        "category": "Country",
        "group": "Countries",
        "icon": "🇨🇦",
        "badge": "260+ Channels",
        "description": "Canadian English and French television channels, CBC, and regional news.",
        "url": "https://iptv-org.github.io/iptv/countries/ca.m3u",
        "channel_count": "265 Channels",
    },
    {
        "id": "xtream-country-au",
        "name": "Australia Live",
        "category": "Country",
        "group": "Countries",
        "icon": "🇦🇺",
        "badge": "80+ Channels",
        "description": "Australian broadcasting, local news, sports, and lifestyle networks.",
        "url": "https://iptv-org.github.io/iptv/countries/au.m3u",
        "channel_count": "79 Channels",
    },
    {
        "id": "xtream-country-vn",
        "name": "Vietnam Live (VN)",
        "category": "Country",
        "group": "Countries",
        "icon": "🇻🇳",
        "badge": "90+ Channels",
        "description": "Vietnamese television channels (VTV, HTV, VTC) featured in m3u8-xtream.",
        "url": "https://iptv-org.github.io/iptv/countries/vn.m3u",
        "channel_count": "93 Channels",
    },
    # --- Master Collection ---
    {
        "id": "xtream-index-all",
        "name": "Complete Worldwide Index",
        "category": "All",
        "group": "Master",
        "icon": "🌐",
        "badge": "18,000+ Channels",
        "description": "The entire master iptv-org directory indexed by m3u8-xtream.",
        "url": "https://iptv-org.github.io/iptv/index.m3u",
        "channel_count": "18,000+ Channels",
    },
]


def _resolve_url_or_content(url_str: str) -> Tuple[Optional[str], Optional[str]]:
    """Returns (resolved_remote_url, direct_local_content)."""
    url = url_str.strip()

    # Local preset references
    if url == "local:top-movies.m3u" or "top-movies.m3u" in url:
        local_top = os.path.join(PRESETS_DIR, "top-movies.m3u")
        if os.path.exists(local_top) and os.path.getsize(local_top) > 1000:
            try:
                with open(local_top, "r", encoding="utf-8") as f:
                    return None, f.read()
            except Exception as e:
                logger.warning(f"Failed to read local top-movies.m3u: {e}")
        return "https://iptv-org.github.io/iptv/categories/movies.m3u", None

    if "trending-series.m3u" in url:
        return "https://iptv-org.github.io/iptv/categories/series.m3u", None

    if "aymrgknetzpucldhpkwm.supabase.co" in url:
        # Fallback for genre movies to iptv-org categories
        if "action-movies" in url or "adventure-movies" in url or "crime-movies" in url:
            return "https://iptv-org.github.io/iptv/categories/movies.m3u", None
        if "comedy-movies" in url:
            return "https://iptv-org.github.io/iptv/categories/comedy.m3u", None
        if "animation-movies" in url:
            return "https://iptv-org.github.io/iptv/categories/animation.m3u", None
        return "https://iptv-org.github.io/iptv/categories/movies.m3u", None

    return url, None


def _get_cache_path(url_str: str) -> str:
    h = hashlib.sha256(url_str.encode("utf-8")).hexdigest()[:24]
    return os.path.join(CACHE_DIR, f"pl_{h}.json")


def _read_cache(url_str: str) -> Optional[List[Dict[str, Any]]]:
    cache_file = _get_cache_path(url_str)
    if os.path.exists(cache_file):
        try:
            mtime = os.path.getmtime(cache_file)
            if time.time() - mtime < CACHE_TTL:
                with open(cache_file, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception as e:
            logger.warning(f"Failed to read playlist cache: {e}")
    return None


def _write_cache(url_str: str, channels: List[Dict[str, Any]]) -> None:
    cache_file = _get_cache_path(url_str)
    try:
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(channels, f)
    except Exception as e:
        logger.warning(f"Failed to write playlist cache: {e}")


class RemoteM3URequest(BaseModel):
    url: str


class LoadPresetRequest(BaseModel):
    preset_id: str


@router.get("/presets")
async def get_playlist_presets():
    """Returns curated presets from https://github.com/m3u8-xtream/m3u8-xtream-playlist."""
    return {"presets": M3U8_XTREAM_PRESETS, "total": len(M3U8_XTREAM_PRESETS)}


@router.post("/load-preset")
async def load_preset(payload: LoadPresetRequest):
    """Loads channels from an m3u8-xtream preset by ID."""
    preset = next((p for p in M3U8_XTREAM_PRESETS if p["id"] == payload.preset_id), None)
    if not preset:
        raise HTTPException(status_code=404, detail=f"Preset '{payload.preset_id}' not found.")

    url = preset["url"]
    cached = _read_cache(url)
    if cached is not None:
        return {
            "preset": preset,
            "channels": cached,
            "total": len(cached),
            "cached": True,
        }

    resolved_url, direct_content = _resolve_url_or_content(url)
    if direct_content is not None:
        channels = playlist_service.parse_m3u_text(direct_content)
        _write_cache(url, channels)
        return {
            "preset": preset,
            "channels": channels,
            "total": len(channels),
            "cached": False,
        }

    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True, headers={"User-Agent": settings.USER_AGENT}) as client:
            resp = await client.get(resolved_url)
            if resp.status_code != 200:
                raise HTTPException(status_code=400, detail=f"Failed to fetch preset playlist: HTTP {resp.status_code}")
            channels = playlist_service.parse_m3u_text(resp.text)
            _write_cache(url, channels)
            return {
                "preset": preset,
                "channels": channels,
                "total": len(channels),
                "cached": False,
            }
    except Exception as e:
        logger.error(f"Error loading preset {payload.preset_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error loading preset: {str(e)}")


@router.post("/parse-url")
async def parse_remote_m3u(payload: RemoteM3URequest):
    """Fetches a remote M3U/M3U8 file and returns structured channel items."""
    raw_url = str(payload.url).strip()
    if not raw_url:
        raise HTTPException(status_code=400, detail="Missing playlist URL.")

    # Check cache first
    cached = _read_cache(raw_url)
    if cached is not None:
        return {"channels": cached, "total": len(cached), "cached": True}

    resolved_url, direct_content = _resolve_url_or_content(raw_url)
    if direct_content is not None:
        channels = playlist_service.parse_m3u_text(direct_content)
        _write_cache(raw_url, channels)
        return {"channels": channels, "total": len(channels), "cached": False}

    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True, headers={"User-Agent": settings.USER_AGENT}) as client:
            resp = await client.get(resolved_url)
            if resp.status_code != 200:
                raise HTTPException(status_code=400, detail=f"Failed to fetch M3U playlist: HTTP {resp.status_code}")
            channels = playlist_service.parse_m3u_text(resp.text)
            _write_cache(raw_url, channels)
            return {"channels": channels, "total": len(channels), "cached": False}
    except Exception as e:
        logger.error(f"Error parsing playlist URL {raw_url}: {e}")
        raise HTTPException(status_code=500, detail=f"Error parsing playlist URL: {str(e)}")


@router.post("/parse-file")
async def parse_uploaded_m3u(file: UploadFile = File(...)):
    """Uploads and parses a local .m3u or .m3u8 playlist file."""
    try:
        content_bytes = await file.read()
        content = content_bytes.decode("utf-8", errors="ignore")
        channels = playlist_service.parse_m3u_text(content)
        return {"filename": file.filename, "channels": channels, "total": len(channels)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")


@router.post("/refresh")
async def trigger_refresh():
    """Triggers background resynchronization with iptv-org directory."""
    if playlist_service.is_loading:
        return {"status": "in_progress", "message": "Synchronization is already underway."}
    asyncio.create_task(playlist_service.refresh_data())
    return {"status": "started", "message": "Background synchronization started."}
