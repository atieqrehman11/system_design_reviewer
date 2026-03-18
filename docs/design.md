# System Design Mentor — Design Document

## Overview

System Design Mentor is a full-stack AI-powered architecture review platform. Users submit system design documents (as text or file uploads), and a multi-agent AI crew analyzes them for performance, security, and architectural quality. Results are streamed back to the UI in real time. After a review completes, users can ask follow-up questions in a chat interface backed by a direct LLM call.

---

## Architecture

The system follows a clean client-server architecture with a React SPA frontend and a FastAPI backend. Communication is one-directional streaming: the client submits a document and receives a live NDJSON stream of agent events until the review completes. Follow-up chat uses a separate streaming endpoint.

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (React SPA)                  │
│                                                             │
│  ChatInterface                                              │
│    └── useChatInterface (thin composing hook)               │
│          ├── useReviewStream   (review submission + stream) │
│          └── useChatStream     (follow-up chat stream)      │
│                                                             │
│  API Service Layer                                          │
│    ├── client.ts      (fetch, timeout, X-Correlation-ID)    │
│    ├── retry.ts       (exponential backoff)                 │
│    ├── stream.ts      (NDJSON reader)                       │
│    ├── chatStreamUtils.ts  (pure chat chunk processing)     │
│    └── transformer.ts (event → Message)                     │
└──────────────────────────┬──────────────────────────────────┘
                           │  POST /api/v1/review  (JSON)
                           │  POST /api/v1/review/upload  (multipart)
                           │  POST /api/v1/chat/{correlation_id}
                           │  ← NDJSON stream responses
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
│                                                             │
│  chat.py endpoint                                           │
│       └── ChatService  (litellm acompletion, streaming)     │
│               └── LLMService  (Azure / OpenAI resolution)   │
└─────────────────────────────────────────────────────────────┘
```

---

## Backend Design

### API Layer (`backend/app/api/v1/`)

| Endpoint | Method | Input | Description |
|---|---|---|---|
| `/api/v1/review` | POST | JSON body | Text-only review submission |
| `/api/v1/review/upload` | POST | multipart/form-data | File + optional inline text |
| `/api/v1/chat/{correlation_id}` | POST | JSON body | Follow-up chat on a completed review |
| `/api/v1/status` | GET | — | Health check |

Both review endpoints return a `StreamingResponse` with `application/x-ndjson` media type. A `correlation_id` is resolved from the `X-Correlation-ID` request header; if absent, a UUID is generated server-side.

### Correlation ID Flow

The client generates a UUID before submission and sends it as the `X-Correlation-ID` request header. The backend reads it via `_resolve_correlation_id()` and uses it as the session key throughout the pipeline — event dispatcher, SQLite storage, and follow-up chat lookup. This eliminates any client/server ID mismatch.

### Document Extraction (`DocumentExtractor`)

Handles file validation and text extraction before the review pipeline runs.

- Supported formats: `.txt`, `.md`, `.json`, `.pdf`, `.doc`, `.docx`
- Max file size: configurable via `reviewer_max_file_size_mb` (default 5 MB)
- PDF extraction via `pypdf`; DOCX via `python-docx`
- Raises typed `ExtractionError` with appropriate HTTP status codes (400, 413, 422); mapped to domain exceptions by the endpoint

### Streaming Pipeline (Review)

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

The `EventDispatcher` is a singleton that maps `correlation_id` → `Queue`. The `ReviewerEventListener` subscribes to CrewAI's event bus and dispatches typed `ReviewResponse` objects into the correct queue. A singleton guard (`if hasattr(self, '_initialized')`) prevents handler stacking on repeated instantiation.

### Chat Service (`ChatService`)

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

The crew runs sequentially with four specialized agents. Configuration is loaded from `config/review/v1/agents.yaml` and `config/review/v1/tasks.yaml` (paths hardcoded in the crew class).

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
| App | `[app]` | `name`, `version`, `environment`, `debug` |
| Server | `[server]` | `host`, `port`, `reload` |
| CORS | `[cors]` | `origins`, `credentials`, `methods`, `headers` |
| Reviewer | `[reviewer]` | `max_file_size_mb` |
| Chat LLM | `[chat]` | `model`, `temperature`, `max_tokens` |
| Azure LLM | `[azure_llm]` | `temperature`, `top_p`, `max_completion_tokens` |
| OpenAI / Azure | env vars | `OPENAI_API_KEY`, `USE_AZURE_OPENAI`, `AZURE_*` |

---

## Frontend Design

### Component Tree

```
App
└── ChatInterface
      ├── useChatInterface        (thin composing hook — shared state)
      │     ├── useReviewStream   (review submission + NDJSON processing)
      │     └── useChatStream     (follow-up chat streaming)
      ├── MessageList
      │     └── MessageBubble     (per message; ReactMarkdown for all text content)
      └── InputArea
            ├── useInputArea
            └── FileUploader
                  └── useFileUploader
