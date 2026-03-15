from queue import Queue
from threading import Thread
from app.services.reviewer.reviewer_crew import DesignReviewerCrew
from app.models.api_schema import ReviewRequest, ReviewResponse
from app.services.reviewer.reviewer_event_listeners import ReviewerEventListener
from app.common.event_dispatcher import EventDispatcher

event_dispatcher = EventDispatcher()
ReviewerEventListener(event_dispatcher=event_dispatcher)  # Initialize the listener with the dispatcher

class ReviewerService:
    def __init__(self):
        self.reviewer_crew = DesignReviewerCrew()

    def run_crew_job(self, request: ReviewRequest, sync_queue: Queue):
        """
        Starts the blocking Crew process in a separate thread.
        This is now a pure 'trigger' method.
        """
        def _target():
            design_doc = request.design_doc
            correlation_id = request.correlation_id
            try:
                # Initialize the crew inside the thread
                crew = self.reviewer_crew.crew()
                # crew.config['session_id'] = session_id

                for agent in crew.agents:
                    agent.fingerprint.metadata['correlation_id'] = correlation_id

                # You'll need to pass your listener/queue to the crew configuration
                crew.kickoff(inputs={
                    'design_doc': design_doc,
                    'output_format': request.output_format,
                })
            except Exception as e:
                message = ReviewResponse(
                    agent="System",
                    message_type="error",
                    message=str(e),
                    status="error")
                sync_queue.put(message)
            finally:
                sync_queue.put(None)  # Signal to close the stream after processing

        Thread(target=_target, daemon=True).start()

__all__ = ['ReviewerService']