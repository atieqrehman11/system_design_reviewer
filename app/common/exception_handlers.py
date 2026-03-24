import traceback

from azure.core.exceptions import ResourceNotFoundError
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from .logger import logger


# ---------------------------------------------------------------------------
# Domain exceptions
# ---------------------------------------------------------------------------

class ValidationFailedException(Exception):
    def __init__(self, feedback: str) -> None:
        self.feedback = feedback
        super().__init__(self.feedback)


class ReviewSessionNotFoundException(Exception):
    def __init__(self, correlation_id: str) -> None:
        self.message = (
            f"Review session '{correlation_id}' not found. "
            "Submit a design document for review first."
        )
        super().__init__(self.message)


class MissingInputException(Exception):
    def __init__(self) -> None:
        self.message = "Either 'file' or 'design_doc' must be provided."
        super().__init__(self.message)


class DocumentExtractionException(Exception):
    def __init__(self, message: str, status_code: int = 422) -> None:
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


# ---------------------------------------------------------------------------
# Handler registration
# ---------------------------------------------------------------------------

def register_exception_handlers(app: FastAPI) -> None:

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        stack_trace = traceback.format_exc()
        status_code = getattr(exc, "status_code", 500)
        detail = getattr(exc, "detail", str(exc)) or "An unexpected error occurred"
        logger.error("Unhandled exception: %s\n%s", detail, stack_trace, exc_info=True)
        return JSONResponse(
            status_code=status_code,
            content={"success": False, "status_code": status_code, "message": detail, "error_type": "HTTP_ERROR"},
        )

    @app.exception_handler(ValidationFailedException)
    async def validation_exception_handler(request: Request, exc: ValidationFailedException):
        stack_trace = traceback.format_exc()
        logger.error("Validation error: %s\n%s", exc.feedback, stack_trace)
        return JSONResponse(
            status_code=400,
            content={"success": False, "status_code": 400, "message": exc.feedback, "error_type": "VALIDATION_ERROR"},
        )

    @app.exception_handler(ReviewSessionNotFoundException)
    async def review_session_not_found_handler(request: Request, exc: ReviewSessionNotFoundException):
        stack_trace = traceback.format_exc()
        logger.error("Review session not found: %s\n%s", exc.message, stack_trace)
        return JSONResponse(
            status_code=404,
            content={"success": False, "status_code": 404, "message": exc.message, "error_type": "REVIEW_SESSION_NOT_FOUND"},
        )

    @app.exception_handler(MissingInputException)
    async def missing_input_handler(request: Request, exc: MissingInputException):
        logger.error("Missing input: %s", exc.message)
        return JSONResponse(
            status_code=400,
            content={"success": False, "status_code": 400, "message": exc.message, "error_type": "MISSING_INPUT"},
        )

    @app.exception_handler(DocumentExtractionException)
    async def document_extraction_handler(request: Request, exc: DocumentExtractionException):
        logger.error("Document extraction failed: %s", exc.message)
        return JSONResponse(
            status_code=exc.status_code,
            content={"success": False, "status_code": exc.status_code, "message": exc.message, "error_type": "EXTRACTION_ERROR"},
        )

    @app.exception_handler(ResourceNotFoundError)
    async def azure_resource_not_found_handler(request: Request, exc: ResourceNotFoundError):
        stack_trace = traceback.format_exc()
        error_message = getattr(exc, "message", "The requested Azure resource was not found.")
        logger.error("Azure Resource Error: %s\n%s", error_message, stack_trace)
        return JSONResponse(
            status_code=404,
            content={
                "success": False,
                "status_code": 404,
                "message": error_message,
                "error_type": "AZURE_RESOURCE_NOT_FOUND",
                "hint": "Ensure your AZURE_ENDPOINT is the base URL and does not include '/openai/deployments/'",
            },
        )
