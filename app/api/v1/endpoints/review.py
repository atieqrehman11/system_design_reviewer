"""
Review API endpoints.

Responsibility: HTTP request/response handling only.
Delegates extraction and orchestration to ReviewerFacade.
"""
import uuid
from typing import Annotated, Literal, Optional

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from fastapi.params import Header
from fastapi.responses import StreamingResponse

from app.models.api_schema import ReviewRequest, ReviewResponse
from app.services.document_extractor import ExtractionError
from app.services.reviewer.reviewer_facade import ReviewerFacade
from app.common.constants import STREAM_HEADERS
from app.common.exception_handlers import MissingInputException, DocumentExtractionException

router = APIRouter()


# ---------------------------------------------------------------------------
# Dependency providers — resolve shared singletons from app.state
# ---------------------------------------------------------------------------

def _get_reviewer_facade(request: Request) -> ReviewerFacade:
    return request.app.state.reviewer_facade

ReviewerFacadeDep = Annotated[ReviewerFacade, Depends(_get_reviewer_facade)]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _resolve_correlation_id(x_correlation_id: Optional[str]) -> str:
    return x_correlation_id or str(uuid.uuid4())


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("", response_model=ReviewResponse)
async def review_design_document(
    facade: ReviewerFacadeDep,
    data: ReviewRequest,
    x_correlation_id: Optional[str] = Header(None),
):
    """Submit a design document as JSON text for review."""
    request = ReviewRequest(
        design_doc=data.design_doc,
        correlation_id=_resolve_correlation_id(x_correlation_id),
        output_format=data.output_format,
    )
    
    return StreamingResponse(
        facade.start_review(request),
        media_type="application/x-ndjson",
        headers=STREAM_HEADERS,
    )

@router.post("/upload", response_model=ReviewResponse)
async def review_design_document_upload(
    facade: ReviewerFacadeDep,
    file: Annotated[Optional[UploadFile], File()] = None,
    design_doc: Annotated[Optional[str], Form()] = None,
    output_format: Annotated[Literal["markdown", "plain", "json"], Form()] = "markdown",
    x_correlation_id: Optional[str] = Header(None),
):
    """Submit a design document as a file upload (multipart/form-data) for review.

    Supported file types: .txt, .md, .json, .pdf, .doc, .docx (max 5MB).
    Optionally combine with inline text via the design_doc field.
    """
    if file is None and not design_doc:
        raise MissingInputException()

    try:
        return StreamingResponse(
            facade.review_upload(
                file=file,
                design_doc=design_doc,
                output_format=output_format,
                correlation_id=_resolve_correlation_id(x_correlation_id),
            ),
            media_type="application/x-ndjson",
            headers=STREAM_HEADERS,
        )
    except ExtractionError as exc:
        raise DocumentExtractionException(str(exc), exc.status_code) from exc
