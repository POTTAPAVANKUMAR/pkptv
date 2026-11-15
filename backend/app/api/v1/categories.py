from fastapi import APIRouter
from app.services.playlist_service import playlist_service

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("")
async def get_categories():
    """Retrieve all available channel categories with counts."""
    return {
        "categories": playlist_service.categories,
        "total": len(playlist_service.categories),
    }
