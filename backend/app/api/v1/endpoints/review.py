from app.models.api_schema import ReviewRequest, ReviewResponse
from fastapi import APIRouter

from app.services.review_crew_v1 import ReviewCrewV1

router = APIRouter()

@router.post("/multi-agent-review", response_model=ReviewResponse)
async def start_audit(data: ReviewRequest):
    # Keep the endpoint thin! Delegate work to a service.

    result = ReviewCrewV1().crew().kickoff(inputs={'design_doc': data.design_doc})
    response = result.pydantic.model_dump()

    # 4. Return successful analysis
    return ReviewResponse(
        status="success",
        message="Architecture analysis complete.",
        report=response
    )
