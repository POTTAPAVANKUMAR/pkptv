import asyncio
from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import setup_logging
from app.core.middleware import RequestLoggingMiddleware
from app.services.playlist_service import playlist_service
from app.api.v1.channels import router as channels_router
from app.api.v1.categories import router as categories_router
from app.api.v1.countries import router as countries_router
from app.api.v1.proxy import router as proxy_router
from app.api.v1.system import router as system_router
from app.api.v1.playlists import router as playlists_router
from app.api.v1.vod import router as vod_router

# Initialize structured logging
setup_logging(level=settings.LOG_LEVEL, json_format=settings.LOG_JSON)
logger = logging.getLogger("pkp_tv.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 60)
    logger.info(f" Starting {settings.APP_NAME} v{settings.VERSION}")
    logger.info(f" Host: {settings.HOST}:{settings.PORT}")
    logger.info(f" Environment: {'DEBUG' if settings.DEBUG else 'PRODUCTION'}")
    logger.info("=" * 60)

    # Initialize playlist data in the background without blocking server startup
    asyncio.create_task(playlist_service.initialize())

    yield

    logger.info(f"Shutting down {settings.APP_NAME}. Goodbye!")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="High-performance IPTV streaming and channel catalog service for PKP TV.",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Request tracing & structured access logging
app.add_middleware(RequestLoggingMiddleware)

# Cross-Origin Resource Sharing
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(channels_router, prefix="/api/v1")
app.include_router(categories_router, prefix="/api/v1")
app.include_router(countries_router, prefix="/api/v1")
app.include_router(proxy_router, prefix="/api/v1")
app.include_router(system_router, prefix="/api/v1")
app.include_router(playlists_router, prefix="/api/v1")
app.include_router(vod_router, prefix="/api/v1")


@app.get("/health", tags=["system"])
async def root_health():
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.VERSION}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
