from queue import Queue
from threading import Thread
from app.services.reviewer.reviewer_crew import DesignReviewerCrew
from app.models.api_schema import ReviewRequest, ReviewResponse
from app.services.reviewer.reviewer_event_listeners import ReviewerEventListener
from app.common.event_dispatcher import EventDispatcher
from app.services.review_store import save_review

event_dispatcher = EventDispatcher()
ReviewerEventListener(event_dispatcher=event_dispatcher)  # Initialize the listener with the dispatcher

class ReviewerService:
    def __init__(self):
        self.reviewer_crew = DesignReviewerCrew()

    def _extract_report_data(self, result) -> dict:
        """Extract serialisable report data from a CrewOutput, trying pydantic → json_dict → raw."""
        if result.pydantic:
            return result.pydantic.model_dump(exclude_none=True)
        if result.json_dict:
            return result.json_dict
        if result.raw:
            return {"raw": result.raw}
        return {}

    def _persist_review(self, correlation_id: str, design_doc: str, result) -> None:
        """Save the review result to the store; logs but does not raise on failure."""
        report_data = self._extract_report_data(result)
        if not report_data:
            print(f"[ReviewerService] No report data to save for correlation_id={correlation_id}")
            return
        try:
            save_review(correlation_id, design_doc, report_data)
            print(f"[ReviewerService] Review saved for correlation_id={correlation_id}")
        except Exception as save_err:
            print(f"[ReviewerService] Failed to persist review session: {save_err}")

    def run_crew_job(self, request: ReviewRequest, sync_queue: Queue):
        """
        Starts the blocking Crew process in a separate thread.
        This is now a pure 'trigger' method.
        """
        def _target():
            design_doc = request.design_doc
            correlation_id = request.correlation_id
            try:
                crew = self.reviewer_crew.crew()

                for agent in crew.agents:
                    agent.fingerprint.metadata['correlation_id'] = correlation_id

                result = crew.kickoff(inputs={
                    'design_doc': design_doc,
                    'output_format': request.output_format,
                })

                # Persist the review so follow-up chat has context, then signal
                # completion. The "complete" event is dispatched AFTER _persist_review
                # so the SQLite row is guaranteed to exist when the frontend
                # enters follow-up mode and sends its first chat message.
                print(f"[ReviewerService] crew.kickoff() returned. pydantic={getattr(result, 'pydantic', 'N/A')}")
                if result:
                    self._persist_review(correlation_id, design_doc, result)

                complete_msg = ReviewResponse(
                    status="complete",
                    message="Design review completed!",
                )
                event_dispatcher.dispatch(correlation_id, complete_msg)

            except Exception as e:
                message = ReviewResponse(
                    agent="System",
                    message_type="error",
                    message=str(e),
                    status="error",
                )
                sync_queue.put(message)
            finally:
                sync_queue.put(None)  # Signal to close the stream after processing

        Thread(target=_target, daemon=True).start()

__all__ = ['ReviewerService']