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

---

## Tech Stack

- **Backend**: FastAPI, CrewAI, LiteLLM, Python 3.10+
- **Frontend**: React 18, TypeScript, CSS Modules
- **AI**: OpenAI GPT-4o / Azure OpenAI (configurable)
- **Infrastructure**: Docker, Docker Compose, Terraform (Azure Container Instances)

---

## Quick Start

```bash
git clone <repository-url>
cd system-design-mentor
chmod +x dev.sh
./dev.sh full
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Swagger UI: http://localhost:8000/docs

Requires an OpenAI API key in a `.env` file at the project root:

```bash
OPENAI_API_KEY=sk-your-api-key-here
```

For Azure OpenAI, see the [Configuration Guide](docs/configuration.md).

---

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # review.py, chat.py, status.py
│   │   ├── common/             # logger, constants, exception handlers
│   │   ├── config/             # Settings, config_keys, review YAML (v1)
│   │   ├── models/             # Pydantic schemas
│   │   ├── services/
│   │   │   ├── reviewer/       # ReviewerFacade, Crew, EventListener
│   │   │   ├── chat_service.py
│   │   │   ├── llm.py
│   │   │   └── review_store.py
│   │   └── settings.toml
│   ├── main.py
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── ChatInterface/  # useChatInterface, useReviewStream, useChatStream
│       │   ├── MessageBubble/
│       │   ├── MessageList/
│       │   └── InputArea/
│       └── services/api/       # client, retry, stream, transformer
├── docs/                       # Full documentation
├── docker-compose.dev.yml
└── dev.sh
```

---

## Documentation

| Document | Description |
|---|---|
| [Getting Started](docs/getting-started.md) | Setup, installation, and first review |
| [API Reference](docs/api-reference.md) | Endpoints, stream events, code examples |
| [Configuration Guide](docs/configuration.md) | All config options including Azure OpenAI |
| [Design Document](docs/design.md) | Architecture, data flow, and key design decisions |

---

## Testing

```bash
# Backend
cd backend && source venv/bin/activate
pytest

# Frontend
cd frontend
npm test -- --watchAll=false
```
