from fastapi import APIRouter, Request
from app.api.v1.endpoints import status, review 
from app.models.api_schema import ReviewRequest, ReviewResponse

api_router = APIRouter()

# Register the individual routers
api_router.include_router(status.router, prefix="/v1", tags=["App Status"])
api_router.include_router(review.router, prefix="/v1/review", tags=["Architecture Design Review"])

@api_router.get("/.well-known/reviewer-card.json")
async def get_agent_card(request: Request):
    base_url = request.base_url
    return {
        "name": "system-design-reviewer",
        "description": "A multi-agent crew that performs deep architectural reviews and design-doc auditing.",
        "version": "1.0.0",
        "capabilities": [
            {
                "name": "review_design",
                "description": "Reviews a system design document for security, scalability, and cost.",
                "input_schema": ReviewRequest.model_json_schema(), # Use your Pydantic schema
                "output_schema": ReviewResponse.model_json_schema()
            }
        ],
        "endpoints": {
            "stream": f"{base_url}api/v1/review",
        }
    }