# System Design Mentor — Design Document

## Overview

System Design Mentor is an AI-powered architecture review platform. Users submit system design documents (as text or file uploads), and a multi-agent AI crew analyzes them for performance, security, and architectural quality. Results are streamed back to the client in real time. After a review completes, users can ask follow-up questions via a chat interface backed by a direct LLM call.

---

## Architecture

The system is a FastAPI backend that exposes a streaming NDJSON API. A separate React frontend (see [chat-ui](https://github.com/atieqrehman11/chat-ui)) consumes the API.

```
┌──────────────────────────────────────────────────────────────┐
│                     FastAPI Backend                          │
│                                                              │
│  review.py endpoint                                          │
│       │                                                      │
│       ├── DocumentExtractor  (file → plain text)             │
│       └── ReviewerFacade                                     │
│               │                                              │
│               ├── ReviewerService  (Thread)                  │
│               │       └── DesignReviewerCrew (CrewAI)        │
│               │               ├── librarian                  │
│               │               ├── performance_architect      │
│               │               ├── security_architect         │
│               │               └── chief_strategist           │
│               │                                              │
│               ├── ReviewerEventListener  (CrewAI events)     │
│               └── EventDispatcher  (session → Queue)         │
│                                                              │
│  chat.py endpoint                                            │
│       └── ChatService  (litellm acompletion, streaming)      │
│               └── LLMService  (Azure / OpenAI resolution)    │
└──────────────────────────────────────────────────────────────┘
```

---

## Backend Design

### API Layer (`app/api/v1/`)

| Endpoint | Method | Input | Description |
|---|---|---|---|
| `/api/v1/review` | POST | JSON body | Text-only review submission |
| `/api/v1/review/upload` | POST | multipart/form-data | File + optional inline text |
| `/api/v1/chat/{correlation_id}` | POST | JSON body | Follow-up chat on a completed review |
| `/api/v1/status` | GET | — | Health check |

Both review endpoints return a `StreamingResponse` with `application/x-ndjson` media type. A `correlation_id` is resolved from the `X-Correlation-ID` request header; if absent, a UUID is generated server-side.

### Correlation ID Flow

The client generates a UUID before submission and sends it as the `X-Correlation-ID` request header. The backend reads it via `_resolve_correlation_id()` and uses it as the session key throughout the pipeline — event dispatcher, SQLite storage, and follow-up chat lookup.

### Document Extraction (`DocumentExtractor`)

Handles file validation and text extraction before the review pipeline runs.

- Supported formats: `.txt`, `.md`, `.json`, `.pdf`, `.doc`, `.docx`
- Max file size: configurable via `reviewer_max_file_size_mb` (default 5 MB)
- PDF extraction via `pypdf`; DOCX via `python-docx`
- Raises typed `ExtractionError` with appropriate HTTP status codes (400, 413, 422); mapped to domain exceptions by the endpoint

### Streaming Pipeline (Review)

The streaming architecture bridges a synchronous CrewAI execution thread with an async FastAPI response. The infrastructure is split into reusable generic components and reviewer-specific wiring:

```
ReviewerFacade.start_review()
    │
    ├── Creates a thread-safe Queue
    ├── Registers session in EventDispatcher (correlation_id → Queue)
    ├── ReviewerService.run_crew_job()
    │       └── run_crew_in_thread()  [app/common/crew_runner.py]
    │               ├── Spawns daemon Thread
    │               ├── crew.kickoff(inputs)
    │               ├── on_complete(result)  → persist + dispatch "complete"
    │               ├── on_error(exc)        → dispatch error event
    │               └── sync_queue.put(None)                 → poison pill
    └── stream_queue(sync_queue)  [app/common/streaming.py]
            ├── run_in_executor() to avoid blocking the event loop
            ├── Serializes Pydantic models / dicts to JSON
            ├── Yields "payload\n\n" chunks
            └── Terminates on status "complete" | "error" | None (poison pill)
```

`app/common/streaming.py` and `app/common/crew_runner.py` are feature-agnostic — any future crew-based feature reuses them directly.

The `EventDispatcher` is a singleton that maps `correlation_id` → `Queue`. The `ReviewerEventListener` subscribes to CrewAI's event bus and dispatches typed `ReviewResponse` objects into the correct queue. A class-level `_listeners_setup` guard prevents handler stacking on repeated `setup_listeners` calls.

### Dependency Injection & Startup Wiring

All shared singletons are built once at startup in `main.py` and stored on `app.state`. FastAPI endpoints resolve them via `Depends()` — no module-level globals, no service locator.

**Startup order** (matters — each step depends on the previous):

```python
# 1. Core infrastructure
_event_dispatcher = EventDispatcher()          # process-wide singleton

# 2. Services (depend on dispatcher)
app.state.reviewer_service = ReviewerService(_event_dispatcher)

# 3. Document extractor (no dependencies)
_document_extractor = DocumentExtractor()

# 4. Facade (depends on service, dispatcher, and extractor)
app.state.reviewer_facade = ReviewerFacade(app.state.reviewer_service, _event_dispatcher, _document_extractor)

# 5. CrewAI event listener (must wire AFTER dispatcher exists)
ReviewerEventListener(event_dispatcher=_event_dispatcher)
```

**Endpoint resolution** (`review.py`):

```python
def _get_reviewer_facade(request: Request) -> ReviewerFacade:
    return request.app.state.reviewer_facade

ReviewerFacadeDep = Annotated[ReviewerFacade, Depends(_get_reviewer_facade)]
```

Endpoints declare the dependency type; FastAPI injects the singleton from `app.state` on each request. This keeps endpoints testable — tests can swap `app.state.reviewer_facade` for a mock without patching imports.

**Singleton strategy**

| Class | Mechanism | Reason |
|---|---|---|
| `EventDispatcher` | `__new__` + `_initialized` guard | Process-wide queue registry — must be one instance |
| `ReviewerEventListener` | `__new__` + class-level `_listeners_setup` | Prevents CrewAI event handler stacking on re-instantiation |
| `Settings` | `__new__` + `_initialized` guard | Config loaded once at import time |
| `ReviewerService`, `ReviewerFacade` | Constructed once in `main.py`, stored on `app.state` | Shared across requests; not true singletons — could be scoped if needed |



Handles follow-up questions after a review completes. Loads the stored design doc and final report from SQLite, then calls the LLM directly (no crew) via `litellm.acompletion`.

- System prompt scopes the assistant strictly to system design and the current review context
- Conversation history is trimmed to the last 10 turns to avoid token overflow
- Model, temperature, and max tokens are read from `settings.toml` `[chat]` block
- Azure vs OpenAI resolution is delegated to `LLMService.get_litellm_params()` — single source of truth

### LLM Service (`LLMService`)

Centralises provider selection for both the CrewAI agents and the chat service.

| Method | Used by | Purpose |
|---|---|---|
| `create_llm()` | `DesignReviewerCrew` | Returns a `crewai.LLM` instance |
| `get_litellm_params()` | `ChatService` | Returns flat kwargs for `litellm.acompletion` |

When `USE_AZURE_OPENAI=true`, both methods route to Azure; otherwise standard OpenAI is used.

### CrewAI Multi-Agent Crew (`DesignReviewerCrew`)

The crew runs sequentially with four specialized agents. Configuration is loaded from `config/review/v1/agents.yaml` and `config/review/v1/tasks.yaml`.

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

#### Input Validation (`@before_kickoff`)

Before the crew starts, `validate_input_content` checks:
- Document is non-empty
- Contains at least one architecture/design keyword (from `DESIGN_KEYWORDS` frozenset in `constants.py`)
- Length is between 50 and 50,000 characters

Violations raise `ValidationFailedException`, which is caught in the thread and sent as a `status: "error"` event with a user-facing `feedback` message.

#### Output Models

| Model | Producer | Key Fields |
|---|---|---|
| `DocBlueprint` | librarian | `system_identity`, `component_registry`, `interaction_map`, `technical_constraints`, `omission_report` |
| `PerformanceReview` | performance_architect | `summary`, `bottlenecks`, `scalability_blockers`, `reliability_score` |
| `SecurityReview` | security_architect | `summary`, `vulnerabilities`, `trust_boundary_violations`, `missing_security_controls` |
| `ReviewReport` | chief_strategist | `scorecard`, `findings`, `deep_dive`, `data_available`, `generated_at` |

### Configuration (`Settings`)

Singleton `Settings` class backed by Dynaconf + `settings.toml` with environment variable overrides. Priority order: env var → Dynaconf/TOML → hardcoded default.

Key configuration groups:

| Group | `settings.toml` section | Notable keys |
|---|---|---|
| App | `[app]` | `name`, `version`, `environment` |
| Logging | `[logging]` | `log_level` (also controls FastAPI debug mode) |
| Server | `[server]` | `host`, `port`, `reload` |
| CORS | `[cors]` | `origins`, `credentials`, `methods`, `headers` |
| Reviewer | `[reviewer]` | `max_file_size_mb` |
| Chat LLM | `[chat]` | `model`, `temperature`, `max_tokens` |
| Azure LLM | `[azure_llm]` | `temperature`, `top_p`, `max_completion_tokens` |
| OpenAI / Azure | env vars | `OPENAI_API_KEY`, `USE_AZURE_OPENAI`, `AZURE_*` |

---

## Frontend

The frontend is maintained in a separate repository: https://github.com/atieqrehman11/chat-ui

It is a React 18 + TypeScript SPA that consumes the streaming NDJSON API. See the frontend repo for component architecture, hook design, and configuration options.

---

## Data Flow: End-to-End Review

```
1.  Client sends POST /api/v1/review (or /upload) with X-Correlation-ID header
2.  Backend: _resolve_correlation_id() reads header
3.  Backend: DocumentExtractor.extract() (if file upload)
4.  Backend: ReviewerFacade.start_review()
5.    → Queue created, session registered in EventDispatcher
6.    → ReviewerService.run_crew_job() → daemon Thread
7.    → DesignReviewerCrew.crew().kickoff()
8.      → librarian: extract_blueprint_task → DocBlueprint
9.      → performance_architect + security_architect (concurrent)
10.     → chief_strategist: final_review_task → ReviewReport
11. ReviewerEventListener dispatches events → Queue
12. ReviewerFacade polls Queue → yields NDJSON chunks to client
13. Stream ends with status: "complete"
```

## Data Flow: Follow-up Chat

```
1.  Client sends POST /api/v1/chat/{correlation_id}
2.  Backend: ReviewStore loads design_doc + final_report from SQLite
3.  Backend: ChatService.stream_reply() → litellm.acompletion (streaming)
4.  NDJSON chunks streamed back to client
```

---

## Key Design Decisions

**Dependency injection via `app.state` + `Depends()`**
Singletons are built once at startup and stored on `app.state`. Endpoints resolve them via FastAPI's `Depends()` — no module-level globals. This makes endpoints independently testable: swap `app.state.reviewer_facade` for a mock in tests without patching imports.

**Generic streaming infrastructure**
`app/common/streaming.py` provides `stream_queue()` — a feature-agnostic async generator that polls a thread-safe Queue and yields NDJSON chunks. `app/common/crew_runner.py` provides `run_crew_in_thread()` — handles thread spawning, error dispatch, and poison pill for any CrewAI crew. `ReviewerFacade` and `ReviewerService` are thin wrappers that inject reviewer-specific callbacks (persistence, completion message). Adding a second crew-based feature requires only a new crew class, a thin service, and an endpoint — zero duplication of streaming infrastructure.

**Thread + Queue bridge for streaming**
CrewAI's `crew.kickoff()` is synchronous and blocking. Running it in a daemon thread with a `Queue` as the event bus allows FastAPI's async event loop to remain unblocked while still streaming results incrementally.

**Client-generated correlation ID via header**
The client generates the `correlation_id` UUID and sends it as `X-Correlation-ID`. The backend reads it (with UUID fallback). This eliminates any client/server ID mismatch and allows the same ID to be used for follow-up chat routing.

**Single agent config version**
Agent YAML config is versioned under `config/review/v1/`. Bumping to `v2` requires only a new directory and a path change in the crew class.

**Output format negotiation**
The `output_format` field (`markdown` | `plain` | `json`) is passed through the entire pipeline. Each agent's task prompt includes a FORMAT DIRECTIVE controlling how narrative fields are rendered, while structured fields (scores, findings lists) are always plain data.

**Dual LLM backend support**
`LLMService` supports both standard OpenAI and Azure OpenAI, selected via `USE_AZURE_OPENAI`. `get_litellm_params()` is the single resolution point used by `ChatService`; `create_llm()` is used by the CrewAI agents.

---

## Error Handling

| Layer | Error Type | Handling |
|---|---|---|
| File upload | `ExtractionError` | Mapped to `DocumentExtractionException` → HTTP 400/413/422 |
| Missing input | No file + no text | `MissingInputException` → HTTP 400 |
| Input validation | `ValidationFailedException` | Raised in `@before_kickoff`; caught in thread, sent as `status: "error"` event |
| Crew execution | Any exception in thread | Caught, wrapped in `ReviewResponse(status="error")`, put on Queue |
| Chat session not found | `ReviewNotFoundException` | Raised by `ReviewStore`; mapped to HTTP 404 by central exception handler |

---

## Testing

- Framework: `pytest` with async support (`pytest-asyncio`)
- Config: `pytest.ini`
- Run: `pytest` from the project root with venv active

---

## Deployment

### Development

```bash
./manage.sh           # starts API on :8000
```

### Production

- `uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4`
- Container: `Dockerfile` + Terraform config in `deploy/container/` (Azure Container Instances)

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes (or Azure) | OpenAI API key |
| `OPENAI_MODEL_NAME` | No | Override default model for CrewAI agents |
| `USE_AZURE_OPENAI` | No | Enable Azure OpenAI backend (`true`/`false`) |
| `AZURE_ENDPOINT` | If Azure | Azure OpenAI endpoint URL |
| `AZURE_API_KEY` | If Azure | Azure API key |
| `AZURE_DEPLOYMENT_NAME` | If Azure | Azure deployment name |
| `AZURE_API_VERSION` | If Azure | Azure API version |
