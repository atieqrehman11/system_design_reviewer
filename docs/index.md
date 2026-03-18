# System Design Mentor

An AI-powered architecture review platform. Submit a system design document and a multi-agent crew analyzes it for performance, security, and architectural quality — streaming results back in real time. Once the review completes, ask follow-up questions in a chat interface.

---

## How It Works

1. **Submit** a design document (paste text or upload a file)
2. **Watch** four specialized AI agents analyze it concurrently and stream their findings
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

## Technology Stack

- **Backend**: FastAPI, CrewAI, LiteLLM, Python 3.10+
- **Frontend**: React 18, TypeScript, CSS Modules
- **AI**: OpenAI GPT-4o / Azure OpenAI (configurable)
- **Infrastructure**: Docker, Docker Compose, Terraform (Azure Container Instances)

---

## Quick Links

- [Getting Started](getting-started.md) — set up and run locally
- [API Reference](api-reference.md) — endpoints, stream events, code examples
- [Configuration Guide](configuration.md) — all config options including Azure OpenAI
- [Design Document](design.md) — architecture, data flow, and key design decisions
