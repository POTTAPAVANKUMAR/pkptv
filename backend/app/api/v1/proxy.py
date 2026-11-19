from fastapi import APIRouter, HTTPException, Query, Request
from app.services.stream_proxy import stream_proxy_service

router = APIRouter(prefix="/proxy", tags=["proxy"])


@router.get("/stream")
@router.head("/stream")
async def proxy_stream(request: Request, url: str = Query(..., description="Target HLS stream or segment URL")):
    """
    Proxies live HLS playlists, MPEG-TS chunks, and media segments.
    Resolves CORS restrictions, Mixed-Content blocking (HTTP on HTTPS), and IPTV User-Agent enforcement.
    """
    if not url.startswith("http://") and not url.startswith("https://"):
        raise HTTPException(status_code=400, detail="Invalid target URL protocol. Only HTTP/HTTPS supported.")

    headers_dict = dict(request.headers)
    return await stream_proxy_service.proxy_request(url, headers_dict, method=request.method)
