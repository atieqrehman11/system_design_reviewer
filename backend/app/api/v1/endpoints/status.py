from fastapi import APIRouter, Depends

from app.config.config import settings
from app.config.config_keys import (
    APP_NAME, APP_VERSION, APP_ENVIRONMENT
)

router = APIRouter()

@router.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": f"{settings.get(APP_NAME)} is running",
        "version": settings.get(APP_VERSION),
        "environment": settings.get(APP_ENVIRONMENT)
    }

@router.get("/health")
async def health_check():
    """Health check for monitoring"""
    return {
        "status": "healthy", 
        "service": settings.get(APP_NAME),
        "version": settings.get(APP_VERSION)
    }

@router.get("/properties")
async def get_properties():
    """Return all configuration settings as a JSON object"""
    print("Returning all configuration settings\n")
    return settings.get_all()
