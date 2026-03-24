"""
Reviewer facade — orchestrates session registration and NDJSON streaming
for a design review job.
"""
import uuid
from queue import Queue
from typing import TYPE_CHECKING, Annotated, AsyncGenerator, Literal, Optional

from fastapi import UploadFile

from app.common.event_dispatcher import EventDispatcher
from app.common.logger import logger
from app.common.streaming import stream_queue
from app.models.api_schema import ReviewRequest
from app.services.document_extractor import DocumentExtractor, ExtractionError
from app.services.reviewer.reviewer_service import ReviewerService

_DEFAULT_PROMPT = "Please perform a comprehensive architectural review of this design document."


class ReviewerFacade:
    def __init__(
        self,
        reviewer_service: ReviewerService,
        event_dispatcher: EventDispatcher,
        document_extractor: DocumentExtractor,
    ) -> None:
        self.reviewer_service = reviewer_service
        self.event_dispatcher = event_dispatcher
        self.document_extractor = document_extractor

    async def review_upload(
        self,
        file: Optional[UploadFile],
        design_doc: Optional[str],
        output_format: Literal["markdown", "plain", "json"],
        correlation_id: str,
    ) -> AsyncGenerator[str, None]:
        """Extract text from an optional file upload, merge with inline text, and stream review."""
        extracted: Optional[str] = None
        if file is not None:
            extracted = await self.document_extractor.extract(file)

        if extracted and design_doc:
            content = f"{design_doc}\n\n---\n\n{extracted}"
        elif extracted:
            content = f"{_DEFAULT_PROMPT}\n\n---\n\n{extracted}"
        else:
            content = design_doc or ""

        request = ReviewRequest(
            design_doc=content,
            correlation_id=correlation_id,
            output_format=output_format,
        )
        async for chunk in self.start_review(request):
            yield chunk

    async def start_review(self, request: ReviewRequest) -> AsyncGenerator[str, None]:
        """Register the session, kick off the crew job, and stream results."""
        sync_queue: Queue = Queue()
        self.event_dispatcher.register_session(request.correlation_id, sync_queue)
        try:
            self.reviewer_service.run_crew_job(request, sync_queue)
            async for chunk in stream_queue(sync_queue, label="ReviewerFacade"):
                yield chunk
        finally:
            logger.debug("[ReviewerFacade] Unregistering session: %s", request.correlation_id)
            self.event_dispatcher.unregister_session(request.correlation_id)


__all__ = ["ReviewerFacade"]
