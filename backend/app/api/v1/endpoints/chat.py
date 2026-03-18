"""
Chat API endpoint — follow-up conversation over a completed review session.
"""
from typing import List, Literal

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.common.exception_handlers import ReviewSessionNotFoundException
from app.services.chat_service import ChatService
from app.services.review_store import get_review

router = APIRouter()

_chat_service = ChatService()

_STREAM_HEADERS = {
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
}


class ChatMessageRequest(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    correlation_id: str
    messages: List[ChatMessageRequest]


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
        headers=_STREAM_HEADERS,
    )
