from fastapi import APIRouter
from app.api.v1.endpoints import status, review 

api_router = APIRouter()

# Register the individual routers
api_router.include_router(status.router, prefix="/status", tags=["App Status"])
api_router.include_router(review.router, prefix="/review", tags=["Architecture Design Review"])

