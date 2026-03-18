from pydantic import BaseModel
from typing import Any, Dict, Literal, Optional


class ErrorResponse(BaseModel):
    success: bool = False
    status_code: int
    message: str
    error_type: str
    feedback: Optional[str] = None


class ReviewRequest(BaseModel):
    design_doc: Optional[str] = None
    correlation_id: Optional[str] = None
    output_format: Literal["markdown", "plain", "json"] = "markdown"


class ReviewResponse(BaseModel):
    agent: Optional[str] = None
    message_type: Optional[str] = None
    status: Optional[str] = None
    message: Optional[str] = None
    report: Optional[Dict[str, Any]] = None


class ChatMessageRequest(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    correlation_id: str
    messages: list[ChatMessageRequest]


__all__ = ["ReviewRequest", "ReviewResponse", "ChatMessageRequest", "ChatRequest", "ErrorResponse"]