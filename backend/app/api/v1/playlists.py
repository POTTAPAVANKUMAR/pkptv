import asyncio
import httpx
from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel, HttpUrl
from app.services.playlist_service import playlist_service
from app.core.config import settings

router = APIRouter(prefix="/playlists", tags=["playlists"])


class RemoteM3URequest(BaseModel):
    url: HttpUrl


@router.post("/parse-url")
async def parse_remote_m3u(payload: RemoteM3URequest):
    """Fetches a remote M3U/M3U8 file and returns structured channel items."""
    try:
        async with httpx.AsyncClient(timeout=20.0, headers={"User-Agent": settings.USER_AGENT}) as client:
            resp = await client.get(str(payload.url))
            if resp.status_code != 200:
                raise HTTPException(status_code=400, detail=f"Failed to fetch M3U playlist: HTTP {resp.status_code}")
            channels = playlist_service.parse_m3u_text(resp.text)
            return {"channels": channels, "total": len(channels)}
    except Exception as e:
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
