# System Design Mentor — Design Document

## Overview

System Design Mentor is a full-stack AI-powered architecture review platform. Users submit system design documents (as text or file uploads), and a multi-agent AI crew analyzes them for performance, security, and architectural quality. Results are streamed back to the UI in real time.

---

## Architecture

The system follows a clean client-server architecture with a React SPA frontend and a FastAPI backend. Communication is one-directional streaming: the client submits a document and receives a live NDJSON stream of agent events until the review completes.

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (React SPA)                  │
│                                                             │
│  ChatInterface → useChatInterface → API Service Layer       │
│                                    ├── client.ts (fetch)    │
│                                    ├── retry.ts             │
│                                    ├── stream.ts (NDJSON)   │
│                                    └── transformer.ts       │
└──────────────────────────┬──────────────────────────────────┘
                           │  POST /api/v1/review  (JSON)
                           │  POST /api/v1/review/upload  (multipart)
                           │  ← NDJSON stream response
┌──────────────────────────▼──────────────────────────────────┐
│                     FastAPI Backend                         │
│                                                             │
│  review.py endpoint                                         │
│       │                                                     │
│       ├── DocumentExtractor  (file → plain text)            │
│       └── ReviewerFacade                                    │
│               │                                             │
│               ├── ReviewerService  (Thread)                 │
│               │       └── DesignReviewerCrew (CrewAI)       │
│               │               ├── librarian                 │
│               │               ├── performance_architect     │
│               │               ├── security_architect        │
│               │               └── chief_strategist          │
│               │                                             │
│               ├── ReviewerEventListener  (CrewAI events)    │
│               └── EventDispatcher  (session → Queue)        │
└─────────────────────────────────────────────────────────────┘
```

---

## Backend Design

### API Layer (`backend/app/api/v1/`)

Two endpoints handle review submissions, both returning a `StreamingResponse` with `application/x-ndjson` media type.

| Endpoint | Method | Input | Description |
|---|---|---|---|
| `/api/v1/review` | POST | JSON body | Text-only submission |
| `/api/v1/review/upload` | POST | multipart/form-data | File + optional inline text |
| `/api/v1/status` | GET | — | Health check |
| `/.well-known/reviewer-card.json` | GET | — | Agent capability card (A2A protocol) |

Both review endpoints resolve to the same `ReviewerFacade.start_review()` pipeline. A `correlation_id` (UUID) is assigned per request, either from the `X-A2A-Task-ID` header or auto-generated.

### Document Extraction (`DocumentExtractor`)

Handles file validation and text extraction before the review pipeline runs.

- Supported formats: `.txt`, `.md`, `.json`, `.pdf`, `.doc`, `.docx`
- Max file size: configurable via `reviewer_max_file_size_mb` (default 5MB)
- PDF extraction via `pypdf`; DOCX via `python-docx`
- Raises typed `ExtractionError` with appropriate HTTP status codes (400, 413, 422); the endpoint maps these to `HTTPException`

### Streaming Pipeline

The streaming architecture bridges a synchronous CrewAI execution thread with an async FastAPI response:

```
ReviewerFacade.start_review()
    │
    ├── Creates a thread-safe Queue
    ├── Registers session in EventDispatcher (correlation_id → Queue)
    ├── Calls ReviewerService.run_crew_job() → spawns daemon Thread
    └── Polls Queue via _async_generator_wrapper()
            │
            ├── run_in_executor() to avoid blocking the event loop
            ├── Serializes Pydantic models / dicts to JSON
            ├── Yields "payload\n\n" chunks
            └── Terminates on status "complete" | "error" | None (poison pill)
```

The `EventDispatcher` is a singleton that maps `correlation_id` → `Queue`. The `ReviewerEventListener` subscribes to CrewAI's event bus and dispatches typed `ReviewResponse` objects into the correct queue.

### CrewAI Multi-Agent Crew (`DesignReviewerCrew`)

The crew runs sequentially with four specialized agents. Configuration is versioned (`v1` / `v2`) and loaded from YAML files.

```
extract_blueprint_task  (librarian)
        │
        ├──► performance_review_task  (performance_architect)  ─┐
        │                                                        ├── final_review_task (chief_strategist)
        └──► security_review_task     (security_architect)    ──┘
