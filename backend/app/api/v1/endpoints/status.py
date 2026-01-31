from fastapi import APIRouter, HTTPException

from app.config.config import settings
from app.config.config_keys import (
    APP_NAME, APP_VERSION, APP_ENVIRONMENT
)

from app.services.llm import LLMService

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

@router.get("/model-config/{model_name}")
async def get_model_config(model_name: str):
    try:
 
        llm_params = {
                "model": model_name,
                "temperature": 0.7,
                "top_p": 0.9
            }

        llm = LLMService().create_llm(llm_params)
        config = {
            k: v for k, v in llm.__dict__.items() 
            if not k.startswith('_') and isinstance(v, (str, int, float, bool, list, dict, type(None)))
        }

        return {
            "model": model_name,
            "crewai_standard_configs": config
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))