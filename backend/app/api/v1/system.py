from fastapi import APIRouter
from app.services.system_service import system_service
from app.services.playlist_service import playlist_service

router = APIRouter(prefix="/system", tags=["system"])


@router.get("/health")
async def health_check():
    """Liveness probe for Docker container and load balancers."""
    return {
        "status": "healthy",
        "channels_loaded": len(playlist_service.channels),
        "is_syncing": playlist_service.is_loading,
    }


@router.get("/stats")
async def system_stats():
    """Retrieve host system information (CPU, RAM, Temp, Disk) for the UI monitor widget."""
    stats = system_service.get_system_stats()
    stats["catalog"] = {
        "channels_total": len(playlist_service.channels),
        "categories_total": len(playlist_service.categories),
        "countries_total": len(playlist_service.countries),
        "last_synced": playlist_service.last_updated,
    }
    return stats
