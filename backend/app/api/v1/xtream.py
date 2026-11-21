from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from app.services.xtream_service import xtream_service

router = APIRouter(prefix="/xtream", tags=["xtream"])


class XtreamAuthRequest(BaseModel):
    server: str
    username: str
    password: str


class CreateLocalUserRequest(BaseModel):
    username: str
    password: str
    exp_days: int = 365
    max_connections: int = 3
    notes: Optional[str] = ""


# =========================================================================
# Upstream Client Controller (Connect to 8kplayers.com, etc.)
# =========================================================================
@router.post("/auth")
async def authenticate_upstream(req: XtreamAuthRequest):
    """Test credentials against an external Xtream Codes server."""
    if not req.server or not req.username:
        raise HTTPException(status_code=400, detail="Server URL and Username are required.")
    res = await xtream_service.authenticate_upstream(
        server=req.server, user=req.username, password=req.password
    )
    return res


@router.get("/vod/categories")
async def get_upstream_vod_categories(
    server: str = Query(...),
    username: str = Query(...),
    password: str = Query(...),
):
    """Fetch movie categories from the connected Xtream Codes server."""
    cats = await xtream_service.get_upstream_vod_categories(server=server, user=username, password=password)
    return {"categories": cats}


@router.get("/vod/streams")
async def get_upstream_vod_streams(
    server: str = Query(...),
    username: str = Query(...),
    password: str = Query(...),
    category_id: Optional[str] = Query(None),
):
    """Fetch movies from the connected Xtream Codes server."""
    movies = await xtream_service.get_upstream_vod_streams(
        server=server, user=username, password=password, category_id=category_id
    )
    return {"movies": movies}


# =========================================================================
# Upstream TV Series & Episode Browsing
# =========================================================================
@router.get("/series/categories")
async def get_upstream_series_categories(
    server: str = Query(...),
    username: str = Query(...),
    password: str = Query(...),
):
    """Fetch TV series categories from the connected Xtream Codes server."""
    cats = await xtream_service.get_upstream_series_categories(
        server=server, user=username, password=password
    )
    return {"categories": cats}


@router.get("/series")
async def get_upstream_series(
    server: str = Query(...),
    username: str = Query(...),
    password: str = Query(...),
    category_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    """Fetch TV series list from the connected Xtream Codes server."""
    series = await xtream_service.get_upstream_series(
        server=server, user=username, password=password, category_id=category_id, search=search
    )
    return {"series": series}


@router.get("/series/{series_id}")
async def get_upstream_series_info(
    series_id: str,
    server: str = Query(...),
    username: str = Query(...),
    password: str = Query(...),
):
    """Fetch seasons and episodes with direct stream URLs for a specific TV series."""
    info = await xtream_service.get_upstream_series_info(
        server=server, user=username, password=password, series_id=series_id
    )
    return info


@router.get("/live/streams")
async def get_upstream_live_streams(
    server: str = Query(...),
    username: str = Query(...),
    password: str = Query(...),
    format: str = Query("m3u8", description="Stream format (m3u8 or ts)"),
):
    """Fetch live broadcast channels from the connected Xtream Codes server."""
    channels = await xtream_service.get_upstream_live_streams(
        server=server, user=username, password=password, stream_format=format
    )
    return {"channels": channels}


# =========================================================================
# Self-Hosted Local User Management (Create & Manage Free Users on Pi)
# =========================================================================
@router.get("/local/users")
async def list_local_users():
    """List all user accounts for your self-hosted Xtream server."""
    return {"users": xtream_service.get_local_users()}


@router.post("/local/users")
async def create_local_user(req: CreateLocalUserRequest):
    """Create a new free user account for your self-hosted Xtream server."""
    try:
        user = xtream_service.create_local_user(
            username=req.username,
            password=req.password,
            exp_days=req.exp_days,
            max_cons=req.max_connections,
            notes=req.notes or "",
        )
        return {"status": "created", "user": user}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/local/users/{username}")
async def delete_local_user(username: str):
    """Delete a user from your self-hosted Xtream server."""
    success = xtream_service.delete_local_user(username)
    if not success:
        raise HTTPException(status_code=404, detail="User not found.")
    return {"status": "deleted", "username": username}
