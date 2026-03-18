from queue import Queue
from typing import Any, Dict

from app.common.logger import logger


class EventDispatcher:
    """
    Process-wide singleton dispatcher that routes events to per-session queues.

    The singleton is enforced via __new__ + an _initialized guard so that
    __init__ only runs once, preventing active_queues from being reset on
    subsequent EventDispatcher() calls.
    """

    _instance: "EventDispatcher | None" = None

    def __new__(cls) -> "EventDispatcher":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self) -> None:
        if self._initialized:
            return
        self._active_queues: Dict[str, Queue] = {}
        self._initialized = True

    def register_session(self, session_id: str, queue: Queue) -> None:
        logger.info("[EventDispatcher] Registering session: %s", session_id)
        self._active_queues[session_id] = queue

    def unregister_session(self, session_id: str) -> None:
        logger.info("[EventDispatcher] Unregistering session: %s", session_id)
        self._active_queues.pop(session_id, None)

    def dispatch(self, session_id: str, data: Any) -> None:
        queue = self._active_queues.get(session_id)
        if queue:
            logger.info("[EventDispatcher] Dispatching event to session: %s", session_id)
            queue.put(data)
        else:
            logger.warning("[EventDispatcher] No active queue for session: %s", session_id)


__all__ = ["EventDispatcher"]
