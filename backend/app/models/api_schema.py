from pydantic import BaseModel
from typing import Literal, Optional


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


# Define the response schema
class ReviewResponse(BaseModel):
    agent: Optional[str] = None
    message_type: Optional[str] = None
    status: Optional[str] = None
    message: Optional[str] = None
    report: Optional[object] = None


__all__ = ["ReviewRequest", "ReviewResponse"]