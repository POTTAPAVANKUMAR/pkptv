import os
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel
from app.services.vod_service import vod_service
from app.services.xtream_service import xtream_service
from app.core.config import settings

router = APIRouter(prefix="/vod", tags=["vod"])


class DownloadMovieRequest(BaseModel):
    title: str
    stream_url: str


@router.get("/featured")
async def get_featured():
    """Retrieve cinematic billboard items for the Google TV hero carousel."""
    return {"featured": vod_service.get_featured()}


@router.get("/free")
async def get_free_movies():
    """Retrieve permanent, high-definition free cinema movies that never expire."""
    return {"movies": vod_service.get_permanent_free_movies()}


@router.get("/local")
async def get_local_movies():
    """Retrieve offline movies permanently saved to the Raspberry Pi's local storage."""
    return {"movies": vod_service.get_local_movies()}


@router.delete("/local/{filename}")
async def delete_local_movie(filename: str):
    """Delete an archived movie from local storage."""
    success = vod_service.delete_local_movie(filename)
    if not success:
        raise HTTPException(status_code=404, detail="Movie file not found.")
    return {"status": "deleted", "filename": filename}


@router.get("/stream/{filename}")
async def stream_local_movie(filename: str, request: Request):
    """Stream a locally saved movie with full HTTP Range request seeking support."""
    safe_name = os.path.basename(filename)
    path = os.path.join(settings.DATA_DIR, "movies", safe_name)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Movie file not found on disk.")

    media_type = "video/mp4"
    if safe_name.endswith(".mkv"):
        media_type = "video/x-matroska"
    elif safe_name.endswith(".webm"):
        media_type = "video/webm"

    # FileResponse natively handles HTTP Range (206 Partial Content)
    return FileResponse(
        path=path,
        media_type=media_type,
        filename=safe_name,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            "Accept-Ranges": "bytes",
        },
    )


@router.post("/download")
async def start_movie_download(req: DownloadMovieRequest):
    """Start an asynchronous download of an Xtream or web movie stream to Pi storage."""
    if not req.stream_url:
        raise HTTPException(status_code=400, detail="Missing stream_url.")
    task = xtream_service.start_movie_download(movie_title=req.title, stream_url=req.stream_url)
    return {"status": "started", "task": task}


@router.get("/downloads")
async def get_movie_downloads():
    """List all current and completed movie archive downloads."""
    return {"downloads": xtream_service.get_downloads()}


@router.post("/download/{task_id}/cancel")
async def cancel_movie_download(task_id: str):
    """Cancel an active movie download."""
    cancelled = xtream_service.cancel_download(task_id)
    return {"status": "cancelled" if cancelled else "not_found"}


@router.get("/movies")
async def get_movies(country: Optional[str] = Query(None, description="Filter movies by country (IN, US, or all)")):
    """Retrieve curated on-demand movies with metadata, ratings, and streaming sources."""
    return {"movies": vod_service.get_movies(country=country)}


@router.get("/shows")
async def get_shows(country: Optional[str] = Query(None, description="Filter TV shows by country (IN, US, or all)")):
    """Retrieve curated on-demand TV series with seasons, ratings, and streaming sources."""
    return {"shows": vod_service.get_shows(country=country)}


@router.get("/providers")
async def get_providers():
    return {"providers": vod_service.get_providers()}
