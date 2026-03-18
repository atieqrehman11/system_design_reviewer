import asyncio
import json
from queue import Empty, Queue
from typing import AsyncGenerator

from pydantic import BaseModel

from app.common.event_dispatcher import EventDispatcher
from app.common.logger import logger
from app.models.api_schema import ReviewRequest
from app.services.reviewer.reviewer_service import ReviewerService


class ReviewerFacade:
    def __init__(self, reviewer_service: ReviewerService, event_dispatcher: EventDispatcher) -> None:
        self.reviewer_service = reviewer_service
        self.event_dispatcher = event_dispatcher

    async def start_review(self, request: ReviewRequest) -> AsyncGenerator[str, None]:
        """Register the session, kick off the crew job, and stream results."""
        sync_queue: Queue = Queue()
        self.event_dispatcher.register_session(request.correlation_id, sync_queue)
        try:
            self.reviewer_service.run_crew_job(request, sync_queue)
            async for chunk in self._stream_queue(sync_queue):
                yield chunk
        finally:
            logger.info("[ReviewerFacade] Unregistering session: %s", request.correlation_id)
            self.event_dispatcher.unregister_session(request.correlation_id)

    async def _stream_queue(self, sync_queue: Queue) -> AsyncGenerator[str, None]:
        """Poll the threaded queue and yield serialised events to the async stream."""
        loop = asyncio.get_running_loop()
        while True:
            try:
                event = await loop.run_in_executor(
                    None, lambda: sync_queue.get(timeout=0.2)
                )

                if event is None:
                    logger.info("[ReviewerFacade] Received shutdown signal. Closing stream.")
                    break

                payload = self._serialize_event(event)
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
                logger.info("[ReviewerFacade] Stream cancelled by client.")
                raise
            except Exception as exc:
                logger.error("[ReviewerFacade] Streaming error: %s", exc)
                yield json.dumps({"status": "error", "message": str(exc)}) + "\n"
                break

    @staticmethod
    def _serialize_event(event: object) -> str:
        """Serialise a queue event to a JSON string."""
        if isinstance(event, BaseModel):
            return event.model_dump_json(exclude_none=True)
        if isinstance(event, dict):
            return json.dumps(event)
        return json.dumps({"data": str(event)})


__all__ = ["ReviewerFacade"]
