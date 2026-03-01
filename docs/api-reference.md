# API Reference

This document provides detailed information about the System Design Mentor API endpoints.

## Base URL

```
http://localhost:8000/api/v1
```

For production deployments, replace with your production URL.

## Authentication

Currently, the API does not require authentication for development. Authentication will be added in future versions.

## Endpoints

### Health Check

Check the API status and version.

**Endpoint**: `GET /api/v1/status`

**Response**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "service": "System Design Mentor API"
}
```

**Status Codes**:
- `200 OK`: Service is healthy

**Example**:
```bash
curl http://localhost:8000/api/v1/status
```

---

### Submit Architecture Review

Submit an architecture design document for AI-powered review.

**Endpoint**: `POST /api/v1/review`

**Request Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "content": "string",
  "format": "markdown",
  "options": {
    "focus_areas": ["scalability", "security", "reliability"],
    "detail_level": "comprehensive"
  }
}
```

**Parameters**:
- `content` (required, string): The architecture design document content
- `format` (optional, string): Document format. Default: "markdown"
- `options` (optional, object): Review configuration options
  - `focus_areas` (optional, array): Specific areas to focus on
  - `detail_level` (optional, string): Level of detail ("brief", "standard", "comprehensive")

**Response**:
```json
{
  "review_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "analysis": {
    "scalability": {
      "score": 7,
      "issues": [
        "Single database instance creates bottleneck",
        "No horizontal scaling strategy defined"
      ],
      "recommendations": [
        "Implement database read replicas",
        "Add load balancer for horizontal scaling"
      ]
    },
    "security": {
      "score": 4,
      "issues": [
        "Unencrypted database",
        "Weak authentication mechanism"
      ],
      "recommendations": [
        "Enable database encryption at rest",
        "Implement OAuth 2.0 or JWT authentication"
      ]
    },
    "reliability": {
      "score": 5,
      "issues": [
        "Single point of failure in database",
        "No backup strategy mentioned"
      ],
      "recommendations": [
        "Implement database replication",
        "Set up automated backups"
      ]
    },
    "performance": {
      "score": 6,
      "issues": [
        "Synchronous report generation blocks main thread"
      ],
      "recommendations": [
        "Move report generation to background queue"
      ]
    }
  },
  "summary": "The architecture shows promise but has critical security and scalability concerns...",
  "overall_score": 5.5,
  "timestamp": "2026-03-01T12:00:00Z",
  "processing_time_ms": 3500
}
```

**Status Codes**:
- `200 OK`: Review completed successfully
- `400 Bad Request`: Invalid request body
- `422 Unprocessable Entity`: Validation error
- `500 Internal Server Error`: Server error during processing

**Example**:
```bash
curl -X POST http://localhost:8000/api/v1/review \
  -H "Content-Type: application/json" \
  -d '{
    "content": "## System Overview\nA web platform for...",
    "format": "markdown"
  }'
```

---

### Get Review by ID

Retrieve a previously completed review.

**Endpoint**: `GET /api/v1/review/{review_id}`

**Path Parameters**:
- `review_id` (required, string): UUID of the review

**Response**:
```json
{
  "review_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "analysis": { ... },
  "summary": "...",
  "timestamp": "2026-03-01T12:00:00Z"
}
```

**Status Codes**:
- `200 OK`: Review found
- `404 Not Found`: Review not found

**Example**:
```bash
curl http://localhost:8000/api/v1/review/550e8400-e29b-41d4-a716-446655440000
```

---

## Data Models

### Review Request

```typescript
interface ReviewRequest {
  content: string;           // Architecture document content
  format?: string;           // Document format (default: "markdown")
  options?: {
    focus_areas?: string[];  // Areas to focus on
    detail_level?: string;   // Detail level
  };
}
```

### Review Response

```typescript
interface ReviewResponse {
  review_id: string;         // Unique review identifier
  status: string;            // Review status
  analysis: {
    scalability: AnalysisSection;
    security: AnalysisSection;
    reliability: AnalysisSection;
    performance: AnalysisSection;
  };
  summary: string;           // Overall summary
  overall_score: number;     // Score out of 10
  timestamp: string;         // ISO 8601 timestamp
  processing_time_ms: number;
}

interface AnalysisSection {
  score: number;             // Score out of 10
  issues: string[];          // Identified issues
  recommendations: string[]; // Recommendations
}
```

## Error Responses

All error responses follow this format:

```json
{
  "detail": "Error message describing what went wrong",
  "error_code": "ERROR_CODE",
  "timestamp": "2026-03-01T12:00:00Z"
}
```

### Common Error Codes

- `INVALID_REQUEST`: Request body is malformed
- `VALIDATION_ERROR`: Request validation failed
- `PROCESSING_ERROR`: Error during review processing
- `NOT_FOUND`: Requested resource not found
- `INTERNAL_ERROR`: Internal server error

## Rate Limiting

Currently, there are no rate limits in development. Production deployments should implement appropriate rate limiting.

## Interactive Documentation

FastAPI provides interactive API documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

These interfaces allow you to:
- Explore all available endpoints
- View request/response schemas
- Test API calls directly from the browser
- Download OpenAPI specification

## Code Examples

### Python

```python
import requests

# Submit a review
response = requests.post(
    "http://localhost:8000/api/v1/review",
    json={
        "content": "## System Overview\nA web platform...",
        "format": "markdown"
    }
)

review = response.json()
print(f"Review ID: {review['review_id']}")
print(f"Overall Score: {review['overall_score']}")
```

### JavaScript/TypeScript

```typescript
// Submit a review
const response = await fetch('http://localhost:8000/api/v1/review', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    content: '## System Overview\nA web platform...',
    format: 'markdown'
  })
});

const review = await response.json();
console.log(`Review ID: ${review.review_id}`);
console.log(`Overall Score: ${review.overall_score}`);
```

### cURL

```bash
# Submit a review
curl -X POST http://localhost:8000/api/v1/review \
  -H "Content-Type: application/json" \
  -d @architecture.json

# Get review status
curl http://localhost:8000/api/v1/status
```

## Webhooks

Webhook support is planned for future releases to notify you when long-running reviews complete.

## Versioning

The API uses URL versioning (e.g., `/api/v1/`). Breaking changes will result in a new version (e.g., `/api/v2/`).

## Support

For API issues or questions, check the interactive documentation at `/docs` or open an issue on the project repository.
