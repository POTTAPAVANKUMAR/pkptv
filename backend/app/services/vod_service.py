import logging
import os
import re
from typing import Any, Dict, List, Optional
from app.core.config import settings
from app.services.playlist_service import playlist_service

logger = logging.getLogger("pkp_tv.vod")

# Curated High-Definition Free & Open Cinema Movies (Permanent, Never Expires)
PERMANENT_FREE_MOVIES: List[Dict[str, Any]] = [
    {
        "id": "free_movie_tears_of_steel",
        "title": "Tears of Steel (Sci-Fi / VFX)",
        "type": "movie",
        "country": "NL",
        "country_name": "Netherlands",
        "country_flag": "🇳🇱",
        "poster": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Tears_of_Steel_poster.jpg/800px-Tears_of_Steel_poster.jpg",
        "backdrop": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Tears_of_Steel_poster.jpg/800px-Tears_of_Steel_poster.jpg",
        "rating": "★ 7.8 (Sci-Fi)",
        "year": "2012",
        "duration": "12m 14s",
        "genres": ["Sci-Fi", "VFX", "Action"],
        "provider": "Open Cinema HD",
        "provider_logo": "🎬",
        "description": "Set in a dystopian future where humanity battles sentient robots in Amsterdam.",
        "stream_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
        "is_streamable": True,
        "quality": "1080p FHD",
        "is_free": True,
    },
    {
        "id": "free_movie_sintel",
        "title": "Sintel (Fantasy / Adventure)",
        "type": "movie",
        "country": "NL",
        "country_name": "Netherlands",
        "country_flag": "🇳🇱",
        "poster": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Sintel_poster.jpg/800px-Sintel_poster.jpg",
        "backdrop": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Sintel_poster.jpg/800px-Sintel_poster.jpg",
        "rating": "★ 8.2 (Fantasy)",
        "year": "2010",
        "duration": "15m",
        "genres": ["Fantasy", "Animation", "Adventure"],
        "provider": "Blender Studio",
        "provider_logo": "🐉",
        "description": "A lonely young woman searches the world for a baby dragon she nurtured and befriended.",
        "stream_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
        "is_streamable": True,
        "quality": "1080p FHD",
        "is_free": True,
    },
    {
        "id": "free_movie_big_buck_bunny",
        "title": "Big Buck Bunny (Family / Comedy)",
        "type": "movie",
        "country": "US",
        "country_name": "United States",
        "country_flag": "🇺🇸",
        "poster": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/800px-Big_buck_bunny_poster_big.jpg",
        "backdrop": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/800px-Big_buck_bunny_poster_big.jpg",
        "rating": "★ 8.5 (Comedy)",
        "year": "2008",
        "duration": "10m",
        "genres": ["Comedy", "Animation", "Kids"],
        "provider": "Open Animation",
        "provider_logo": "🐰",
        "description": "A gentle giant rabbit seeks justice against forest bullies who ruin his peaceful morning.",
        "stream_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        "is_streamable": True,
        "quality": "1080p FHD",
        "is_free": True,
    },
    {
        "id": "free_movie_elephants_dream",
        "title": "Elephants Dream (Sci-Fi Classic)",
        "type": "movie",
        "country": "NL",
        "country_name": "Netherlands",
        "country_flag": "🇳🇱",
        "poster": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Elephants_Dream_poster.jpg/800px-Elephants_Dream_poster.jpg",
        "backdrop": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Elephants_Dream_poster.jpg/800px-Elephants_Dream_poster.jpg",
        "rating": "★ 7.5 (Sci-Fi)",
        "year": "2006",
        "duration": "11m",
        "genres": ["Sci-Fi", "Mystery"],
        "provider": "Orange Open Movie",
        "provider_logo": "⚙️",
        "description": "Two characters journey through a colossal, ever-shifting organic mechanical labyrinth.",
        "stream_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        "is_streamable": True,
        "quality": "1080p FHD",
        "is_free": True,
    },
]


