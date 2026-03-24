"""
Generic CrewAI job runner.

Runs a crew.kickoff() in a daemon thread, dispatches events via the
EventDispatcher, and signals stream completion via a poison pill.

Feature-specific logic (persistence, completion message) is injected
via callbacks so this module stays feature-agnostic.
"""
from queue import Queue
from threading import Thread
from typing import Any, Callable, Optional
from datetime import datetime, timezone

from app.common.event_dispatcher import EventDispatcher
from app.common.logger import logger
from app.common.request_context import get_correlation_id, set_correlation_id, reset_correlation_id


def _ts() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def run_crew_in_thread(
    crew: Any,
    inputs: dict,
    correlation_id: str,
    sync_queue: Queue,
    event_dispatcher: EventDispatcher,
    on_complete: Optional[Callable[[], None]] = None,
    on_error: Optional[Callable[[Exception], Any]] = None,
    label: str = "CrewRunner",
) -> None:
    """
    Spawn a daemon thread that runs ``crew.kickoff(inputs)`` and streams
    results back via *sync_queue* and *event_dispatcher*.

    The correlation ID is set on the thread's ContextVar so all downstream
    code (logger, dispatcher, callbacks) can read it implicitly via
    get_correlation_id().

    Args:
        crew:             A CrewAI Crew instance (already built).
        inputs:           Dict passed to ``crew.kickoff(inputs=...)``.
        correlation_id:   Session key — set on ContextVar for the thread lifetime.
        sync_queue:       Thread-safe Queue shared with the async stream consumer.
        event_dispatcher: Singleton dispatcher for pushing events to the session.
        on_complete:      Optional ``() -> None`` called after a successful kickoff.
                          Use for persistence, metrics, etc.
        on_error:         Optional ``(exc) -> Any`` called on failure. Return value
                          (if any) is dispatched as the error event; if None is
                          returned the default ``{"status": "error", "message": str(exc)}``
                          is used.
        label:            Log prefix for debug/error messages.
    """

    def _target() -> None:
        token = set_correlation_id(correlation_id)
        logger.info("REVIEW_START")
        try:
            result = crew.kickoff(inputs=inputs)
            logger.debug("[%s] crew.kickoff() returned", label)

            if on_complete is not None:
                on_complete(result)

            logger.info("REVIEW_END | status=completed")

        except Exception as exc:
            logger.error("REVIEW_END | status=error | error=%s", exc)

            error_event: Any = {"status": "error", "message": str(exc)}
            if on_error is not None:
                custom = on_error(exc)
                if custom is not None:
                    error_event = custom

            event_dispatcher.dispatch(get_correlation_id(), error_event)
            sync_queue.put(error_event)

        finally:
            reset_correlation_id(token)
            sync_queue.put(None)  # Poison pill — signals stream to close

    Thread(target=_target, daemon=True).start()


__all__ = ["run_crew_in_thread"]
