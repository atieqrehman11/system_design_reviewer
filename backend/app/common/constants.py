"""
Shared constants used across the application.
"""
from typing import FrozenSet

# Standard headers for NDJSON streaming responses
STREAM_HEADERS: dict = {
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
}

# Keywords that strongly suggest a system/software design document.
# Used by DesignReviewerCrew to validate submitted documents.
DESIGN_KEYWORDS: FrozenSet[str] = frozenset({
    "architecture", "system", "design", "service", "api", "database", "schema",
    "component", "microservice", "endpoint", "scalab", "deploy", "infrastructure",
    "backend", "frontend", "server", "client", "cache", "queue", "event",
    "security", "auth", "storage", "network", "protocol", "integration",
    "module", "interface", "data model", "flow", "pipeline", "cluster",
    "container", "kubernetes", "docker", "cloud", "aws", "azure", "gcp",
    "load balanc", "cdn", "latency", "throughput", "availability", "reliability",
})

__all__ = ["STREAM_HEADERS", "DESIGN_KEYWORDS"]
