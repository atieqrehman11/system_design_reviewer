# Integration Guide

This guide explains how to wire the core chat-ui library to a different backend.
The core (`src/core/`) has no domain knowledge — all backend-specific logic lives in an integration folder under `src/integrations/<your-backend>/`.

---

## What You Need to Provide

| Artifact | Interface | Purpose |
|---|---|---|
| Event transformer | `StreamEventTransformer<TEvent>` | Maps raw NDJSON events to `Message` objects |
| Config | `ChatUIConfig` | API endpoints, UI strings, file upload settings |
| Report renderer | `(report: ReportData) => React.ReactNode` | Renders structured report data (optional) |

---

## Step 1 — Define Your Event Types

Create `src/integrations/<your-backend>/types.ts` with the shape of events your backend streams:

```typescript
// The raw NDJSON event your backend emits
export interface MyEvent {
  type: 'thinking' | 'result' | 'done' | 'error';
  agent?: string;
  content?: string;
  data?: Record<string, unknown>;
}
```

---

## Step 2 — Implement StreamEventTransformer

Create `src/integrations/<your-backend>/transformer.ts`:

```typescript
import type { Message, StreamEventTransformer } from '../../core';
import { MessageType } from '../../core';
import { generateMessageId } from '../../core';
import type { MyEvent } from './types';

export class MyEventTransformer implements StreamEventTransformer<MyEvent> {
  transform(event: MyEvent, correlationId: string): Message {
    const base = {
      id: generateMessageId(),
      timestamp: new Date(),
      correlationId,
      agent: event.agent,
    };

    if (event.type === 'thinking') {
      return { ...base, type: MessageType.AGENT_THINKING, content: event.content ?? '' };
    }
    if (event.type === 'result') {
      return { ...base, type: MessageType.AGENT_RESULT, content: event.content ?? '', report: event.data };
    }
    if (event.type === 'done') {
      return { ...base, type: MessageType.SYSTEM_COMPLETE, content: 'Done' };
    }
    return { ...base, type: MessageType.ERROR, content: event.content ?? 'Unknown error' };
  }

  isComplete(event: MyEvent): boolean {
    return event.type === 'done';
  }
}
```

The transformer must be a pure class — `transform` and `isComplete` must have no side effects.

---

## Step 3 — Create a ChatUIConfig

Create `src/integrations/<your-backend>/constants.ts`:

```typescript
import { createDefaultChatUIConfig } from '../../core';
import type { ChatUIConfig } from '../../core';

export const myConfig: ChatUIConfig = createDefaultChatUIConfig({
  appTitle: 'My AI Tool',
  assistantName: 'My Assistant',
  apiBaseUrl: process.env.REACT_APP_API_BASE_URL ?? '/api/v1',
  submitEndpoint: '/analyze',
  chatEndpoint: '/chat',
});
```

If your backend expects a different request body shape, provide `buildSubmitRequestBody` and/or `buildChatRequestBody`:

```typescript
export const myConfig: ChatUIConfig = createDefaultChatUIConfig({
  // ...
  buildSubmitRequestBody: (content, correlationId) => ({
    input: content,
    session_id: correlationId,
  }),
  buildChatRequestBody: (correlationId, messages) => ({
    session_id: correlationId,
    history: messages,
  }),
});
```

---

## Step 4 — Provide a Report Renderer (optional)

If your backend streams structured report data in `AGENT_RESULT` messages, provide a renderer:

```typescript
// src/integrations/<your-backend>/renderReport.tsx
import type { ReportData } from '../../core';

export function renderMyReport(report: ReportData): React.ReactNode {
  // Cast to your domain type and render
  const data = report as MyReportType;
  return <div>{data.summary}</div>;
}
```

If you skip this, `MessageBubble` falls back to a generic key-value renderer.

---

## Step 5 — Wire It in App.tsx

```typescript
import { ChatInterface } from './core';
import { MyEventTransformer, myConfig, renderMyReport } from './integrations/my-backend';

const transformer = new MyEventTransformer(); // outside component — stable reference

function App() {
  return (
    <ChatInterface
      config={myConfig}
      transformer={transformer}
      renderReport={renderMyReport}
    />
  );
}
```

`App.tsx` is the only file allowed to import from both `src/core/` and `src/integrations/`.

---

## Backend Contract

The core expects your backend to:

1. Accept `POST` to `submitEndpoint` and return an NDJSON stream (`application/x-ndjson`)
2. Accept `POST` to `chatEndpoint/{correlationId}` and return an NDJSON stream of chat chunks
3. Honour the `X-Correlation-ID` request header (or generate its own session ID)

### Review stream events (one JSON object per line)

```jsonc
{"type": "thinking", "agent": "My Agent", "content": "Working on it..."}
{"type": "result",   "agent": "My Agent", "content": "Done", "data": {...}}
{"type": "done"}
```

### Chat stream events

```jsonc
{"chunk": "Here is my answer..."}
{"chunk": " continued..."}
{"status": "complete"}
```

The chat stream format is fixed — `{"chunk": "..."}` lines followed by `{"status": "complete"}`. This is handled by `drainChatStream` in the core and does not need to be customised.

---

## Public API (`src/core/index.ts`)

Everything you need is exported from `src/core`:

```typescript
// Types
import type {
  Message, ChatMessage, ReportData,
  StreamEventTransformer, ChatUIConfig,
} from './core';

// Enums / classes
import { MessageType, ApiError } from './core';

// Config factory
import { createDefaultChatUIConfig, validateChatUIConfig } from './core';

// Components
import { ChatInterface, MessageBubble } from './core';

// Hooks (if building a custom UI)
import { useChatInterface } from './core';

// Utilities
import { generateMessageId, generateCorrelationId } from './core';
```

Do not import directly from `src/core/components/...` or `src/core/services/...` — always go through `src/core/index.ts`.
