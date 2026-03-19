# Chat UI — Frontend

A generic, backend-agnostic streaming chat UI built with React and TypeScript.
Ships with a `review-backend` integration for the System Design Mentor API, but the core library is fully decoupled and can be wired to any NDJSON streaming backend.

---

## What It Does

- Streams NDJSON events from a backend and renders them as a live conversation
- Supports a two-phase flow: submit → stream → follow-up chat
- File upload with client-side validation
- Pluggable event transformer and report renderer — no domain logic in the core

---

## Docs

- [Getting Started](getting-started.md) — run locally, environment variables, dev commands
- [Architecture](architecture.md) — component tree, hooks, services, data flow
- [Configuration](configuration.md) — `ChatUIConfig` reference, constants, env vars
- [Integration Guide](integration-guide.md) — how to wire a new backend

---

## Project Structure

```
frontend/
  src/
    core/                        # Generic, reusable chat-ui library
      components/                # ChatInterface, MessageList, MessageBubble, InputArea, ...
      config/                    # ChatUIConfig interface + factory
      services/                  # HTTP client, NDJSON stream reader, retry, chat client
      types/                     # Core types: Message, MessageType, StreamEventTransformer, ...
      utils/                     # id, signal, clipboard
      index.ts                   # Public API barrel export
    integrations/
      review-backend/            # System Design Mentor backend integration
        transformer.ts           # ReviewResponse → Message
        renderReviewReport.tsx   # ReviewReport renderer
        ReportContent.tsx        # Structured report UI
        constants.ts             # reviewChatUIConfig
        types.ts                 # ReviewReport, ReviewFinding, ...
    config/
      constants.ts               # App-level defaults (API URLs, UI text, file config)
    App.tsx                      # Wires core + integration together
```

Only `App.tsx` is allowed to import from both `src/core/` and `src/integrations/`.
Everything in `src/core/` must remain free of domain-specific imports.
