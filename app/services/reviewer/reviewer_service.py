"""
Reviewer service — wires the DesignReviewerCrew to the generic crew runner,
providing reviewer-specific persistence and completion callbacks.
"""
from queue import Queue
from typing import Any

from app.common.crew_runner import run_crew_in_thread
from app.common.event_dispatcher import EventDispatcher
from app.common.logger import logger
from app.common.request_context import get_correlation_id
from app.models.api_schema import ReviewRequest, ReviewResponse
from app.services.review_store import save_review
from app.services.reviewer.reviewer_crew import DesignReviewerCrew


class ReviewerService:
    def __init__(self, event_dispatcher: EventDispatcher) -> None:
        self.reviewer_crew = DesignReviewerCrew()
        self._event_dispatcher = event_dispatcher

    # ------------------------------------------------------------------
    # Callbacks injected into the generic runner
    # ------------------------------------------------------------------

    def _on_complete(self, design_doc: str, result: Any) -> None:
        """Persist the report, then dispatch the completion event."""
        correlation_id = get_correlation_id()
        self._persist_review(correlation_id, design_doc, result)
        # Dispatch "complete" AFTER persist so the SQLite row exists
        # before the client enters follow-up mode.
        self._event_dispatcher.dispatch(
            correlation_id,
            ReviewResponse(status="complete", message="Design review completed!"),
        )

    def _on_error(self, exc: Exception) -> ReviewResponse:
        """Build a typed error event for the stream."""
        return ReviewResponse(
            agent="System",
            message_type="error",
            message=str(exc),
            status="error",
        )

    # ------------------------------------------------------------------
    # Persistence helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_report_data(result: Any) -> dict:
        """Extract serialisable report data from a CrewOutput."""
        if getattr(result, "pydantic", None):
            return result.pydantic.model_dump(exclude_none=True)
        if getattr(result, "json_dict", None):
            return result.json_dict
        if getattr(result, "raw", None):
            return {"raw": result.raw}
        return {}

    def _persist_review(self, correlation_id: str, design_doc: str, result: Any) -> None:
        """Save the review result to the store; logs but does not raise on failure."""
        report_data = self._extract_report_data(result)
        if not report_data:
            logger.warning("[ReviewerService] No report data to save")
            return
        try:
            save_review(correlation_id, design_doc, report_data)
            logger.debug("[ReviewerService] Review saved")
        except Exception as save_err:
            logger.error("[ReviewerService] Failed to persist review session: %s", save_err)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def run_crew_job(self, request: ReviewRequest, sync_queue: Queue) -> None:
        """Start the crew in a thread; correlation ID propagated via ContextVar set by the crew runner."""
        crew = self.reviewer_crew.crew()
        design_doc = request.design_doc

        def on_complete(result: Any) -> None:
            self._on_complete(design_doc, result)

        run_crew_in_thread(
            crew=crew,
            inputs={"design_doc": design_doc, "output_format": request.output_format, "correlation_id": request.correlation_id},
            correlation_id=request.correlation_id,
            sync_queue=sync_queue,
            event_dispatcher=self._event_dispatcher,
            on_complete=on_complete,
            on_error=self._on_error,
            label="ReviewerService",
        )


__all__ = ["ReviewerService"]
