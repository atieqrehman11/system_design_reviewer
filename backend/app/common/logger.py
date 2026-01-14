
import logging

logging.basicConfig(
    level=logging.ERROR,
    format='%(asctime)s %(levelname)s:%(message)s'
)

logger = logging.getLogger(__name__)

__all__ = ['logger']