```

The performance and security tasks share the blueprint as context and run with `async_execution: true`, meaning they execute concurrently before the final synthesis task.

#### Agents

| Agent | Display Name | Model | Role |
|---|---|---|---|
| `librarian` | Architectural Librarian | gpt-4o-mini (temp 0.0) | Extracts a structured `DocBlueprint` from the raw document |
| `performance_architect` | SRE Performance Architect | gpt-4o-mini (temp 0.2) | Identifies bottlenecks, SPOFs, scalability blockers |
| `security_architect` | Offensive Security Architect | gpt-4o-mini (temp 0.2) | STRIDE-based threat modeling, OWASP mapping |
| `chief_strategist` | Chief Systems Strategist | gpt-4o-mini (temp 0.5) | Synthesizes findings into a prioritized `ReviewReport` |

#### Output Models

| Model | Producer | Key Fields |
|---|---|---|
| `DocBlueprint` | librarian | `system_identity`, `component_registry`, `interaction_map`, `technical_constraints`, `omission` |
| `PerformanceReview` | performance_architect | `summary`, `bottlenecks`, `scalability_blockers`, `reliability_score` |
| `SecurityReview` | security_architect | `summary`, `vulnerabilities`, `trust_boundary_violations`, `missing_security_controls` |
| `ReviewReport` | chief_strategist | `scorecard`, `findings`, `deep_dive`, `data_available`, `generated_at` |

Input validation runs in `@before_kickoff`: documents shorter than 50 characters are rejected before the crew starts.

### Configuration (`Settings`)

Singleton `Settings` class backed by Dynaconf + `settings.toml` with environment variable overrides. Priority order: env var → Dynaconf/TOML → hardcoded default.

Key configuration groups:

| Group | Keys |
|---|---|
| App | `app_name`, `app_version`, `environment`, `debug` |
| Server | `host`, `port`, `reload` |
| CORS | `cors_origins`, `cors_credentials`, `cors_methods`, `cors_headers` |
| OpenAI | `openai_api_key`, `openai_model_name` |
| Azure OpenAI | `use_azure_openai`, `azure_endpoint`, `azure_api_key`, `azure_deployment_name`, `azure_api_version` |
| Reviewer | `reviewer_config_version`, `reviewer_max_file_size_mb` |

---

## Frontend Design

### Component Tree

```
App
└── ChatInterface
        ├── useChatInterface (state + logic)
        ├── MessageList
        │       └── MessageBubble (per message)
        └── InputArea
                ├── useInputArea
                └── FileUploader
                        └── useFileUploader
