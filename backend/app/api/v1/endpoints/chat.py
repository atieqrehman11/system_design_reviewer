"""
Chat API endpoint — follow-up conversation over a completed review session.
"""
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.common.exception_handlers import ReviewSessionNotFoundException
from app.models.api_schema import ChatMessageRequest, ChatRequest
from app.services.chat_service import ChatService
from app.services.review_store import get_review
from app.common.constants import STREAM_HEADERS

router = APIRouter()

_chat_service = ChatService()


@router.post("")
async def chat_followup(request: ChatRequest) -> StreamingResponse:
    """
    Stream a follow-up reply for a completed review session.

    Requires a valid correlation_id from a previously completed review.
    The messages list should contain the full conversation history,
    with the last entry being the user's current question.
    """
    session = get_review(request.correlation_id)
    if session is None:
        raise ReviewSessionNotFoundException(request.correlation_id)

    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    return StreamingResponse(
        _chat_service.stream_reply(
            design_doc=session["design_doc"],
            final_report=session["final_report"],
            messages=messages,
        ),
        media_type="application/x-ndjson",
        headers=STREAM_HEADERS,
    )
