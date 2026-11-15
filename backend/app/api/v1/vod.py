from typing import Optional
from fastapi import APIRouter, Query
from app.services.vod_service import vod_service

router = APIRouter(prefix="/vod", tags=["vod"])


@router.get("/featured")
async def get_featured():
    """Retrieve cinematic billboard items for the Google TV hero carousel."""
    return {"featured": vod_service.get_featured()}


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
    """Retrieve supported streaming platform launchers (Hotstar, Netflix, Prime, JioCinema, YouTube)."""
    return {"providers": vod_service.get_providers()}
