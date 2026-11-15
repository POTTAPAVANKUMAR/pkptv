from fastapi import APIRouter
from app.services.playlist_service import playlist_service

router = APIRouter(prefix="/countries", tags=["countries"])


@router.get("")
async def get_countries():
    """Retrieve all available countries with channel counts and flags."""
    return {
        "countries": playlist_service.countries,
        "total": len(playlist_service.countries),
    }
