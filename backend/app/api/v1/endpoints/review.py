import uuid
from fastapi import APIRouter
from fastapi.params import Header
from fastapi.responses import StreamingResponse

from app.models.api_schema import ReviewRequest, ReviewResponse
from app.services.reviewer.reviewer_facade import ReviewerFacade
from app.services.reviewer.reviewer_service import ReviewerService
from app.common.event_dispatcher import EventDispatcher

router = APIRouter()

reviewer_service = ReviewerService()
event_dispatcher = EventDispatcher()
reviewer_facade = ReviewerFacade(reviewer_service, event_dispatcher)

@router.post("", response_model=ReviewResponse)
async def review_design_document(data: ReviewRequest, x_a2a_task_id: str = Header(None)):
    correlation_id = x_a2a_task_id or str(uuid.uuid4())
    request = ReviewRequest(design_doc=data.design_doc, correlation_id=correlation_id)

    event_stream = reviewer_facade.start_review(request)  

    # Prepare the response in the router
    return StreamingResponse(
        event_stream, 
        media_type="application/x-ndjson",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "X-Task-ID": request.correlation_id  # Optional: include your task ID in headers
        }
    )
   