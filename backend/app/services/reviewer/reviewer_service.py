from queue import Queue
from threading import Thread

from app.common.event_dispatcher import EventDispatcher
from app.common.logger import logger
from app.models.api_schema import ReviewRequest, ReviewResponse
from app.services.review_store import save_review
from app.services.reviewer.reviewer_crew import DesignReviewerCrew


class ReviewerService:
    def __init__(self, event_dispatcher: EventDispatcher) -> None:
        self.reviewer_crew = DesignReviewerCrew()
        self._event_dispatcher = event_dispatcher

    def _extract_report_data(self, result: object) -> dict:
        """Extract serialisable report data from a CrewOutput, trying pydantic → json_dict → raw."""
        if getattr(result, "pydantic", None):
            return result.pydantic.model_dump(exclude_none=True)
        if getattr(result, "json_dict", None):
            return result.json_dict
        if getattr(result, "raw", None):
            return {"raw": result.raw}
        return {}

    def _persist_review(self, correlation_id: str, design_doc: str, result: object) -> None:
        """Save the review result to the store; logs but does not raise on failure."""
        report_data = self._extract_report_data(result)
        if not report_data:
            logger.warning("[ReviewerService] No report data to save for correlation_id=%s", correlation_id)
            return
        try:
            save_review(correlation_id, design_doc, report_data)
            logger.info("[ReviewerService] Review saved for correlation_id=%s", correlation_id)
        except Exception as save_err:
            logger.error("[ReviewerService] Failed to persist review session: %s", save_err)

    def run_crew_job(self, request: ReviewRequest, sync_queue: Queue) -> None:
        """Starts the blocking Crew process in a separate thread."""

        def _target() -> None:
            design_doc = request.design_doc
            correlation_id = request.correlation_id
            try:
                crew = self.reviewer_crew.crew()

                for agent in crew.agents:
                    agent.fingerprint.metadata["correlation_id"] = correlation_id

                result = crew.kickoff(inputs={
                    "design_doc": design_doc,
                    "output_format": request.output_format,
                })

                logger.info("[ReviewerService] crew.kickoff() returned for correlation_id=%s", correlation_id)

                if result:
                    self._persist_review(correlation_id, design_doc, result)

                # Dispatch "complete" AFTER persist so the SQLite row exists
                # before the frontend enters follow-up mode.
                self._event_dispatcher.dispatch(
                    correlation_id,
                    ReviewResponse(status="complete", message="Design review completed!"),
                )

            except Exception as exc:
                logger.error("[ReviewerService] Crew job failed for correlation_id=%s: %s", correlation_id, exc)
                error_msg = ReviewResponse(
                    agent="System",
                    message_type="error",
                    message=str(exc),
                    status="error",
                )
                # Dispatch via event_dispatcher so the SSE stream receives the error,
                # and also put on sync_queue as a fallback for direct queue consumers.
                self._event_dispatcher.dispatch(correlation_id, error_msg)
                sync_queue.put(error_msg)

            finally:
                sync_queue.put(None)  # Poison pill — signals stream to close

        Thread(target=_target, daemon=True).start()


__all__ = ["ReviewerService"]