```

Each component follows the project convention: one `.tsx` file, one `.module.css`, one `use<Name>.ts` hook, and an `index.tsx` re-export.

### Hook Responsibilities

| Hook | Responsibility |
|---|---|
| `useChatInterface` | Owns all shared state (`messages`, `isStreaming`, `isFollowUpMode`, `error`); routes submit to the correct sub-hook |
| `useReviewStream` | Submits the review, processes the NDJSON stream, applies thinking→result upsert |
| `useChatStream` | Submits follow-up chat, drains the chunk stream, updates conversation history ref |
| `chatStreamUtils.ts` | Pure NDJSON chunk processing — no React deps, fully unit-testable |

### State Management (`useChatInterface`)

All chat state lives in this hook. No global state manager is used.

| State | Type | Description |
|---|---|---|
| `messages` | `Message[]` | Full conversation history |
| `isStreaming` | `boolean` | True while any stream is in progress |
| `isFollowUpMode` | `boolean` | True after a review completes; switches input to chat mode |
| `error` | `string \| null` | User-facing error message |
| `activeCorrelationIdRef` | `Ref<string \| null>` | Set to `correlationId` once review completes; used for chat routing |
| `chatHistoryRef` | `Ref<ChatMessage[]>` | Conversation turns forwarded to the LLM |

`handleSubmit` is the single entry point for user actions. It generates a `correlationId`, appends the user message, then routes to `startReview` or `startChat` based on `activeCorrelationIdRef`.

### Correlation ID (Frontend)

The client generates a UUID via `generateCorrelationId()` before each review submission and sends it as the `X-Correlation-ID` header. The same ID is used to tag all messages in the conversation, enabling `groupMessagesByCorrelation` in `MessageList` to keep them visually grouped. No patching or header-reading is needed after the response arrives.

### API Service Layer (`frontend/src/services/api/`)

| Module | Responsibility |
|---|---|
| `client.ts` | `fetch` wrappers; injects `X-Correlation-ID` header; timeout + abort signal management |
| `retry.ts` | Exponential backoff retry (3 attempts, 1 s base, ×2 multiplier); skips retry on 4xx and AbortError |
| `stream.ts` | NDJSON stream reader; buffers partial lines across chunks |
| `chatStreamUtils.ts` | Pure chat chunk processing; `processSingleLine`, `processLines`, `drainChatStream` |
| `transformer.ts` | Maps `ReviewResponse` events to typed `Message` objects by `message_type` / `status` |
| `types.ts` | Shared interfaces: `RetryConfig`, `RequestOptions` (incl. `correlationId`), `ReviewStreamResult`, event constants |

### Message Types

| `MessageType` | Trigger | UI Representation |
|---|---|---|
| `USER` | User submits | Right-aligned user bubble |
| `AGENT_THINKING` | `AgentExecutionStartedEvent` | Inline thinking indicator with agent name; rendered via ReactMarkdown |
| `AGENT_RESULT` | `TaskCompletedEvent` | Replaces thinking bubble in-place; ReactMarkdown for text, `ReportContent` for structured reports |
| `SYSTEM_COMPLETE` | `CrewKickoffCompletedEvent` | Completion notice |
| `ERROR` | Stream/API error | Error bubble |

All non-report text content (including follow-up chat replies) is rendered through `ReactMarkdown`, ensuring markdown formatting is preserved.

### File Upload (`FileUploader` / `useFileUploader`)

- Client-side validation: file type (extension check) and size (≤ 5 MB) before any network call
- Drag-and-drop supported via native drag events
- Accepted types: `.txt`, `.md`, `.json`, `.pdf`, `.doc`, `.docx`
- Hidden in follow-up chat mode (`showFileUpload={!isFollowUpMode}`)

---

## Data Flow: End-to-End Review

```
1.  User pastes text or uploads file → InputArea
2.  useChatInterface.handleSubmit()
3.  → generateCorrelationId() → UUID stored in activeCorrelationIdRef (pending)
4.  → User message appended to messages[] with correlationId
5.  → useReviewStream.startReview()
6.  → submitReviewWithRetry() or submitReviewWithFile()
        sends X-Correlation-ID header
