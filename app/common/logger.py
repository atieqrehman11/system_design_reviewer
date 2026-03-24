import logging

from app.config.config import settings
from app.config.config_keys import LOG_LEVEL, NOISY_LOGGERS


def _resolve_log_level() -> int:
    """Resolve log level from config (env LOG_LEVEL overrides settings.toml)."""
    level_str = settings.get(LOG_LEVEL, "INFO")
    return getattr(logging, str(level_str).upper(), logging.INFO)


class _CorrelationIdFilter(logging.Filter):
    """Injects correlation_id from the current ContextVar into every log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        from app.common.request_context import get_correlation_id
        record.correlation_id = get_correlation_id()
        return True


logging.basicConfig(
    level=_resolve_log_level(),
    format="%(asctime)s %(levelname)s [%(name)s] [%(correlation_id)s] %(message)s",
)

_filter = _CorrelationIdFilter()
for _handler in logging.root.handlers:
    _handler.addFilter(_filter)

for _noisy in settings.get_list(NOISY_LOGGERS):
    logging.getLogger(_noisy).setLevel(logging.WARNING)

logger = logging.getLogger("app")

__all__ = ["logger"]
