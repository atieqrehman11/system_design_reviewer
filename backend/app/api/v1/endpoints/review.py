"""
Review API endpoints.

Responsibility: HTTP request/response handling only.
Delegates extraction to DocumentExtractor and review to ReviewerFacade.
"""
import uuid
from typing import Literal, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.params import Header
from fastapi.responses import StreamingResponse

from app.models.api_schema import ReviewRequest, ReviewResponse
from app.services.document_extractor import DocumentExtractor, ExtractionError
from app.services.reviewer.reviewer_facade import ReviewerFacade
from app.services.reviewer.reviewer_service import ReviewerService
from app.common.event_dispatcher import EventDispatcher

router = APIRouter()

_reviewer_service = ReviewerService()
_event_dispatcher = EventDispatcher()
_reviewer_facade = ReviewerFacade(_reviewer_service, _event_dispatcher)
_document_extractor = DocumentExtractor()

_STREAM_HEADERS = {
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
}


def _build_streaming_response(request: ReviewRequest) -> StreamingResponse:
    return StreamingResponse(
        _reviewer_facade.start_review(request),
        media_type="application/x-ndjson",
        headers={**_STREAM_HEADERS, "X-Task-ID": request.correlation_id},
    )


def _merge_content(extracted: Optional[str], inline: Optional[str]) -> str:
    default_prompt = "Please perform a comprehensive architectural review of this design document."
    if extracted and inline:
        return f"{inline}\n\n---\n\n{extracted}"
    if extracted:
        return f"{default_prompt}\n\n---\n\n{extracted}"
    return inline or ""


@router.post("", response_model=ReviewResponse)
async def review_design_document(
    data: ReviewRequest,
    x_a2a_task_id: Optional[str] = Header(None),
):
    """Submit a design document as JSON text for review."""
    request = ReviewRequest(
        design_doc=data.design_doc,
        correlation_id=x_a2a_task_id or data.correlation_id or str(uuid.uuid4()),
        output_format=data.output_format,
    )
    return _build_streaming_response(request)


@router.post("/upload", response_model=ReviewResponse)
async def review_design_document_upload(
    file: Optional[UploadFile] = File(None),
    design_doc: Optional[str] = Form(None),
    output_format: Literal["markdown", "plain", "json"] = Form("markdown"),
    x_a2a_task_id: Optional[str] = Header(None),
):
    """Submit a design document as a file upload (multipart/form-data) for review.

    Supported file types: .txt, .md, .json, .pdf, .doc, .docx (max 5MB).
    Optionally combine with inline text via the design_doc field.
    """
    if file is None and not design_doc:
        raise HTTPException(
            status_code=400,
            detail="Either 'file' or 'design_doc' must be provided.",
        )

    extracted: Optional[str] = None
    if file is not None:
        try:
            extracted = await _document_extractor.extract(file)
        except ExtractionError as exc:
            raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

    request = ReviewRequest(
        design_doc=_merge_content(extracted, design_doc),
        correlation_id=x_a2a_task_id or str(uuid.uuid4()),
        output_format=output_format,
    )
    return _build_streaming_response(request)