7.  → POST /api/v1/review or /api/v1/review/upload
8.  Backend: _resolve_correlation_id() reads X-Correlation-ID header
9.  Backend: DocumentExtractor.extract() (if file)
10. Backend: ReviewerFacade.start_review()
11.   → Queue created, session registered in EventDispatcher
12.   → ReviewerService.run_crew_job() → daemon Thread
13.   → DesignReviewerCrew.crew().kickoff()
14.     → librarian: extract_blueprint_task → DocBlueprint
15.     → performance_architect + security_architect (concurrent)
16.     → chief_strategist: final_review_task → ReviewReport
17. ReviewerEventListener dispatches events → Queue
18. ReviewerFacade polls Queue → yields NDJSON chunks
19. Frontend: parseNDJSONStream → transformEventToMessage
20. useReviewStream: setMessages (upsert thinking → result)
21. Stream ends (status: "complete") → activeCorrelationIdRef set, isFollowUpMode = true
```

## Data Flow: Follow-up Chat

```
1.  User types question → InputArea (chat mode)
2.  useChatInterface.handleSubmit()
3.  → activeCorrelationIdRef.current is set → routes to useChatStream.startChat()
4.  → chatHistoryRef updated with user turn
5.  → submitChat(correlationId, history)
6.  → POST /api/v1/chat/{correlation_id}
7.  Backend: ReviewStore loads design_doc + final_report from SQLite
8.  Backend: ChatService.stream_reply() → litellm.acompletion (streaming)
9.  Frontend: drainChatStream → onChunk updates assistant message bubble
10. Stream ends → chatHistoryRef updated with assistant reply
```

---

## Key Design Decisions

**Thread + Queue bridge for streaming**
CrewAI's `crew.kickoff()` is synchronous and blocking. Running it in a daemon thread with a `Queue` as the event bus allows FastAPI's async event loop to remain unblocked while still streaming results incrementally.

**Client-generated correlation ID via header**
The client generates the `correlation_id` UUID and sends it as `X-Correlation-ID`. The backend reads it (with UUID fallback). This eliminates the previous `X-Task-ID` response header and the client-side patching logic that was needed to reconcile mismatched IDs.

**Hook decomposition: one concern per hook**
`useChatInterface` is a thin composing hook. `useReviewStream` owns review streaming; `useChatStream` owns chat streaming; `chatStreamUtils.ts` contains pure stream utilities with no React dependencies. This keeps each unit testable in isolation and avoids nesting beyond 4 levels (SonarQube rule).

**AGENT_THINKING → AGENT_RESULT upsert**
Rather than appending a new message for each agent result, the frontend replaces the corresponding thinking bubble in-place. This keeps the message list clean and avoids visual clutter during multi-agent execution.

**ReactMarkdown for all text content**
Both agent thinking/result messages and follow-up chat replies are rendered through `ReactMarkdown`. This ensures bold, lists, headings, and code blocks display correctly regardless of which path produced the content.

**Single agent config version**
Agent YAML config is versioned under `config/review/v1/`. The `reviewer_config_version` setting and v2 config have been removed; the crew class hardcodes the v1 paths. Switching agent behaviour requires editing the YAML files directly.

**Output format negotiation**
The `output_format` field (`markdown` | `plain` | `json`) is passed through the entire pipeline. Each agent's task prompt includes a FORMAT DIRECTIVE controlling how narrative fields (`summary`, `deep_dive`) are rendered, while structured fields (scores, findings lists) are always plain data.

**Dual LLM backend support**
`LLMService` supports both standard OpenAI and Azure OpenAI, selected via `USE_AZURE_OPENAI`. `get_litellm_params()` is the single resolution point used by `ChatService`; `create_llm()` is used by the CrewAI agents. Both methods apply the same provider logic.

---

## Error Handling

| Layer | Error Type | Handling |
|---|---|---|
| File upload (backend) | `ExtractionError` | Mapped to `DocumentExtractionException` → HTTP 400/413/422 |
| Missing input (backend) | No file + no text | `MissingInputException` → HTTP 400 |
| Input validation (backend) | `ValidationFailedException` | Raised in `@before_kickoff`; caught in thread, sent as `status: "error"` event with `feedback` |
| Crew execution (backend) | Any exception in thread | Caught, wrapped in `ReviewResponse(status="error")`, put on Queue |
| Chat session not found | `ReviewNotFoundException` | Raised by `ReviewStore`; mapped to HTTP 404 by central exception handler |
| Network (frontend) | `TypeError` (fetch) | Mapped to `ApiError` with user-friendly message |
| HTTP 4xx/5xx (frontend) | `ApiError` | Displayed in error banner; 4xx not retried |
| Stream parse error (frontend) | JSON parse failure | Logged, line skipped, stream continues |
| Timeout (frontend) | `AbortError` | Mapped to `ApiError`, not retried |
| Chat stream error (frontend) | `status: "error"` chunk | Displayed inline in the assistant message bubble only |

---

## Testing

### Backend
- Framework: `pytest` with async support (`pytest-asyncio`)
- Config: `backend/pytest.ini`
- Run: `pytest` from `backend/` with venv active

### Frontend
- Framework: Jest + React Testing Library
- Tests co-located in `__tests__/` folders
- Focus: transformer/utility logic (`chatStreamUtils`, `transformer`) and component behaviour
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
| `OPENAI_MODEL_NAME` | No | Override default model for CrewAI agents |
| `USE_AZURE_OPENAI` | No | Enable Azure OpenAI backend (`true`/`false`) |
| `AZURE_ENDPOINT` | If Azure | Azure OpenAI endpoint URL |
| `AZURE_API_KEY` | If Azure | Azure API key |
| `AZURE_DEPLOYMENT_NAME` | If Azure | Azure deployment name |
| `AZURE_API_VERSION` | If Azure | Azure API version |
| `REACT_APP_API_BASE_URL` | No | Frontend API base URL (default `/api/v1`) |
