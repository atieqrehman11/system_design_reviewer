"""
Document text extraction service.

Responsibility: Extract plain text from uploaded files.
Does NOT handle HTTP concerns — raises plain Python exceptions.
The caller (endpoint) is responsible for mapping these to HTTP responses.
"""
import io
from pathlib import Path

from fastapi import UploadFile

from app.config.config import settings


class ExtractionError(Exception):
    """Raised when text cannot be extracted from a file."""
    def __init__(self, message: str, status_code: int = 422):
        super().__init__(message)
        self.status_code = status_code


class DocumentExtractor:
    """Extracts plain text from uploaded design document files."""

    TEXT_EXTENSIONS = {'.txt', '.md', '.json'}
    SUPPORTED_EXTENSIONS = TEXT_EXTENSIONS | {'.pdf', '.doc', '.docx'}

    def __init__(self):
        max_mb = settings.get_int("reviewer_max_file_size_mb", 5)
        self.max_file_size_bytes = max_mb * 1024 * 1024

    async def extract(self, file: UploadFile) -> str:
        """Validate and extract text content from an uploaded file.

        Raises:
            ExtractionError: with status_code 400 for unsupported type,
                             413 for file too large, 422 for extraction failure.
        """
        extension = Path(file.filename or '').suffix.lower()

        if extension not in self.SUPPORTED_EXTENSIONS:
            supported = ', '.join(sorted(self.SUPPORTED_EXTENSIONS))
            raise ExtractionError(
                f"Unsupported file type '{extension}'. Supported: {supported}",
                status_code=400,
            )

        content = await file.read()

        if len(content) > self.max_file_size_bytes:
            max_mb = self.max_file_size_bytes // (1024 * 1024)
            raise ExtractionError(
                f"File exceeds maximum size of {max_mb}MB",
                status_code=413,
            )

        try:
            return self._extract_content(content, extension)
        except ExtractionError:
            raise
        except Exception as exc:
            raise ExtractionError(
                "Could not extract text from file. The file may be corrupted or password-protected.",
            ) from exc

    def _extract_content(self, content: bytes, extension: str) -> str:
        if extension in self.TEXT_EXTENSIONS:
            return content.decode('utf-8')
        if extension == '.pdf':
            return self._extract_pdf(content)
        return self._extract_docx(content)

    def _extract_pdf(self, content: bytes) -> str:
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(content))
        pages = [page.extract_text() or '' for page in reader.pages]
        text = '\n\n'.join(p for p in pages if p.strip())
        if not text.strip():
            raise ExtractionError(
                "Could not extract text from PDF. The file may be scanned or image-based.",
            )
        return text

    def _extract_docx(self, content: bytes) -> str:
        from docx import Document

        doc = Document(io.BytesIO(content))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        text = '\n\n'.join(paragraphs)
        if not text.strip():
            raise ExtractionError(
                "Could not extract text from document. The file may be empty.",
            )
        return text


__all__ = ['DocumentExtractor', 'ExtractionError']
