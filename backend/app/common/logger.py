import logging
import os

from app.config.config import settings

def _get_log_level() -> int:
    """Resolve log level from settings or LOG_LEVEL env var, defaulting to INFO."""
    level_str = os.getenv("LOG_LEVEL") or settings.get("log_level", "INFO")
    return getattr(logging, str(level_str).upper(), logging.INFO)

logging.basicConfig(
    level=_get_log_level(),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)

logger = logging.getLogger("app")

__all__ = ["logger"]
