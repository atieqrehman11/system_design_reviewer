"""
SystemDesignMentor Backend API
Main FastAPI application entry point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api import api_router

from app.common.exception_handlers import register_exception_handlers
from app.config.config import settings
from app.config.config_keys import (
    APP_NAME, APP_DESCRIPTION, APP_VERSION, APP_DEBUG,
    CORS_ORIGINS, CORS_CREDENTIALS, CORS_METHODS, CORS_HEADERS,
    SERVER_HOST, SERVER_PORT, SERVER_RELOAD, APP_ENVIRONMENT
)

app = FastAPI(
    title=settings.get(APP_NAME),
    description=settings.get(APP_DESCRIPTION),
    version=settings.get(APP_VERSION),
    debug=settings.get(APP_DEBUG),
)

# Configure CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get(CORS_ORIGINS),
    allow_credentials=settings.get(CORS_CREDENTIALS),
    allow_methods=settings.get(CORS_METHODS),
    allow_headers=settings.get(CORS_HEADERS),
)

app.include_router(api_router, prefix="/api/v1")

register_exception_handlers(app)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app", 
        host=settings.get(SERVER_HOST), 
        port=settings.get(SERVER_PORT), 
        reload=settings.get(SERVER_RELOAD)
    )