class VodService:
    def __init__(self):
        self.movies_dir = os.path.join(settings.DATA_DIR, "movies")
        os.makedirs(self.movies_dir, exist_ok=True)

    def get_local_movies(self) -> List[Dict[str, Any]]:
        """Scans the Pi / local storage directory for saved offline movies."""
        if not os.path.exists(self.movies_dir):
            return []

        movies = []
        valid_exts = {".mp4", ".mkv", ".webm", ".avi", ".mov"}

        try:
            for entry in os.scandir(self.movies_dir):
                if entry.is_file():
                    ext = os.path.splitext(entry.name)[1].lower()
                    if ext in valid_exts:
                        stat = entry.stat()
                        size_mb = round(stat.st_size / (1024 * 1024), 1)

                        # Clean title for display
                        base_name = os.path.splitext(entry.name)[0]
                        clean_title = re.sub(r"[_\.]", " ", base_name)
                        clean_title = re.sub(r"\s+", " ", clean_title).strip()

                        movies.append(
                            {
                                "id": f"local_{entry.name}",
                                "title": clean_title,
                                "type": "movie",
                                "filename": entry.name,
                                "country": "LOCAL",
                                "country_name": "Pi Storage",
                                "country_flag": "💾",
                                "poster": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80",
                                "backdrop": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80",
                                "rating": "Saved Offline",
                                "year": "Pi Local",
                                "duration": f"{size_mb} MB",
                                "genres": ["Saved Movie", "Local Storage"],
                                "provider": "Raspberry Pi Local Drive",
                                "provider_logo": "💾",
                                "description": f"Archived locally on your server ({size_mb} MB). Permanent ownership - plays without internet or provider accounts.",
                                "stream_url": f"/api/v1/vod/stream/{entry.name}",
                                "is_streamable": True,
                                "is_local": True,
                                "quality": "Direct Original",
                                "file_size_mb": size_mb,
                            }
                        )
        except Exception as e:
            logger.error(f"Failed to scan local movies: {e}")

        return sorted(movies, key=lambda x: x["title"].lower())

    def delete_local_movie(self, filename: str) -> bool:
        safe_filename = os.path.basename(filename)
        path = os.path.join(self.movies_dir, safe_filename)
        if os.path.exists(path):
            try:
                os.remove(path)
                return True
            except Exception as e:
                logger.error(f"Failed to delete local movie {safe_filename}: {e}")
        return False

    def get_permanent_free_movies(self) -> List[Dict[str, Any]]:
        return PERMANENT_FREE_MOVIES

    @staticmethod
    def _channel_to_vod(chan: Dict[str, Any], item_type: str = "movie") -> Dict[str, Any]:
        categories = chan.get("categories", [])
        genre_display = [cat.title() for cat in categories] if categories else ["Live TV"]
        country_code = chan.get("country", "")
        country_name = chan.get("country_name", country_code)
        flag = chan.get("country_flag", "🌐")
        logo = chan.get("logo") or ""

        return {
            "id": chan.get("id"),
            "title": chan.get("name"),
            "type": item_type,
            "country": country_code,
            "country_name": country_name,
            "country_flag": flag,
            "poster": logo,
            "backdrop": logo,
            "rating": "Live HD",
            "year": "24/7",
            "duration": "Live Channel",
            "genres": genre_display,
            "provider": f"{country_name} TV",
            "provider_logo": flag,
            "description": f"Live 24/7 broadcast on {chan.get('name')}. Streamed directly in high definition.",
            "stream_url": chan.get("stream_url"),
            "is_streamable": True,
            "quality": chan.get("quality") or "HD",
        }

    def get_featured(self) -> List[Dict[str, Any]]:
        """Featured spotlight for the Google TV hero carousel."""
        # Include our free permanent movies in the spotlight!
        featured = list(PERMANENT_FREE_MOVIES[:2])
        spotlight = playlist_service.get_spotlight_channels(limit=8)
        featured.extend([self._channel_to_vod(c, item_type="movie") for c in spotlight])
        return featured

    def get_movies(self, country: Optional[str] = None) -> List[Dict[str, Any]]:
        """24/7 Live movie channels."""
        c_filter = country.upper() if country and country.upper() != "ALL" else None
        channels, _ = playlist_service.search_channels(category="movies", country=c_filter, limit=80)
        if len(channels) < 40:
            classic, _ = playlist_service.search_channels(category="classic", country=c_filter, limit=30)
            seen = {c["id"] for c in channels}
            for cl in classic:
                if cl["id"] not in seen:
                    channels.append(cl)
                    seen.add(cl["id"])

        return [self._channel_to_vod(c, item_type="movie") for c in channels]

    def get_shows(self, country: Optional[str] = None) -> List[Dict[str, Any]]:
        """24/7 Live television series."""
        c_filter = country.upper() if country and country.upper() != "ALL" else None
        channels, _ = playlist_service.search_channels(category="series", country=c_filter, limit=60)
        ent, _ = playlist_service.search_channels(category="entertainment", country=c_filter, limit=60)
        seen = {c["id"] for c in channels}
        for e in ent:
            if e["id"] not in seen:
                channels.append(e)
                seen.add(e["id"])

        return [self._channel_to_vod(c, item_type="show") for c in channels]

    def get_providers(self) -> List[Dict[str, Any]]:
        return []


vod_service = VodService()
