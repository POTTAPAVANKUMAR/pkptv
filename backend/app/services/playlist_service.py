import asyncio
import json
import logging
import os
import re
import time
from typing import Any, Dict, List, Optional, Tuple
import httpx
from app.core.config import settings

logger = logging.getLogger("pkp_tv.playlist")


class PlaylistService:
    def __init__(self):
        self.data_dir = settings.DATA_DIR
        os.makedirs(self.data_dir, exist_ok=True)
        self.channels: List[Dict[str, Any]] = []
        self.channels_by_id: Dict[str, Dict[str, Any]] = {}
        self.categories: List[Dict[str, Any]] = []
        self.countries: List[Dict[str, Any]] = []
        self.last_updated: float = 0
        self.is_loading: bool = False
        self._init_task: Optional[asyncio.Task] = None

    async def initialize(self) -> None:
        """Load from cache if fresh, otherwise fetch from iptv-org API."""
        if self.is_loading:
            return
        self.is_loading = True
        try:
            cache_file = os.path.join(self.data_dir, "aggregated_channels.json")
            cache_valid = False

            if os.path.exists(cache_file):
                mtime = os.path.getmtime(cache_file)
                if time.time() - mtime < settings.CACHE_EXPIRY_HOURS * 3600:
                    try:
                        with open(cache_file, "r", encoding="utf-8") as f:
                            cached_data = json.load(f)
                            self.channels = cached_data.get("channels", [])
                            self.categories = cached_data.get("categories", [])
                            self.countries = cached_data.get("countries", [])
                            self.last_updated = mtime
                            self.channels_by_id = {c["id"]: c for c in self.channels}
                            cache_valid = True
                            logger.info(f"Loaded {len(self.channels)} channels from local cache.")
                    except Exception as e:
                        logger.warning(f"Failed to read local cache: {e}. Fetching fresh data.")

            if not cache_valid:
                await self.refresh_data()
        finally:
            self.is_loading = False

    async def refresh_data(self) -> None:
        """Fetch remote JSON datasets from iptv-org API and build indexes."""
        logger.info("Fetching fresh dataset from iptv-org API...")
        headers = {"User-Agent": settings.USER_AGENT}

        async with httpx.AsyncClient(timeout=30.0, headers=headers) as client:
            try:
                # Fetch categories, countries, streams, channels, and logos in parallel
                cat_req = client.get(f"{settings.IPTV_ORG_API_BASE}/categories.json")
                country_req = client.get(f"{settings.IPTV_ORG_API_BASE}/countries.json")
                stream_req = client.get(f"{settings.IPTV_ORG_API_BASE}/streams.json")
                chan_req = client.get(f"{settings.IPTV_ORG_API_BASE}/channels.json")
                logo_req = client.get(f"{settings.IPTV_ORG_API_BASE}/logos.json")

                res_cat, res_country, res_stream, res_chan, res_logo = await asyncio.gather(
                    cat_req, country_req, stream_req, chan_req, logo_req, return_exceptions=True
                )

                if any(isinstance(r, Exception) for r in (res_cat, res_country, res_stream, res_chan)):
                    logger.error("Failed fetching one or more IPTV datasets from iptv-org API.")
                    return

                raw_categories = res_cat.json() if res_cat.status_code == 200 else []
                raw_countries = res_country.json() if res_country.status_code == 200 else []
                raw_streams = res_stream.json() if res_stream.status_code == 200 else []
                raw_channels = res_chan.json() if res_chan.status_code == 200 else []
                raw_logos = (
                    res_logo.json()
                    if not isinstance(res_logo, Exception) and res_logo.status_code == 200
                    else []
                )

                # Index official logos
                logo_map: Dict[str, str] = {}
                for l in raw_logos:
                    if isinstance(l, dict) and l.get("channel") and l.get("url"):
                        cid = l["channel"]
                        if cid not in logo_map or l.get("in_use"):
                            logo_map[cid] = l["url"]

                # Build lookup map for channels by id
                channel_info_map = {c["id"]: c for c in raw_channels if isinstance(c, dict) and "id" in c}
                country_map = {c["code"].upper(): c for c in raw_countries if isinstance(c, dict) and "code" in c}
                category_names = {c["id"]: c.get("name", c["id"].title()) for c in raw_categories if isinstance(c, dict)}

                # Group streams by channel id or generate synthetic channel for standalone streams
                merged_channels: List[Dict[str, Any]] = []
                channel_streams_map: Dict[str, List[Dict[str, Any]]] = {}

                for s in raw_streams:
                    chan_id = s.get("channel")
                    url = s.get("url")
                    if not url:
                        continue
                    if chan_id:
                        if chan_id not in channel_streams_map:
                            channel_streams_map[chan_id] = []
                        channel_streams_map[chan_id].append(s)

                # Merge channel metadata with streams
                category_counts: Dict[str, int] = {}
                country_counts: Dict[str, int] = {}

                for chan_id, stream_list in channel_streams_map.items():
                    chan_meta = channel_info_map.get(chan_id)
                    if not chan_meta:
                        continue
                    # Skip adult/nsfw channels
                    if chan_meta.get("is_nsfw"):
                        continue

                    country_code = (chan_meta.get("country") or "").upper()
                    country_info = country_map.get(country_code, {})
                    cats = chan_meta.get("categories") or ["general"]
                    primary_stream = stream_list[0]

                    channel_obj = {
                        "id": chan_id,
                        "name": chan_meta.get("name") or primary_stream.get("title") or chan_id,
                        "alt_names": chan_meta.get("alt_names") or [],
                        "logo": logo_map.get(chan_id) or chan_meta.get("logo") or "",
                        "country": country_code,
                        "country_name": country_info.get("name", country_code),
                        "country_flag": country_info.get("flag", "🌐"),
                        "categories": cats,
                        "languages": chan_meta.get("languages") or [],
                        "website": chan_meta.get("website") or "",
                        "stream_url": primary_stream.get("url"),
                        "quality": primary_stream.get("quality") or "HD",
                        "available_streams": [
                            {
                                "url": st.get("url"),
                                "quality": st.get("quality") or "HD",
                                "feed": st.get("feed") or "Main",
                            }
                            for st in stream_list
                        ],
                    }
                    merged_channels.append(channel_obj)

                    for cat in cats:
                        category_counts[cat] = category_counts.get(cat, 0) + 1
                    if country_code:
                        country_counts[country_code] = country_counts.get(country_code, 0) + 1

                # Sort channels alphabetically by name
                merged_channels.sort(key=lambda x: x["name"].lower())

                # Build categories with counts
                formatted_categories = [
                    {
                        "id": cat_id,
                        "name": category_names.get(cat_id, cat_id.title()),
                        "count": count,
                    }
                    for cat_id, count in sorted(category_counts.items(), key=lambda x: -x[1])
                ]

                # Build countries with counts
                formatted_countries = [
                    {
                        "code": code,
                        "name": country_map.get(code, {}).get("name", code),
                        "flag": country_map.get(code, {}).get("flag", "🌐"),
                        "count": count,
                    }
                    for code, count in sorted(country_counts.items(), key=lambda x: -x[1])
                ]

                self.channels = merged_channels
                self.channels_by_id = {c["id"]: c for c in self.channels}
                self.categories = formatted_categories
                self.countries = formatted_countries
                self.last_updated = time.time()

                # Save cache
                cache_file = os.path.join(self.data_dir, "aggregated_channels.json")
                with open(cache_file, "w", encoding="utf-8") as f:
                    json.dump(
                        {
                            "channels": self.channels,
                            "categories": self.categories,
                            "countries": self.countries,
                            "updated_at": self.last_updated,
                        },
                        f,
                    )
                logger.info(f"Successfully aggregated {len(self.channels)} playable live channels!")
            except Exception as e:
                logger.error(f"Error during refresh_data: {e}", exc_info=True)

    def search_channels(
        self,
        query: Optional[str] = None,
        category: Optional[str] = None,
        country: Optional[str] = None,
        language: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Fast filter and search over aggregated channels list."""
        results = self.channels

        if country:
            c_upper = country.upper()
            results = [c for c in results if c.get("country") == c_upper]

        if category and category.lower() != "all":
            cat_lower = category.lower()
            results = [c for c in results if cat_lower in [ct.lower() for ct in c.get("categories", [])]]

        if language:
            lang_lower = language.lower()
            results = [c for c in results if lang_lower in [l.lower() for l in c.get("languages", [])]]

        if query:
            q = query.strip().lower()
            filtered = []
            for c in results:
                if q in c["name"].lower():
                    filtered.append(c)
                elif any(q in alt.lower() for alt in c.get("alt_names", [])):
                    filtered.append(c)
                elif q in c.get("country_name", "").lower():
                    filtered.append(c)
            results = filtered

        total = len(results)
        paginated = results[offset : offset + limit]
        return paginated, total

    def get_channel(self, channel_id: str) -> Optional[Dict[str, Any]]:
        return self.channels_by_id.get(channel_id)

    def get_spotlight_channels(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Returns top curated live channels with official broadcaster logos and streams for billboard."""
        priority_ids = [
            "ZeeCinema.in",
            "StarPlus.in",
            "Colors.in",
            "AsianetMovies.in",
            "ColorsCineplex.in",
            "AajTak.in",
            "24HourFreeMovies.us",
            "B4UMovies.in",
            "RetroMovies.us",
            "70sCinema.us",
            "AlankarTV.in",
            "AllTimeMovies.in",
        ]
        spotlights: List[Dict[str, Any]] = []
        seen = set()

        # Add priority channels that exist and have logos
        for pid in priority_ids:
            chan = self.channels_by_id.get(pid)
            if chan and chan.get("logo") and chan.get("stream_url"):
                spotlights.append(chan)
                seen.add(chan["id"])

        # Fill remaining slots with top movie and entertainment channels with logos
        if len(spotlights) < limit:
            for chan in self.channels:
                if chan["id"] in seen or not chan.get("logo") or not chan.get("stream_url"):
                    continue
                cats = chan.get("categories", [])
                if chan.get("country") in ("IN", "US") and any(
                    c in cats for c in ("movies", "entertainment", "classic", "series")
                ):
                    spotlights.append(chan)
                    seen.add(chan["id"])
                    if len(spotlights) >= limit:
                        break

        return spotlights[:limit]

    @staticmethod
    def parse_m3u_text(content: str) -> List[Dict[str, Any]]:
        """Parses raw M3U / M3U8 string content into structured channel objects."""
        country_flags = {
            "US": ("United States", "🇺🇸"),
            "IN": ("India", "🇮🇳"),
            "UK": ("United Kingdom", "🇬🇧"),
            "GB": ("United Kingdom", "🇬🇧"),
            "CA": ("Canada", "🇨🇦"),
            "AU": ("Australia", "🇦🇺"),
            "VN": ("Vietnam", "🇻🇳"),
            "FR": ("France", "🇫🇷"),
            "DE": ("Germany", "🇩🇪"),
            "IT": ("Italy", "🇮🇹"),
            "ES": ("Spain", "🇪🇸"),
            "BR": ("Brazil", "🇧🇷"),
            "MX": ("Mexico", "🇲🇽"),
            "JP": ("Japan", "🇯🇵"),
            "KR": ("South Korea", "🇰🇷"),
            "RU": ("Russia", "🇷🇺"),
            "NL": ("Netherlands", "🇳🇱"),
            "AE": ("United Arab Emirates", "🇦🇪"),
            "PK": ("Pakistan", "🇵🇰"),
            "BD": ("Bangladesh", "🇧🇩"),
            "ZA": ("South Africa", "🇿🇦"),
            "TR": ("Turkey", "🇹🇷"),
        }

        channels: List[Dict[str, Any]] = []
        current_meta: Dict[str, Any] = {}
        seen_ids = set()

        for line in content.splitlines():
            line = line.strip()
            if not line:
                continue

            if line.startswith("#EXTINF:"):
                # Extract attributes
                tvg_id = re.search(r'tvg-id="([^"]*)"', line)
                tvg_name = re.search(r'tvg-name="([^"]*)"', line)
                tvg_logo = re.search(r'tvg-logo="([^"]*)"', line)
                tvg_country = re.search(r'tvg-country="([^"]*)"', line)
                group_title = re.search(r'group-title="([^"]*)"', line)

                # Channel title is everything after last comma
                comma_idx = line.rfind(",")
                raw_title = line[comma_idx + 1 :].strip() if comma_idx != -1 else "Unknown Channel"
                display_name = raw_title or (tvg_name.group(1) if tvg_name else "Channel")

                raw_id_str = tvg_id.group(1) if tvg_id and tvg_id.group(1) else f"ch-{len(channels)+1}"
                chan_id = raw_id_str
                if chan_id in seen_ids:
                    chan_id = f"{raw_id_str}_{len(channels)+1}"
                seen_ids.add(chan_id)

                # Infer country from tvg-country or tvg-id (e.g. 'CNN.us@SD' -> 'US')
                c_code = "CUSTOM"
                if tvg_country and tvg_country.group(1):
                    c_code = tvg_country.group(1).upper()
                else:
                    c_match = re.search(r"\.([a-z]{2})(?:@|$)", raw_id_str, re.IGNORECASE)
                    if c_match:
                        c_code = c_match.group(1).upper()

                c_name, c_flag = country_flags.get(c_code, (c_code if c_code != "CUSTOM" else "Live TV", "📺" if c_code == "CUSTOM" else "🌐"))

                # Parse categories / genres
                cats = ["Live TV"]
                if group_title and group_title.group(1):
                    raw_cats = [c.strip() for c in re.split(r"[;,/]", group_title.group(1)) if c.strip()]
                    if raw_cats:
                        cats = raw_cats

                # Infer quality
                quality = "HD"
                if "1080" in display_name:
                    quality = "1080p FHD"
                elif "720" in display_name:
                    quality = "720p HD"
                elif "4k" in display_name.lower():
                    quality = "4K UHD"
                elif "sd" in display_name.lower():
                    quality = "SD"

                current_meta = {
                    "id": chan_id,
                    "name": display_name,
                    "logo": tvg_logo.group(1) if tvg_logo else "",
                    "categories": cats,
                    "country": c_code,
                    "country_name": c_name,
                    "country_flag": c_flag,
                    "quality": quality,
                }
            elif not line.startswith("#") and (line.startswith("http://") or line.startswith("https://")):
                if current_meta:
                    current_meta["stream_url"] = line
                    current_meta["available_streams"] = [{"url": line, "quality": current_meta.get("quality", "HD"), "feed": "Main"}]
                    channels.append(current_meta)
                    current_meta = {}

        return channels


playlist_service = PlaylistService()
