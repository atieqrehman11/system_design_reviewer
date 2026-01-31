from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import traceback
from .logger import logger
from azure.core.exceptions import ResourceNotFoundError

class ValidationFailedException(Exception):
    def __init__(self, feedback: str):
        self.feedback = feedback
        super().__init__(self.feedback)

def register_exception_handlers(app: FastAPI):

    @app.exception_handler(Exception)
    async def exception_handler(request: Request, exc: Exception):
        
        stack_trace = traceback.format_exc()
        logger.error(f"Exception: {exc.detail}\n{stack_trace}", exc_info=True)

        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "status_code": exc.status_code,
                "message": exc.detail, # This maps 'detail' to 'message'
                "error_type": "HTTP_ERROR"
            }
        )
    
    @app.exception_handler(ValidationFailedException)
    async def validateion_exception_handler(request: Request, exc: Exception):
        
        stack_trace = traceback.format_exc()
        logger.error(f"Exception: {exc.feedback}\n{stack_trace}", exc_info=True)
        status_code = 400
        return JSONResponse(
            status_code=status_code,
            content={
                "success": False,
                "status_code": status_code,
                "message": exc.feedback, # This maps 'detail' to 'message'
                "error_type": "VALIDATION_ERROR"
            }
        )
    @app.exception_handler(ResourceNotFoundError)
    async def resource_not_found_exception_handler(request: Request, exc: Exception):
        stack_trace = traceback.format_exc()
        error_message = getattr(exc, 'message', "The requested Azure resource was not found.")
        logger.error(f"Azure Resource Error: {error_message}\n{stack_trace}")
        status_code = 404

        return JSONResponse(
            status_code=status_code,
            content={
                "success": False,
                "status_code": status_code,
                "message": error_message,
                "error_type": "AZURE_RESOURCE_NOT_FOUND",
                "hint": "Ensure your AZURE_ENDPOINT is the base URL and does not include '/openai/deployments/..."
            }
        )
    