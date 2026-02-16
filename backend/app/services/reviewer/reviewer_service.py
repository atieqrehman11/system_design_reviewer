
import asyncio
from queue import Queue, Empty
from threading import Thread

from fastapi.responses import StreamingResponse
from app.models.api_schema import ReviewResponse
from app.services.reviewer.reviewer_crew import DesignReviewerCrew
from app.services.reviewer.reviewer_event_listeners import ReviewerEventListener

class ReviewerService:
    """Service to handle design review logic."""
    def __init__(self):
        self.queue = Queue()
        self.event_listener = ReviewerEventListener(self.queue)
        self.crew = DesignReviewerCrew().crew()

    def review_design_document(self, design_doc: str):
        """Public method to start the design review process."""
        Thread(target=self._execute, args=(self.queue, design_doc)).start()

        return StreamingResponse(
            self._event_generator(self.queue), 
            media_type="application/x-ndjson",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
    
    def _execute(self, event_queue: Queue, design_doc: str) -> None:
        """Execute the review and put results in queue.    """
        try:
            
            self.crew.kickoff(inputs={'design_doc': design_doc})

        except Exception as e:
            event_message = ReviewResponse(status="error", message=f"Error occurred during review: {str(e)}")
            event_queue.put(event_message)


    async def _event_generator(self, event_queue: Queue):
        """Stream events from queue for streaming response."""
        while True:
            try:
                # Use blocking get with timeout to allow for real-time streaming
                event_message = event_queue.get_nowait()
                
                chunk = f"{event_message.model_dump_json(exclude_none=True)}\n"
                yield chunk
                
                # MANDATORY: This allows the event loop to flush the buffer to the client
                await asyncio.sleep(0.01) 
                
                if event_message.status in ["complete", "error"]:
                    break
            
            except Empty:
                # Queue is empty, continue polling
                await asyncio.sleep(0.1)
                
            except Exception:
                # No items in queue, continue polling
                await asyncio.sleep(0.1)
        
__all__ = ["ReviewerService"]
