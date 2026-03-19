# Architecture

## Overview

The frontend is split into two layers:

- `src/core/` — generic, reusable chat-ui library with no domain knowledge
- `src/integrations/review-backend/` — System Design Mentor-specific wiring

`App.tsx` is the only file that imports from both layers.

---

## Component Tree

```
App
└── ChatInterface
      ├── useChatInterface        (thin composing hook — owns all shared state)
      │     ├── useSubmitStream   (submit + NDJSON stream processing)
      │     └── useChatStream     (follow-up chat streaming)
      ├── MessageList
      │     └── MessageBubble     (ReactMarkdown for text; pluggable renderReport for structured data)
      └── InputArea
            ├── useInputArea
            └── FileUploader
                  └── useFileUploader
```

Each component follows the convention: one `.tsx`, one `.module.css`, one `use<Name>.ts` hook, one `index.tsx` re-export.

---

## Hook Responsibilities

| Hook | Owns | Delegates to |
|---|---|---|
| `useChatInterface` | `messages`, `isStreaming`, `isFollowUpMode`, `error` | `useSubmitStream`, `useChatStream` |
| `useSubmitStream` | Submit HTTP call, NDJSON stream processing, thinking→result upsert | `submitReviewWithRetry`, `submitReviewWithFile`, `parseNDJSONStream` |
| `useChatStream` | Follow-up chat HTTP call, chunk accumulation | `submitChat`, `drainChatStream` |

`chatStreamUtils.ts` contains pure functions (no React deps) for stream processing — fully unit-testable in isolation.

---

## State (`useChatInterface`)

| State | Type | Description |
|---|---|---|
| `messages` | `Message[]` | Full conversation history |
| `isStreaming` | `boolean` | True while any stream is active |
| `isFollowUpMode` | `boolean` | True after a review completes; switches input to chat mode |
| `error` | `string \| null` | User-facing error shown in the error banner |
| `activeCorrelationIdRef` | `Ref<string \| null>` | `null` in review mode; set to `correlationId` once review completes |
| `chatHistoryRef` | `Ref<ChatMessage[]>` | Conversation turns forwarded to the LLM on each follow-up |

`handleSubmit` is the single entry point for user actions. It routes to `startSubmit` or `startChat` based on `activeCorrelationIdRef`.

---

## Two-Phase Flow

```
Phase 1 — Review
  User submits text/file
  → useChatInterface.handleSubmit()
  → generateCorrelationId() → UUID
  → User message appended to messages[]
  → useSubmitStream.startSubmit()
      → POST /api/v1/review (or /upload)
      → parseNDJSONStream → transformer.transform(event)
      → mergeAgentResult: AGENT_THINKING replaced in-place by AGENT_RESULT
      → stream ends → activeCorrelationIdRef set, isFollowUpMode = true

Phase 2 — Follow-up Chat
  User types question
  → handleSubmit() → activeCorrelationIdRef is set → useChatStream.startChat()
  → chatHistoryRef updated with user turn
  → POST /api/v1/chat/{correlationId}
  → drainChatStream → onChunk updates assistant message bubble
  → stream ends → chatHistoryRef updated with assistant reply
```

---

## Service Layer (`src/core/services/`)

| Module | Responsibility |
|---|---|
| `client.ts` | `fetch` wrapper; injects `X-Correlation-ID` header; timeout + abort signal |
| `retry.ts` | Exponential backoff (3 attempts, 1 s base, ×2 multiplier); skips retry on 4xx and AbortError |
| `stream.ts` | NDJSON stream reader; buffers partial lines across chunks |
| `chatClient.ts` | Follow-up chat HTTP call; accepts optional `buildBody` override |
| `chatStreamUtils.ts` | Pure chunk processing: `drainChatStream`, `processLines`, `mergeAgentResult` |

---

## Message Types

| `MessageType` | When | UI |
|---|---|---|
| `USER` | User submits | Right-aligned user bubble |
| `AGENT_THINKING` | Agent starts executing | Thinking indicator with agent name |
| `AGENT_RESULT` | Agent completes task | Replaces thinking bubble in-place; `renderReport` for structured data |
| `SYSTEM_COMPLETE` | Stream ends | Completion notice |
| `ERROR` | Stream or API error | Error bubble |

All text content is rendered through `ReactMarkdown`.

---

## Correlation ID

The client generates a UUID via `generateCorrelationId()` before each review submission and sends it as the `X-Correlation-ID` request header. The same ID tags all messages in the conversation, enabling `groupMessagesByCorrelation` in `MessageList` to keep them visually grouped.

---

## Integration Layer (`src/integrations/review-backend/`)

| File | Purpose |
|---|---|
| `transformer.ts` | `ReviewStreamEventTransformer` — maps `ReviewResponse` NDJSON events to `Message` objects |
| `renderReviewReport.tsx` | `renderReport` function passed to `ChatInterface` |
| `ReportContent.tsx` | Structured report UI: scorecard, findings, deep dive |
| `reportUtils.ts` | Pure helpers: severity colours, score formatting |
| `constants.ts` | `reviewChatUIConfig` — pre-built `ChatUIConfig` for this backend |
| `types.ts` | `ReviewReport`, `ReviewFinding`, `ReviewScorecard`, `ReviewResponse` |

---

## Key Design Decisions

**Pluggable transformer**
`StreamEventTransformer<TEvent>` is an interface. The core has no knowledge of `ReviewResponse` or any other domain event shape. Each integration provides its own implementation.

**Pluggable report renderer**
`ChatInterface` accepts an optional `renderReport` prop. If not provided, `MessageBubble` falls back to a generic key-value renderer. This keeps `ReportContent` entirely out of the core.

**AGENT_THINKING → AGENT_RESULT upsert**
Rather than appending a new message for each agent result, the frontend replaces the corresponding thinking bubble in-place via `mergeAgentResult`. This keeps the message list clean during multi-agent execution.

**No global state**
All state lives in `useChatInterface`. No Redux, no Context, no external store.

**Stable transformer reference**
`new ReviewStreamEventTransformer()` is instantiated outside the `App` component so it is never re-created on render.
