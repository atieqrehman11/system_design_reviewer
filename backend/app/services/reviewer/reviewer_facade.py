import asyncio
import json
from queue import Queue, Empty
from typing import AsyncGenerator

from pydantic import BaseModel

from app.services.reviewer.reviewer_service import ReviewerService
from app.common.event_dispatcher import EventDispatcher

from app.models.api_schema import ReviewRequest

class ReviewerFacade:
    def __init__(self, reviewer_service: ReviewerService, event_dispatcher: EventDispatcher = None):
        self.reviewer_service = reviewer_service
        self.event_dispatcher = event_dispatcher

    async def start_review(self, request: ReviewRequest) -> AsyncGenerator[str, None]:
        """
        1. Creates a local queue
        2. Starts the service immediately
        3. Returns the async generator
        """
        sync_queue = Queue() # Standard threaded Queue
        
        self.event_dispatcher.register_session(request.correlation_id, sync_queue)

        try:    
            # Start the execution IMMEDIATELY
            self.reviewer_service.run_crew_job(request, sync_queue)
            
            # Return the generator that will poll the sync_queue
            async for chunk in self._async_generator_wrapper(sync_queue):
               yield chunk
        
        finally:
            print(f"Unregistering session: {request.correlation_id}")
            self.event_dispatcher.unregister_session(request.correlation_id)

    async def _async_generator_wrapper(self, sync_queue: Queue):
        """Polls the threaded queue and yields to the async stream."""
        while True:
            try:
                # 1. Fetch from the threaded queue without blocking the event loop
                # We use a very short timeout here
                event = await asyncio.get_event_loop().run_in_executor(
                    None, lambda: sync_queue.get(timeout=0.2)
                )
                
                # 2. Check for the "Poison Pill" (None) to shut down
                if event is None:
                    print("Received shutdown signal (None) in queue. Closing stream.")
                    break 

                # 3. Serialize based on type (Fixes your AttributeError)
                if isinstance(event, BaseModel):
                    payload = event.model_dump_json(exclude_none=True)
                elif isinstance(event, dict):
                    payload = json.dumps(event)
                else:
                    payload = json.dumps({"data": str(event)})

                # 4. YIELD AND FLUSH
                # Adding an extra newline (\n\n) helps some clients recognize the chunk
                yield f"{payload}\n\n"
                
                # 5. Check for completion to close the stream
                # We check both the Pydantic attribute and Dict key
                status = getattr(event, 'status', None) if not isinstance(event, dict) else event.get('status')
                
                # Note: CrewAI sometimes uses "completed" instead of "complete"
                if status in ["complete", "completed", "error"]:
                    break
                    
            except Empty:
                # print("Queue is empty, yielding control to event loop...")
                await asyncio.sleep(0.1)  # Sleep briefly to avoid busy waiting
                continue 
            except asyncio.CancelledError:
                # If the user disconnects or server stops
                print("Stream cancelled by client or server.")
                break
            except Exception as e:
                # Log the error and send it to the client so you know why it failed
                print(f"Streaming Error: {e}")
                yield json.dumps({"status": "error", "message": str(e)}) + "\n"
                break

__all__ = ['ReviewerFacade']