"""
Generic async streaming utilities.

Provides the queue-polling async generator used to bridge a synchronous
worker thread with an async FastAPI streaming response. Feature-agnostic —
any crew or LLM job can use this.
"""
import asyncio
import json
from queue import Empty, Queue
from typing import AsyncGenerator

from pydantic import BaseModel

from app.common.logger import logger


def serialize_event(event: object) -> str:
    """Serialise a queue event to a JSON string."""
    if isinstance(event, BaseModel):
        return event.model_dump_json(exclude_none=True)
    if isinstance(event, dict):
        return json.dumps(event)
    return json.dumps({"data": str(event)})


async def stream_queue(sync_queue: Queue, label: str = "stream") -> AsyncGenerator[str, None]:
    """
    Poll a thread-safe Queue and yield serialised NDJSON chunks.

    Terminates on:
    - None sentinel (poison pill from worker thread)
    - Event with status in ("complete", "completed", "error")
    - asyncio.CancelledError (client disconnect — re-raised)

    Args:
        sync_queue: Queue populated by a worker thread.
        label:      Log label for debug messages.

    Yields:
        NDJSON lines: ``"<json>\\n\\n"``
    """
    loop = asyncio.get_running_loop()
    while True:
        try:
            event = await loop.run_in_executor(
                None, lambda: sync_queue.get(timeout=0.2)
            )

            if event is None:
                logger.debug("[%s] Received shutdown signal. Closing stream.", label)
                break

            payload = serialize_event(event)
            yield f"{payload}\n\n"

            status = (
                event.get("status") if isinstance(event, dict)
                else getattr(event, "status", None)
            )
            if status in ("complete", "completed", "error"):
                break

        except Empty:
            await asyncio.sleep(0.1)
            continue
        except asyncio.CancelledError:
            logger.debug("[%s] Stream cancelled by client.", label)
            raise
        except Exception as exc:
            logger.error("[%s] Streaming error: %s", label, exc)
            yield json.dumps({"status": "error", "message": str(exc)}) + "\n"
            break


__all__ = ["serialize_event", "stream_queue"]