```

Each component follows the project convention: one `.tsx` file, one `.module.css`, one `use<Name>.ts` hook, and an `index.tsx` re-export.

### State Management (`useChatInterface`)

All chat state lives in this hook. No global state manager is used.

| State | Type | Description |
|---|---|---|
| `messages` | `Message[]` | Full conversation history |
| `isStreaming` | `boolean` | True while a review is in progress |
| `error` | `string \| null` | User-facing error message |

`handleSubmit` is the single entry point for user actions. It:
1. Generates a `correlationId` (UUID)
2. Appends the user message immediately
3. Routes to `submitReviewWithFile` or `submitReviewWithRetry` based on attachment presence
4. Pipes the stream through `parseNDJSONStream` → `transformEventToMessage` → `setMessages`
5. Applies an upsert strategy for `AGENT_THINKING` → `AGENT_RESULT` transitions (replaces the thinking bubble with the result in-place)

### API Service Layer (`frontend/src/services/api/`)

| Module | Responsibility |
|---|---|
| `client.ts` | `fetch` wrappers for JSON and multipart endpoints; timeout + abort signal management |
| `retry.ts` | Exponential backoff retry (3 attempts, 1s base, ×2 multiplier); skips retry on 4xx and AbortError |
| `stream.ts` | NDJSON stream reader; buffers partial lines across chunks |
| `transformer.ts` | Maps `ReviewResponse` events to typed `Message` objects by `message_type` / `status` |
| `types.ts` | Shared interfaces: `RetryConfig`, `RequestOptions`, event type constants |

### Message Types

| `MessageType` | Trigger | UI Representation |
|---|---|---|
| `USER` | User submits | Right-aligned user bubble |
| `AGENT_THINKING` | `AgentExecutionStartedEvent` | Inline thinking indicator with agent name |
| `AGENT_RESULT` | `TaskCompletedEvent` | Replaces thinking bubble; shows agent name + report |
| `SYSTEM_COMPLETE` | `CrewKickoffCompletedEvent` | Completion notice |
| `ERROR` | Stream/API error | Error bubble |

### File Upload (`FileUploader` / `useFileUploader`)

- Client-side validation: file type (extension check) and size (≤5MB) before any network call
- Two display modes: compact icon button (inline in `InputArea`) and full drop zone
- Drag-and-drop supported via native drag events
- Accepted types: `.txt`, `.md`, `.json`, `.pdf`, `.doc`, `.docx`

---

## Data Flow: End-to-End Review

```
1. User pastes text or uploads file → InputArea
2. useChatInterface.handleSubmit()
3. → submitReviewWithRetry() or submitReviewWithFile()
4. → POST /api/v1/review or /api/v1/review/upload
5. Backend: DocumentExtractor.extract() (if file)
6. Backend: ReviewerFacade.start_review()
7.   → Queue created, session registered
8.   → ReviewerService.run_crew_job() → daemon Thread
9.   → DesignReviewerCrew.crew().kickoff()
10.    → librarian: extract_blueprint_task → DocBlueprint
11.    → performance_architect + security_architect (concurrent)
12.    → chief_strategist: final_review_task → ReviewReport
13. ReviewerEventListener dispatches events → Queue
14. ReviewerFacade polls Queue → yields NDJSON chunks
15. Frontend: parseNDJSONStream → transformEventToMessage
16. useChatInterface: setMessages (upsert thinking → result)
17. Stream ends (status: "complete" or None poison pill)
```

---

## Key Design Decisions

**Thread + Queue bridge for streaming**
CrewAI's `crew.kickoff()` is synchronous and blocking. Running it in a daemon thread with a `Queue` as the event bus allows FastAPI's async event loop to remain unblocked while still streaming results incrementally.

**Correlation ID as session key**
Every review request carries a UUID `correlation_id` that threads through the entire stack — HTTP header, agent fingerprint metadata, event dispatcher, and frontend message grouping. This enables correct event routing in concurrent sessions.

**Versioned agent configuration**
Agent roles, goals, prompts, and LLM parameters live in YAML files under `config/review/v1/` and `config/review/v2/`. Switching versions requires only a config change (`reviewer_config_version`), with no code changes.

**AGENT_THINKING → AGENT_RESULT upsert**
Rather than appending a new message for each agent result, the frontend replaces the corresponding thinking bubble in-place. This keeps the message list clean and avoids visual clutter during multi-agent execution.

**Output format negotiation**
The `output_format` field (`markdown` | `plain` | `json`) is passed through the entire pipeline. Each agent's task prompt includes a FORMAT DIRECTIVE that controls how narrative fields (`summary`, `deep_dive`) are rendered, while structured fields (scores, findings lists) are always plain data.

**Dual LLM backend support**
The `LLMService` supports both standard OpenAI and Azure OpenAI endpoints, selected via the `use_azure_openai` config flag. This allows deployment in environments where only Azure-hosted models are available.

---

## Error Handling

| Layer | Error Type | Handling |
|---|---|---|
| File upload (backend) | `ExtractionError` | Mapped to HTTP 400/413/422 by endpoint |
| Input validation (backend) | `ValidationFailedException` | Crew `@before_kickoff` raises; caught in thread, sent as `status: "error"` event |
| Crew execution (backend) | Any exception in thread | Caught, wrapped in `ReviewResponse(status="error")`, put on Queue |
| Network (frontend) | `TypeError` (fetch) | Mapped to `ApiError` with user-friendly message |
| HTTP 4xx/5xx (frontend) | `ApiError` | Displayed in error banner; 4xx not retried |
| Stream parse error (frontend) | JSON parse failure | Logged, line skipped, stream continues |
| Timeout (frontend) | `AbortError` | Mapped to `ApiError`, not retried |

---

## Testing

### Backend
- Framework: `pytest` with async support (`pytest-asyncio`)
- Config: `backend/pytest.ini`
- Run: `pytest` from `backend/` with venv active

### Frontend
- Framework: Jest + React Testing Library
- Tests co-located in `__tests__/` folders
- Focus: transformer/utility logic and component behavior
- Run: `npm test -- --watchAll=false` from `frontend/`

---

## Deployment

### Development
```bash
./dev.sh full          # starts both services
./dev.sh backend       # FastAPI on :8000
./dev.sh frontend      # React dev server on :3000
docker-compose -f docker-compose.dev.yml up
```

### Production
- Backend: `uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4`
- Frontend: `npm run build` → serve `frontend/build/` as static files
- Container: `backend/Dockerfile` + Terraform config in `backend/deploy/container/` (Azure Container Instances)

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes (or Azure) | OpenAI API key |
| `OPENAI_MODEL_NAME` | No | Override default model |
| `USE_AZURE_OPENAI` | No | Enable Azure OpenAI backend |
| `AZURE_ENDPOINT` | If Azure | Azure OpenAI endpoint URL |
| `AZURE_API_KEY` | If Azure | Azure API key |
| `AZURE_DEPLOYMENT_NAME` | If Azure | Azure deployment name |
| `AZURE_API_VERSION` | If Azure | Azure API version |
| `REVIEWER_CONFIG_VERSION` | No | Agent config version (`v1`/`v2`, default `v2`) |
| `REACT_APP_API_BASE_URL` | No | Frontend API base URL (default `/api/v1`) |
