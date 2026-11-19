import os
import time
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, Request, Response
from fastapi.responses import FileResponse, JSONResponse
from app.services.xtream_service import xtream_service
from app.services.playlist_service import playlist_service
from app.services.vod_service import vod_service
from app.services.stream_proxy import stream_proxy_service
from app.core.config import settings

# Router mounted at root / so it responds to /player_api.php, /live/..., /movie/...
router = APIRouter(tags=["xtream_server"])


@router.get("/player_api.php")
@router.post("/player_api.php")
async def xtream_player_api(
    request: Request,
    username: Optional[str] = Query(None),
    password: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    category_id: Optional[str] = Query(None),
    vod_id: Optional[str] = Query(None),
    series_id: Optional[str] = Query(None),
):
    """
    Standard Xtream Codes REST API emulation.
    Compatible with TiviMate, IPTV Smarters Pro, MMN Player, VLC, and Kodi.
    """
    # Fallback to query params or form data if POST
    if not username or not password:
        try:
            form = await request.form()
            username = username or form.get("username")
            password = password or form.get("password")
            action = action or form.get("action")
            category_id = category_id or form.get("category_id")
            vod_id = vod_id or form.get("vod_id")
        except:
            pass

    if not username or not password:
        return JSONResponse(content={"user_info": {"auth": 0, "message": "Missing credentials"}})

    user = xtream_service.verify_local_user(username=username, password=password)
    if not user:
        return JSONResponse(content={"user_info": {"auth": 0, "message": "Invalid username or password"}})

    host = request.headers.get("host", f"localhost:{settings.PORT}")
    scheme = "https" if "https" in request.headers.get("x-forwarded-proto", "") else "http"

    # =========================================================================
    # Action 1: Base Handshake (Account & Server info)
    # =========================================================================
    if not action:
        return {
            "user_info": {
                "username": user["username"],
                "password": user["password"],
                "message": f"Welcome {user['username']} to PKP TV Self-Hosted Server",
                "auth": 1,
                "status": "Active",
                "exp_date": str(user.get("exp_date", int(time.time()) + 31536000)),
                "is_trial": "0",
                "active_cons": "0",
                "max_connections": str(user.get("max_connections", 5)),
                "allowed_output_formats": ["m3u8", "ts"],
            },
            "server_info": {
                "url": host.split(":")[0],
                "port": host.split(":")[1] if ":" in host else ("443" if scheme == "https" else "80"),
                "https_port": "443",
                "server_protocol": scheme,
                "rtmp_port": "8880",
                "timezone": "UTC",
                "timestamp_now": int(time.time()),
                "time_now": time.strftime("%Y-%m-%d %H:%M:%S"),
                "process": True,
            },
        }

    # =========================================================================
    # Action 2: Live Categories & Live Streams
    # =========================================================================
    if action == "get_live_categories":
        cats = []
        for c in playlist_service.categories:
            cats.append({"category_id": c["id"], "category_name": c["name"], "parent_id": 0})
        return cats

    if action == "get_live_streams":
        streams = []
        cat_filter = category_id if (category_id and category_id.lower() != "all") else None
        channels = playlist_service.channels

        if cat_filter:
            channels = [ch for ch in channels if cat_filter in ch.get("categories", [])]

        for idx, ch in enumerate(channels[:1500], start=1):
            ch_cat = ch.get("categories", ["general"])
            streams.append(
                {
                    "num": idx,
                    "name": ch["name"],
                    "stream_type": "live",
                    "stream_id": ch["id"],
                    "stream_icon": ch.get("logo", ""),
                    "epg_channel_id": ch.get("id"),
                    "added": str(int(time.time())),
                    "category_id": ch_cat[0] if ch_cat else "general",
                    "custom_sid": "",
                    "direct_source": "",
                }
            )
        return streams

    # =========================================================================
    # Action 3: VOD (Movies) Categories & Movie Streams
    # =========================================================================
    if action == "get_vod_categories":
        return [
            {"category_id": "pi_saved_movies", "category_name": "Pi Saved Movies (Local)", "parent_id": 0},
            {"category_id": "free_cinema_hd", "category_name": "Free HD Cinema", "parent_id": 0},
        ]

    if action == "get_vod_streams":
        vod_items = []
        # 1. Local saved movies on the Pi
        if not category_id or category_id == "pi_saved_movies":
            for m in vod_service.get_local_movies():
                vod_items.append(
                    {
                        "num": len(vod_items) + 1,
                        "name": m["title"],
                        "stream_type": "movie",
                        "stream_id": f"local_{m['filename']}",
                        "stream_icon": m["poster"],
                        "rating": "9.0",
                        "rating_5based": 4.5,
                        "added": str(int(time.time())),
                        "category_id": "pi_saved_movies",
                        "container_extension": os.path.splitext(m["filename"])[1].lstrip(".") or "mp4",
                        "custom_sid": "",
                        "direct_source": "",
                    }
                )

        # 2. Permanent Free Cinema
        if not category_id or category_id == "free_cinema_hd":
            for m in vod_service.get_permanent_free_movies():
                vod_items.append(
                    {
                        "num": len(vod_items) + 1,
                        "name": m["title"],
                        "stream_type": "movie",
                        "stream_id": m["id"],
                        "stream_icon": m["poster"],
                        "rating": "8.5",
                        "rating_5based": 4.2,
                        "added": str(int(time.time())),
                        "category_id": "free_cinema_hd",
                        "container_extension": "mp4",
                        "custom_sid": "",
                        "direct_source": "",
                    }
                )

        return vod_items

    if action == "get_vod_info":
        return {
            "info": {
                "name": "Movie Information",
                "description": "High-definition movie streamed from PKP TV Self-Hosted Server.",
                "duration": "120m",
            },
            "movie_data": {"stream_id": vod_id, "container_extension": "mp4"},
        }

    # Action: Series (Empty for now)
    if action == "get_series_categories" or action == "get_series":
        return []

    return []


