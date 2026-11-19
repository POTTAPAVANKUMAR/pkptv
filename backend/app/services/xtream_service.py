import asyncio
import json
import logging
import os
import re
import time
from typing import Any, Dict, List, Optional
import httpx
from app.core.config import settings

logger = logging.getLogger("pkp_tv.xtream")


class XtreamService:
    def __init__(self):
        self.users_file = os.path.join(settings.DATA_DIR, "xtream_users.json")
        self.movies_dir = os.path.join(settings.DATA_DIR, "movies")
        os.makedirs(self.movies_dir, exist_ok=True)
        self._init_local_users()

        # In-memory download task tracker
        # { task_id: { id, title, stream_url, filename, total_bytes, downloaded_bytes, progress, speed_kbps, status, error, started_at } }
        self.active_downloads: Dict[str, Dict[str, Any]] = {}
        self._download_tasks: Dict[str, asyncio.Task] = {}

    def _init_local_users(self):
        """Initializes default local users if file does not exist."""
        if not os.path.exists(self.users_file):
            default_users = [
                {
                    "username": "admin",
                    "password": "pkp",
                    "created_at": int(time.time()),
                    "exp_date": 1893456000,  # Year 2030
                    "max_connections": 5,
                    "active": True,
                    "notes": "Primary Admin account",
                },
                {
                    "username": "family",
                    "password": "familytv@123",
                    "created_at": int(time.time()),
                    "exp_date": 1893456000,
                    "max_connections": 3,
                    "active": True,
                    "notes": "Smart TV / Family account",
                },
            ]
            try:
                with open(self.users_file, "w", encoding="utf-8") as f:
                    json.dump(default_users, f, indent=2)
            except Exception as e:
                logger.error(f"Failed to initialize xtream_users.json: {e}")

    # =========================================================================
    # Local Xtream Server User Management
    # =========================================================================
    def get_local_users(self) -> List[Dict[str, Any]]:
        if not os.path.exists(self.users_file):
            self._init_local_users()
        try:
            with open(self.users_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to read xtream users: {e}")
            return []

    def save_local_users(self, users: List[Dict[str, Any]]) -> bool:
        try:
            with open(self.users_file, "w", encoding="utf-8") as f:
                json.dump(users, f, indent=2)
            return True
        except Exception as e:
            logger.error(f"Failed to save xtream users: {e}")
            return False

    def create_local_user(
        self, username: str, password: str, exp_days: int = 365, max_cons: int = 2, notes: str = ""
    ) -> Dict[str, Any]:
        users = self.get_local_users()
        if any(u["username"].lower() == username.lower() for u in users):
            raise ValueError(f"Username '{username}' already exists.")

        exp_timestamp = int(time.time()) + (exp_days * 86400)
        new_user = {
            "username": username.strip(),
            "password": password.strip(),
            "created_at": int(time.time()),
            "exp_date": exp_timestamp,
            "max_connections": max_cons,
            "active": True,
            "notes": notes,
        }
        users.append(new_user)
        self.save_local_users(users)
        return new_user

    def delete_local_user(self, username: str) -> bool:
        users = self.get_local_users()
        filtered = [u for u in users if u["username"].lower() != username.lower()]
        if len(filtered) == len(users):
            return False
        return self.save_local_users(filtered)

    def verify_local_user(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        users = self.get_local_users()
        now = int(time.time())
        for u in users:
            if u["username"].lower() == username.lower() and u["password"] == password:
                if u.get("active", True) and u.get("exp_date", 0) > now:
                    return u
        return None

    # =========================================================================
    # Upstream Xtream Client Connector (Connecting to 8kplayers.com, etc.)
    # =========================================================================
    @staticmethod
    def _clean_server_url(server_url: str) -> str:
        s = server_url.strip().rstrip("/")
        if not s.startswith("http://") and not s.startswith("https://"):
            s = f"http://{s}"
        return s

    async def authenticate_upstream(self, server: str, user: str, password: str) -> Dict[str, Any]:
        """Validates upstream credentials and returns account information."""
        base = self._clean_server_url(server)
        api_url = f"{base}/player_api.php"
        headers = {"User-Agent": "IPTVSmartersPro"}

        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            try:
                resp = await client.get(
                    api_url,
                    params={"username": user.strip(), "password": password.strip()},
                    headers=headers,
                )
                if resp.status_code != 200:
                    return {"auth": False, "error": f"Server returned HTTP {resp.status_code}"}

                data = resp.json()
                user_info = data.get("user_info", {})
                server_info = data.get("server_info", {})

                is_auth = str(user_info.get("auth")) == "1"
                return {
                    "auth": is_auth,
                    "status": user_info.get("status", "Unknown"),
                    "exp_date": user_info.get("exp_date"),
                    "max_connections": user_info.get("max_connections", "1"),
                    "active_connections": user_info.get("active_cons", "0"),
                    "allowed_formats": user_info.get("allowed_output_formats", ["m3u8", "ts"]),
                    "server_protocol": server_info.get("server_protocol", "http"),
                    "server_port": server_info.get("port", ""),
                    "raw_user_info": user_info,
                }
            except Exception as e:
                logger.error(f"Xtream authentication failed for {server}: {e}")
                return {"auth": False, "error": str(e)}

    async def get_upstream_vod_categories(self, server: str, user: str, password: str) -> List[Dict[str, Any]]:
        base = self._clean_server_url(server)
        api_url = f"{base}/player_api.php"
        async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
            try:
                resp = await client.get(
                    api_url,
                    params={"username": user, "password": password, "action": "get_vod_categories"},
                    headers={"User-Agent": "IPTVSmartersPro"},
                )
                return resp.json() if resp.status_code == 200 else []
            except Exception as e:
                logger.error(f"Failed to fetch VOD categories: {e}")
                return []

    async def get_upstream_vod_streams(
        self, server: str, user: str, password: str, category_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        base = self._clean_server_url(server)
        api_url = f"{base}/player_api.php"
        params = {"username": user, "password": password, "action": "get_vod_streams"}
        if category_id:
            params["category_id"] = str(category_id)

        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            try:
                resp = await client.get(api_url, params=params, headers={"User-Agent": "IPTVSmartersPro"})
                if resp.status_code != 200:
                    return []
                movies = resp.json()

                # Normalize into PKP TV VodItem schemas
                normalized = []
                for m in movies:
                    stream_id = m.get("stream_id")
                    ext = m.get("container_extension") or "mp4"
                    clean_name = m.get("name") or "Untitled Movie"
                    rating = str(m.get("rating") or "PG-13")
                    poster = m.get("stream_icon") or ""

                    # Direct stream URL for this movie
                    movie_stream_url = f"{base}/movie/{user}/{password}/{stream_id}.{ext}"

                    normalized.append(
                        {
                            "id": f"xtream_{stream_id}",
                            "stream_id": stream_id,
                            "title": clean_name,
                            "type": "movie",
                            "poster": poster,
                            "backdrop": poster,
                            "rating": f"★ {rating}" if rating else "HD",
                            "year": str(m.get("year") or ""),
                            "genres": [m.get("category_name", "Cinema")],
                            "stream_url": movie_stream_url,
                            "container_extension": ext,
                            "is_streamable": True,
                            "quality": "1080p FHD",
                            "is_xtream": True,
                        }
                    )
                return normalized
            except Exception as e:
                logger.error(f"Failed to fetch VOD streams: {e}")
                return []

    async def get_upstream_live_streams(
        self, server: str, user: str, password: str, stream_format: str = "m3u8"
    ) -> List[Dict[str, Any]]:
        base = self._clean_server_url(server)
        api_url = f"{base}/player_api.php"
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            try:
                resp = await client.get(
                    api_url,
                    params={"username": user, "password": password, "action": "get_live_streams"},
                    headers={"User-Agent": "IPTVSmartersPro"},
                )
                if resp.status_code != 200:
                    return []
                channels = resp.json()

                normalized = []
                for c in channels:
                    name = c.get("name") or "Live Channel"
                    # Filter out IPTV provider dummy separator/banner lines that have no stream
                    if any(marker in name for marker in ["#####", "=====", "-----", "*****", ">>>>>", "<<<<<"]):
                        continue

                    stream_id = c.get("stream_id")
                    fmt = "m3u8" if stream_format.lower() == "m3u8" else "ts"
                    stream_url = f"{base}/live/{user}/{password}/{stream_id}.{fmt}"

                    normalized.append(
                        {
                            "id": f"xtream_live_{stream_id}",
                            "name": name,
                            "logo": c.get("stream_icon") or "",
                            "country": "XX",
                            "country_name": "Xtream Provider",
                            "country_flag": "📡",
                            "categories": [c.get("category_name", "Live TV")],
                            "stream_url": stream_url,
                            "quality": "HD Live",
                        }
                    )
                return normalized
            except Exception as e:
                logger.error(f"Failed to fetch live streams: {e}")
                return []

    # =========================================================================
    # Movie Downloader & Local Archiver (Download to Pi Storage)
    # =========================================================================
    def start_movie_download(self, movie_title: str, stream_url: str) -> Dict[str, Any]:
        """Spawns an async download worker to save a movie permanently to Pi storage."""
        # Sanitize filename
        safe_name = re.sub(r"[^\w\s\-\.]", "", movie_title).strip()
        safe_name = re.sub(r"[\s]+", "_", safe_name)
        if not safe_name.endswith((".mp4", ".mkv", ".webm")):
            safe_name = f"{safe_name}.mp4"

        task_id = f"dl_{int(time.time())}_{safe_name[:20]}"
        dest_path = os.path.join(self.movies_dir, safe_name)

        task_info = {
            "id": task_id,
            "title": movie_title,
            "stream_url": stream_url,
            "filename": safe_name,
            "path": dest_path,
            "total_bytes": 0,
            "downloaded_bytes": 0,
            "progress_percent": 0.0,
            "speed_kbps": 0.0,
            "status": "starting",
            "error": None,
            "started_at": int(time.time()),
        }

        self.active_downloads[task_id] = task_info
        task = asyncio.create_task(self._download_worker(task_id, stream_url, dest_path))
        self._download_tasks[task_id] = task
        return task_info

    async def _download_worker(self, task_id: str, stream_url: str, dest_path: str):
        info = self.active_downloads.get(task_id)
        if not info:
            return

        info["status"] = "downloading"
        chunk_size = 131072  # 128 KB
        start_time = time.time()
        last_calc_time = start_time
        bytes_since_last_calc = 0

        try:
            async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
                async with client.stream("GET", stream_url, headers={"User-Agent": "IPTVSmartersPro"}) as resp:
                    if resp.status_code >= 400:
                        info["status"] = "error"
                        info["error"] = f"Upstream HTTP {resp.status_code}"
                        return

                    total_length = resp.headers.get("content-length")
                    if total_length:
                        info["total_bytes"] = int(total_length)

                    with open(dest_path, "wb") as f:
                        async for chunk in resp.aiter_bytes(chunk_size=chunk_size):
                            if not chunk:
                                continue
                            f.write(chunk)
                            info["downloaded_bytes"] += len(chunk)
                            bytes_since_last_calc += len(chunk)

                            now = time.time()
                            if now - last_calc_time >= 1.0:
                                elapsed = now - last_calc_time
                                info["speed_kbps"] = round((bytes_since_last_calc / 1024) / elapsed, 1)
                                if info["total_bytes"] > 0:
                                    info["progress_percent"] = round(
                                        (info["downloaded_bytes"] / info["total_bytes"]) * 100, 1
                                    )
                                last_calc_time = now
                                bytes_since_last_calc = 0

            info["status"] = "completed"
            info["progress_percent"] = 100.0
            info["speed_kbps"] = 0.0
            logger.info(f"Movie successfully downloaded and archived: {dest_path}")
        except asyncio.CancelledError:
            info["status"] = "cancelled"
            if os.path.exists(dest_path):
                try:
                    os.remove(dest_path)
                except:
                    pass
        except Exception as e:
            logger.error(f"Download failed for {stream_url}: {e}")
            info["status"] = "error"
            info["error"] = str(e)

    def get_downloads(self) -> List[Dict[str, Any]]:
        return list(self.active_downloads.values())

    def cancel_download(self, task_id: str) -> bool:
        task = self._download_tasks.get(task_id)
        if task and not task.done():
            task.cancel()
            return True
        return False


xtream_service = XtreamService()
