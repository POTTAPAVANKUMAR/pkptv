from typing import Optional
from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel
from app.services.dvr_service import dvr_service

router = APIRouter(prefix="/dvr", tags=["dvr"])


class StartDvrRequest(BaseModel):
    channel_id: str
    stream_url: str
    channel_name: Optional[str] = None
    channel_logo: Optional[str] = None


class StopDvrRequest(BaseModel):
    channel_id: str


@router.post("/start")
async def start_dvr(req: StartDvrRequest):
    """Start 12-hour circular rolling buffer DVR for a channel."""
    try:
        status = dvr_service.start_recording(
            channel_id=req.channel_id,
            stream_url=req.stream_url,
            channel_name=req.channel_name,
            channel_logo=req.channel_logo,
        )
        return {"status": "ok", "dvr": status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stop")
async def stop_dvr(req: StopDvrRequest):
    """Stop active 12-hour DVR recording for a channel."""
    success = dvr_service.stop_recording(req.channel_id)
    return {"status": "ok", "stopped": success}


@router.delete("/{channel_id}")
async def delete_dvr(channel_id: str):
    """Delete DVR buffer and files for a channel."""
    success = dvr_service.delete_recording(channel_id)
    return {"status": "ok", "deleted": success}


@router.get("/status")
async def get_all_dvr_status():
    """Retrieve status, buffer duration, and storage stats for all 12h DVR recordings."""
    recordings = dvr_service.get_status()
    return {"recordings": recordings}


@router.get("/{channel_id}/status")
async def get_channel_dvr_status(channel_id: str):
    """Retrieve DVR buffer status for a specific channel."""
    stat = dvr_service.get_status(channel_id)
    if not stat:
        return {"is_active": False, "channel_id": channel_id}
    return stat


@router.get("/{channel_id}/index.m3u8")
async def get_dvr_playlist(channel_id: str):
    """Serve rolling 12-hour HLS playlist manifest."""
    content = dvr_service.get_playlist_content(channel_id)
    if not content:
        raise HTTPException(status_code=404, detail="DVR playlist not ready or not found.")
    return Response(
        content=content,
        media_type="application/vnd.apple.mpegurl",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Access-Control-Allow-Origin": "*",
        },
    )


@router.get("/{channel_id}/{segment_name}")
async def get_dvr_segment(channel_id: str, segment_name: str):
    """Serve individual 6-second video transport stream segment (.ts)."""
    seg_file = dvr_service.get_segment_file(channel_id, segment_name)
    if not seg_file:
        raise HTTPException(status_code=404, detail="Segment expired or not found.")
    return FileResponse(
        path=seg_file,
        media_type="video/mp2t",
        headers={
            "Cache-Control": "max-age=3600",
            "Access-Control-Allow-Origin": "*",
        },
    )