# =============================================================================
# Stream Handlers (MPEG-TS, HLS, and MP4 Video Streaming)
# =============================================================================
@router.get("/live/{username}/{password}/{stream_path:path}")
async def stream_live_channel(username: str, password: str, stream_path: str, request: Request):
    """
    Delivers live channel streams:
    /live/{username}/{password}/{channel_id}.m3u8 or .ts
    """
    user = xtream_service.verify_local_user(username=username, password=password)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    channel_id = stream_path.split(".")[0]
    channel = playlist_service.get_channel(channel_id)
    if not channel or not channel.get("stream_url"):
        raise HTTPException(status_code=404, detail="Channel not found or stream offline")

    # Proxy the real stream via stream proxy service
    return await stream_proxy_service.proxy_request(
        target_url=channel["stream_url"], request_headers=dict(request.headers)
    )


@router.get("/movie/{username}/{password}/{movie_path:path}")
async def stream_vod_movie(username: str, password: str, movie_path: str, request: Request):
    """
    Delivers on-demand movie streams:
    /movie/{username}/{password}/{movie_id}.mp4
    """
    user = xtream_service.verify_local_user(username=username, password=password)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    base_id = movie_path.split(".")[0]

    # Check if this is a local saved movie
    if base_id.startswith("local_"):
        filename = base_id[6:] + os.path.splitext(movie_path)[1]
        local_path = os.path.join(settings.DATA_DIR, "movies", filename)
        if os.path.exists(local_path):
            return FileResponse(
                path=local_path,
                media_type="video/mp4",
                filename=filename,
                headers={"Accept-Ranges": "bytes"},
            )

    # Check if this is one of our free cinema movies
    for m in vod_service.get_permanent_free_movies():
        if m["id"] == base_id or m["id"] == movie_path.split(".")[0]:
            return await stream_proxy_service.proxy_request(
                target_url=m["stream_url"], request_headers=dict(request.headers)
            )

    raise HTTPException(status_code=404, detail="Movie not found")
