"""
SystemDesignMentor Backend API
Main FastAPI application entry point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api import api_router

from app.common.event_dispatcher import EventDispatcher
from app.common.exception_handlers import register_exception_handlers
from app.config.config import settings
from app.services.document_extractor import DocumentExtractor
from app.services.review_store import init_db
from app.services.reviewer.reviewer_event_listeners import ReviewerEventListener
from app.services.reviewer.reviewer_facade import ReviewerFacade
from app.services.reviewer.reviewer_service import ReviewerService
from app.config.config_keys import (
    APP_NAME, APP_DESCRIPTION, APP_VERSION,
    CORS_ORIGINS, CORS_CREDENTIALS, CORS_METHODS, CORS_HEADERS,
    SERVER_HOST, SERVER_PORT, SERVER_RELOAD,
)

_debug = settings.get("log_level", "INFO").upper() == "DEBUG"

app = FastAPI(
    title=settings.get(APP_NAME),
    description=settings.get(APP_DESCRIPTION),
    version=settings.get(APP_VERSION),
    debug=_debug,
)

# Configure CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get(CORS_ORIGINS),
    allow_credentials=settings.get(CORS_CREDENTIALS),
    allow_methods=settings.get(CORS_METHODS),
    allow_headers=settings.get(CORS_HEADERS),
)

app.include_router(api_router, prefix="/api")

register_exception_handlers(app)

# Initialise SQLite schema on startup
init_db()

# Build shared singletons once and store on app.state so endpoints can
# resolve them via FastAPI dependency injection (no module-level globals).
_event_dispatcher = EventDispatcher()
app.state.event_dispatcher = _event_dispatcher
app.state.reviewer_service = ReviewerService(_event_dispatcher)
_document_extractor = DocumentExtractor()
app.state.document_extractor = _document_extractor
app.state.reviewer_facade = ReviewerFacade(app.state.reviewer_service, _event_dispatcher, _document_extractor)

# Wire the CrewAI event listener to the shared dispatcher — must happen once at startup
ReviewerEventListener(event_dispatcher=_event_dispatcher)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app", 
        host=settings.get(SERVER_HOST), 
        port=settings.get(SERVER_PORT), 
        reload=settings.get(SERVER_RELOAD)
    )

