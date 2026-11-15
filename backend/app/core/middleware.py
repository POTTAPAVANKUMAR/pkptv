import time
import uuid
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from app.core.logging import request_id_ctx

logger = logging.getLogger("pkp_tv.access")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        # Generate or capture request ID
        req_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())[:8]
        token = request_id_ctx.set(req_id)

        start_time = time.perf_counter()
        client_ip = request.client.host if request.client else "unknown"

        try:
            response = await call_next(request)
            process_time_ms = (time.perf_counter() - start_time) * 1000

            response.headers["X-Request-ID"] = req_id
            response.headers["X-Response-Time-Ms"] = f"{process_time_ms:.2f}"

            # Only log detailed requests (skip noisy health check polling unless error)
            if request.url.path not in ["/health", "/api/v1/system/health"] or response.status_code >= 400:
                logger.info(
                    f"{request.method} {request.url.path} "
                    f"-> status={response.status_code} "
                    f"duration={process_time_ms:.1f}ms "
                    f"ip={client_ip}"
                )

            return response
        except Exception as exc:
            process_time_ms = (time.perf_counter() - start_time) * 1000
            logger.error(
                f"{request.method} {request.url.path} "
                f"failed with {exc.__class__.__name__}: {exc} "
                f"duration={process_time_ms:.1f}ms",
                exc_info=True
            )
            raise
        finally:
            request_id_ctx.reset(token)
