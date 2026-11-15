import logging
from typing import Any, Dict, List, Optional
from app.services.playlist_service import playlist_service

logger = logging.getLogger("pkp_tv.vod")


class VodService:
    """Provides curated Live Movie and TV Series channels for Google TV rails and billboard.

    All items originate from authentic IPTV broadcast streams with official broadcaster logos.
    No fake mock links or external subscription redirects.
    """

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
        """Spotlight channels for the Google TV hero carousel with official broadcaster logos."""
        spotlight = playlist_service.get_spotlight_channels(limit=10)
        return [self._channel_to_vod(c, item_type="movie") for c in spotlight]

    def get_movies(self, country: Optional[str] = None) -> List[Dict[str, Any]]:
        """24/7 Live movie channels (Bollywood, Hollywood, regional cinema, classics)."""
        c_filter = country.upper() if country and country.upper() != "ALL" else None
        channels, _ = playlist_service.search_channels(category="movies", country=c_filter, limit=80)
        # Add classic channels if space allows
        if len(channels) < 40:
            classic, _ = playlist_service.search_channels(category="classic", country=c_filter, limit=30)
            seen = {c["id"] for c in channels}
            for cl in classic:
                if cl["id"] not in seen:
                    channels.append(cl)
                    seen.add(cl["id"])

        return [self._channel_to_vod(c, item_type="movie") for c in channels]

    def get_shows(self, country: Optional[str] = None) -> List[Dict[str, Any]]:
        """24/7 Live television series, drama serials, and sitcom channels."""
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
        """Removed external providers to keep pure in-app IPTV streaming."""
        return []


vod_service = VodService()
