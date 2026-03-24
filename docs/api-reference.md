# API Reference

This document describes the System Design Mentor API endpoints.

## Base URL

```
http://localhost:8000/api/v1
```

## Authentication

No authentication is required in development. Production deployments should add appropriate auth middleware.

---

## Endpoints

### Health Check

**`GET /api/v1/status`**

**Response**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "service": "System Design Mentor API"
}
```

```bash
curl http://localhost:8000/api/v1/status
```

---

### Submit Review (JSON)

**`POST /api/v1/review`**

Submit a design document as JSON text. Returns a streaming NDJSON response.

**Request Headers**:
```
Content-Type: application/json
X-Correlation-ID: <client-generated UUID>   # optional; UUID generated server-side if absent
```

**Request Body**:
```json
{
  "design_doc": "## System Overview\nA web platform for...",
  "output_format": "markdown"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `design_doc` | string | Yes | Architecture document content |
| `output_format` | string | No | `markdown` (default), `plain`, or `json` |

**Response**: `200 OK` — `application/x-ndjson` stream of `ReviewResponse` events (see [Stream Events](#stream-events)).

**Error responses**:
- `400` — missing or invalid input
- `422` — validation error (Pydantic)
- `500` — server error

```bash
curl -X POST http://localhost:8000/api/v1/review \
  -H "Content-Type: application/json" \
  -H "X-Correlation-ID: $(uuidgen)" \
  -d '{"design_doc": "## Overview\nA monolithic web app..."}'
```

---

### Submit Review (File Upload)

**`POST /api/v1/review/upload`**

Submit a design document as a file upload. Returns a streaming NDJSON response.

**Request**: `multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | file | No* | Document file (`.txt`, `.md`, `.json`, `.pdf`, `.doc`, `.docx`, max 5 MB) |
| `design_doc` | string | No* | Inline text (combined with file content if both provided) |
| `output_format` | string | No | `markdown` (default), `plain`, or `json` |

*At least one of `file` or `design_doc` must be provided.

**Request Headers**:
```
X-Correlation-ID: <client-generated UUID>   # optional
```

**Response**: `200 OK` — `application/x-ndjson` stream (same format as JSON endpoint).

**Error responses**:
- `400` — no input provided, or unsupported file type
- `413` — file exceeds size limit
- `422` — extraction or validation error

```bash
curl -X POST http://localhost:8000/api/v1/review/upload \
  -H "X-Correlation-ID: $(uuidgen)" \
  -F "file=@architecture.pdf" \
  -F "output_format=markdown"
```

---

### Follow-up Chat

**`POST /api/v1/chat/{correlation_id}`**

Ask a follow-up question about a completed review. Returns a streaming NDJSON response.

**Path Parameters**:
- `correlation_id` — UUID of the completed review session

**Request Body**:
```json
{
  "correlation_id": "fbae9840-107b-4acb-85f0-139802ceb678",
  "messages": [
    { "role": "user", "content": "What are the top security risks?" },
    { "role": "assistant", "content": "The main risks are..." },
    { "role": "user", "content": "How should I fix the authentication issue?" }
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `correlation_id` | string | Must match the path parameter |
| `messages` | array | Full conversation history including the current question as the last entry |

**Response**: `200 OK` — `application/x-ndjson` stream of chat chunks.

**Chat stream events**:
```jsonc
{"chunk": "Here are the action items..."}   // content chunk
{"chunk": " to address the issues..."}      // subsequent chunks
{"status": "complete"}                       // end of stream
{"status": "error", "message": "..."}       // error
```

**Error responses**:
- `404` — review session not found for the given `correlation_id`

```bash
curl -X POST http://localhost:8000/api/v1/chat/fbae9840-107b-4acb-85f0-139802ceb678 \
  -H "Content-Type: application/json" \
  -d '{
    "correlation_id": "fbae9840-107b-4acb-85f0-139802ceb678",
    "messages": [{"role": "user", "content": "What are the main risks?"}]
  }'
```

---

## Stream Events

Both review endpoints stream NDJSON — one JSON object per line (`\n\n` between events).

### Agent Thinking

Emitted when an agent starts executing.

```json
{
  "agent": "Architectural Librarian",
  "message_type": "thinking",
  "status": "executing",
  "message": "**Indexing the architectural blueprint...**"
}
```

### Agent Result

Emitted when an agent completes its task.

```json
{
  "agent": "SRE Performance Architect",
  "message_type": "result",
  "status": "executed",
  "report": {
    "summary": "## System Readiness\n...",
    "bottlenecks": [...],
    "scalability_blockers": [...],
    "reliability_score": { "score": 62, "justification": "..." }
  }
}
```

### Review Complete

Emitted after all agents finish and the review is saved.

```json
{
  "status": "complete",
  "message": "Design review completed!"
}
```

### Error

Emitted if validation fails or an unrecoverable error occurs.

```json
{
  "status": "error",
  "message": "The document is too short to analyze. Please provide more detail.",
  "feedback": "Please provide a design document to review."
}
```

---

## Data Models

### ReviewRequest

```typescript
interface ReviewRequest {
  design_doc?: string;        // Architecture document content
  correlation_id?: string;    // Set from X-Correlation-ID header; auto-generated if absent
  output_format?: 'markdown' | 'plain' | 'json';  // default: 'markdown'
}
```

### ChatRequest

```typescript
interface ChatRequest {
  correlation_id: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}
```

### ErrorResponse

```json
{
  "success": false,
  "status_code": 400,
  "message": "No input provided. Please supply a file or design_doc.",
  "error_type": "MissingInputException",
  "feedback": null
}
```

---

## Interactive Documentation

FastAPI provides interactive docs at:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## Code Examples

### Python

```python
import uuid
import requests

correlation_id = str(uuid.uuid4())

response = requests.post(
    "http://localhost:8000/api/v1/review",
    headers={"X-Correlation-ID": correlation_id},
    json={"design_doc": "## System Overview\nA web platform...", "output_format": "markdown"},
    stream=True,
)

for line in response.iter_lines():
    if line:
        print(line.decode())
```

### TypeScript

```typescript
const correlationId = crypto.randomUUID();

const response = await fetch('http://localhost:8000/api/v1/review', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Correlation-ID': correlationId,
  },
  body: JSON.stringify({
    design_doc: '## System Overview\nA web platform...',
    output_format: 'markdown',
  }),
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  console.log(decoder.decode(value));
}
```

---

## Versioning

The API uses URL versioning (`/api/v1/`). Breaking changes will result in a new version prefix.
