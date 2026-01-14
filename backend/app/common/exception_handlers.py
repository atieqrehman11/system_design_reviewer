from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import traceback
from .logger import logger

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
    