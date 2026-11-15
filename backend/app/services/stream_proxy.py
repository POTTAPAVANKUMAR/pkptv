import logging
from urllib.parse import urljoin, quote, unquote
from typing import AsyncGenerator
import httpx
from starlette.responses import Response, StreamingResponse
from app.core.config import settings

logger = logging.getLogger("pkp_tv.proxy")


class StreamProxyService:
    @staticmethod
    def _rewrite_m3u8(content: str, base_url: str, proxy_endpoint: str) -> str:
        """
        Rewrites .m3u8 playlist lines:
        Any URI line (segment or sub-playlist) is rewritten to pass through our proxy
        so the browser avoids CORS and Mixed-Content (HTTP on HTTPS) blocks.
        """
        lines = content.splitlines()
        rewritten_lines = []

        for line in lines:
            trimmed = line.strip()
            if not trimmed:
                rewritten_lines.append(line)
                continue

            if trimmed.startswith("#"):
                # Handle tags with URI attributes, e.g. #EXT-X-KEY:METHOD=...,URI="..."
                if 'URI="' in trimmed:
                    start_idx = trimmed.find('URI="') + 5
                    end_idx = trimmed.find('"', start_idx)
                    if end_idx != -1:
                        raw_uri = trimmed[start_idx:end_idx]
                        full_uri = urljoin(base_url, raw_uri)
                        proxied_uri = f"{proxy_endpoint}?url={quote(full_uri, safe='')}"
                        trimmed = trimmed[:start_idx] + proxied_uri + trimmed[end_idx:]
                rewritten_lines.append(trimmed)
            else:
                # This is a segment or child playlist URI
                full_segment_url = urljoin(base_url, trimmed)
                proxied_url = f"{proxy_endpoint}?url={quote(full_segment_url, safe='')}"
                rewritten_lines.append(proxied_url)

        return "\n".join(rewritten_lines)

    async def proxy_request(self, target_url: str, request_headers: dict) -> Response:
        """Proxies an HLS manifest or media chunk with proper CORS headers."""
        target_url = unquote(target_url)

        headers = {
            "User-Agent": settings.USER_AGENT,
            "Accept": "*/*",
        }
        # Forward range headers if seeking
        if "range" in request_headers:
            headers["range"] = request_headers["range"]

        client = httpx.AsyncClient(timeout=15.0, follow_redirects=True)

        try:
            req = client.build_request("GET", target_url, headers=headers)
            response = await client.send(req, stream=True)

            content_type = response.headers.get("content-type", "")
            status_code = response.status_code

            # Check if this is an HLS manifest (.m3u8)
            is_manifest = (
                "application/vnd.apple.mpegurl" in content_type
                or "application/x-mpegurl" in content_type
                or target_url.endswith(".m3u8")
                or target_url.endswith(".m3u")
            )

            if is_manifest:
                # Read full manifest text and rewrite segment URLs
                content_bytes = await response.aread()
                await response.aclose()
                await client.aclose()

                try:
                    text_content = content_bytes.decode("utf-8", errors="ignore")
                    rewritten = self._rewrite_m3u8(
                        text_content,
                        base_url=str(response.url),
                        proxy_endpoint="/api/v1/proxy/stream",
                    )
                    return Response(
                        content=rewritten,
                        status_code=status_code,
                        media_type="application/vnd.apple.mpegurl",
                        headers={
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
                            "Access-Control-Allow-Headers": "*",
                            "Cache-Control": "no-cache",
                        },
                    )
                except Exception as e:
                    logger.error(f"Error rewriting manifest for {target_url}: {e}")
                    return Response(content=content_bytes, status_code=status_code, media_type=content_type)

            # For video/transport stream chunks (.ts, .m4s, etc.), stream response asynchronously
            async def chunk_generator() -> AsyncGenerator[bytes, None]:
                try:
                    async for chunk in response.aiter_bytes(chunk_size=65536):
                        yield chunk
                finally:
                    await response.aclose()
                    await client.aclose()

            resp_headers = {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
                "Access-Control-Allow-Headers": "*",
                "Cache-Control": "public, max-age=3600",
            }
            if "content-length" in response.headers:
                resp_headers["content-length"] = response.headers["content-length"]
            if "content-range" in response.headers:
                resp_headers["content-range"] = response.headers["content-range"]

            return StreamingResponse(
                chunk_generator(),
                status_code=status_code,
                media_type=content_type or "video/mp2t",
                headers=resp_headers,
            )

        except Exception as e:
            await client.aclose()
            logger.error(f"Proxy failed for {target_url}: {e}")
            return Response(
                content=f"Stream proxy error: {str(e)}",
                status_code=502,
                headers={"Access-Control-Allow-Origin": "*"},
            )


stream_proxy_service = StreamProxyService()
