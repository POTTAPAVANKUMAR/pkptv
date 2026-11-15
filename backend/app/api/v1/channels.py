from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.services.playlist_service import playlist_service

router = APIRouter(prefix="/channels", tags=["channels"])


@router.get("")
async def get_channels(
    q: Optional[str] = Query(None, description="Search term for channel name or alias"),
    category: Optional[str] = Query(None, description="Filter by category slug"),
    country: Optional[str] = Query(None, description="Filter by 2-letter ISO country code (e.g. US, IN)"),
    language: Optional[str] = Query(None, description="Filter by 3-letter language code (e.g. eng, hin)"),
    limit: int = Query(50, ge=1, le=200, description="Items per page"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
):
    """Retrieve filtered and paginated channels from the curated IPTV directory."""
    channels, total = playlist_service.search_channels(
        query=q,
        category=category,
        country=country,
        language=language,
        limit=limit,
        offset=offset,
    )
    return {
        "channels": channels,
        "total": total,
        "limit": limit,
        "offset": offset,
        "has_more": (offset + limit) < total,
    }


@router.get("/{channel_id}")
async def get_channel_by_id(channel_id: str):
    """Retrieve details and stream sources for a specific channel."""
    channel = playlist_service.get_channel(channel_id)
    if not channel:
        raise HTTPException(status_code=404, detail=f"Channel '{channel_id}' not found.")
    return channel
