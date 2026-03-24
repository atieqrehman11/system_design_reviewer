# System Design Mentor

An AI-powered architecture review platform. Submit a system design document and a multi-agent crew analyzes it for performance, security, and architectural quality — streaming results back in real time. Once the review completes, ask follow-up questions in a chat interface.

---

## How It Works

1. **Submit** a design document — paste text or upload a file (`.txt`, `.md`, `.pdf`, `.doc`, `.docx`, `.json`)
2. **Watch** four specialized AI agents stream their analysis in real time
3. **Review** the structured report covering security, performance, scalability, and reliability
4. **Ask** follow-up questions about the review in the chat interface

### The Agent Crew

| Agent | Focus |
|---|---|
| Architectural Librarian | Extracts a structured blueprint from the raw document |
| SRE Performance Architect | Identifies bottlenecks, SPOFs, and scalability blockers |
| Offensive Security Architect | STRIDE threat modeling, OWASP mapping, trust boundary analysis |
| Chief Systems Strategist | Synthesizes findings into a prioritized executive roadmap |

Agents run sequentially — the librarian extracts a `DocBlueprint` first, then the performance and security architects run concurrently, and the chief strategist synthesizes everything into a final `ReviewReport`.

---

## Architecture Overview

```
Client (React)
    │  POST /api/v1/review  (NDJSON stream)
    ▼
FastAPI endpoint
    ├── DocumentExtractor   (file → plain text)
    └── ReviewerFacade
            ├── EventDispatcher  (correlation_id → Queue)
            ├── ReviewerService  → run_crew_in_thread()
            │       └── DesignReviewerCrew (CrewAI)
            │               ├── librarian
            │               ├── performance_architect  ─┐ concurrent
            │               ├── security_architect     ─┘
            │               └── chief_strategist
            └── ReviewerEventListener  (CrewAI events → Queue)
                    stream_queue() → NDJSON chunks → client
```

CrewAI's synchronous `kickoff()` runs in a daemon thread. A thread-safe `Queue` bridges it to FastAPI's async event loop — keeping the server non-blocking while streaming results incrementally. The `ReviewerEventListener` subscribes to CrewAI's event bus and dispatches typed `ReviewResponse` events (thinking, result, complete) into the correct session queue.

After a review completes, follow-up questions are handled by `ChatService` — a direct LiteLLM call (no crew) scoped to the stored design doc and report.

See [Design Document](docs/design.md) for the full architecture and data flow.

---

## Tech Stack

- **Backend**: FastAPI, CrewAI, LiteLLM, Python 3.10+
- **Frontend**: React 18, TypeScript — see https://github.com/atieqrehman11/chat-ui
- **AI**: OpenAI GPT-4o / Azure OpenAI (configurable)
- **Infrastructure**: Docker, Docker Compose, Terraform (Azure Container Instances)

---

## Quick Start

```bash
git clone <repository-url>
cd system-design-mentor
chmod +x manage.sh
./manage.sh
```

Backend starts on http://localhost:8000. Swagger UI at http://localhost:8000/docs.

Requires an OpenAI API key in a `.env` file at the project root:

```bash
OPENAI_API_KEY=sk-your-api-key-here
```

For Azure OpenAI, see the [Configuration Guide](docs/configuration.md).

---

## Project Structure

```
.
├── app/
│   ├── api/v1/endpoints/   # review.py, chat.py, status.py
│   ├── common/             # logger, constants, exception handlers,
│   │                       # streaming.py, crew_runner.py (reusable infra)
│   ├── config/             # Settings, config_keys, review YAML (v1)
│   ├── models/             # Pydantic schemas
│   ├── services/
│   │   ├── reviewer/       # ReviewerFacade, Crew, EventListener, Service
│   │   ├── chat_service.py
│   │   ├── llm.py
│   │   └── review_store.py
│   └── settings.toml
├── deploy/container/       # Terraform (Azure Container Instances)
├── docs/                   # Documentation
├── main.py
├── requirements.txt
├── Dockerfile
├── docker-compose.dev.yml
└── manage.sh
```

Frontend lives in its own repo: https://github.com/atieqrehman11/chat-ui

---

## Documentation

| Document | Description |
|---|---|
| [Getting Started](docs/getting-started.md) | Setup, installation, and running the backend |
| [API Reference](docs/api-reference.md) | Endpoints, stream events, request/response shapes, code examples |
| [Configuration Guide](docs/configuration.md) | All config options — `settings.toml`, env vars, Azure OpenAI |
| [Design Document](docs/design.md) | Architecture, streaming pipeline, DI wiring, data flow, key decisions |

Docs can also be served locally with MkDocs:

```bash
./manage.sh docs        # serve on http://localhost:8001
./manage.sh docs:build  # build static site
```

---

## Development Commands

```bash
./manage.sh             # start API on :8000
./manage.sh test        # run tests
./manage.sh docs        # serve docs on :8001
./manage.sh docs:build  # build static docs site
```

---

## Testing

```bash
source venv/bin/activate
pytest
```
