from app.models.final_report_schema import ReviewReport
from pydantic import BaseModel

from typing import Optional

class ErrorResponse(BaseModel):
    success: bool = False
    status_code: int
    message: str
    error_type: str
    feedback: Optional[str] = None
    
class ReviewRequest(BaseModel):
    design_doc: str

# Define the response schema
class ReviewResponse(BaseModel):
    agent: str = None
    message_type: str = None
    status: str = None
    message: str = None
    report: object = None

__all__ = ["ReviewRequest", "ReviewResponse"]