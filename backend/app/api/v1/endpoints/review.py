from fastapi import APIRouter

from app.models.api_schema import ReviewRequest, ReviewResponse
from app.services.reviewer.reviewer_service import ReviewerService
router = APIRouter()

reviewer_service = ReviewerService()

@router.post("/multi-agent-review", response_model=ReviewResponse)
async def review_design_document(data: ReviewRequest):
    return reviewer_service.review_design_document(data.design_doc)
   