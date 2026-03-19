# Configuration

All configuration is driven by `REACT_APP_*` environment variables — there is a single source of truth.
Values are baked into the bundle at build time (CRA convention).

Copy `.env.example` to `.env` and set what you need:

```bash
cp frontend/.env.example frontend/.env
```

---

## Environment Variables

### API

| Variable | Default | Description |
|---|---|---|
| `REACT_APP_API_BASE_URL` | `/api/v1` | Backend API base URL. Use a relative path in dev (proxy handles it), full URL in production. |
| `REACT_APP_SUBMIT_ENDPOINT` | `/review` | Review submission endpoint path, appended to the base URL. |
| `REACT_APP_CHAT_ENDPOINT` | `/chat` | Follow-up chat endpoint path, appended to the base URL. |

### UI Text

| Variable | Default | Description |
|---|---|---|
| `REACT_APP_APP_TITLE` | `System Design Mentor` | Application title shown in the header. |
| `REACT_APP_APP_SUBTITLE` | `AI-powered architecture analysis and recommendations` | Subtitle shown below the title. |
| `REACT_APP_ASSISTANT_NAME` | `Architect Assistant` | Name shown in the streaming indicator and assistant chat bubbles. |
| `REACT_APP_INPUT_PLACEHOLDER` | `Paste your design document here or upload a file...` | Placeholder in the initial document input. |
| `REACT_APP_CHAT_PLACEHOLDER` | `Ask a follow-up question about the review...` | Placeholder in the follow-up chat input. |
| `REACT_APP_SUBMIT_BUTTON_TEXT` | `Review Design` | Label on the submit button. |
| `REACT_APP_EMPTY_STATE_MESSAGE` | `Submit a design document to get started...` | Message shown before any conversation starts. |

### File Upload

| Variable | Default | Description |
|---|---|---|
| `REACT_APP_MAX_FILE_SIZE_MB` | `5` | Maximum upload file size in megabytes. |

Accepted file types (`.txt`, `.md`, `.json`, `.pdf`, `.doc`, `.docx`) are structural — not deployment config — and are not env-configurable.

---

## How It Works

All env vars flow through a single file — `src/config/constants.ts`:

```
REACT_APP_* env vars
        ↓
src/config/constants.ts       (reads process.env, applies defaults)
        ↓
src/core/config/ChatUIConfig.ts  createDefaultChatUIConfig()
        ↓
ChatInterface (via config prop)
```

`createDefaultChatUIConfig()` builds a fully populated `ChatUIConfig` from `constants.ts`.
No values are hardcoded anywhere else. The integration (`src/integrations/review-backend/constants.ts`) calls it with no overrides:

```typescript
export const reviewChatUIConfig: ChatUIConfig = createDefaultChatUIConfig();
```

---

## ChatUIConfig Interface

`ChatUIConfig` is the object injected into `ChatInterface`. You rarely need to construct it manually — use `createDefaultChatUIConfig()` instead.

```typescript
interface ChatUIConfig {
  // Display
  appTitle: string;
  appSubtitle: string;
  inputPlaceholder: string;
  chatPlaceholder: string;
  submitButtonText: string;
  emptyStateMessage: string;
  assistantName: string;

  // API
  apiBaseUrl: string;
  submitEndpoint: string;
  chatEndpoint: string;

  // Optional body builders — override if your backend expects a different shape
  buildSubmitRequestBody?: (content: string, correlationId: string) => Record<string, unknown>;
  buildChatRequestBody?: (correlationId: string, messages: ChatMessage[]) => Record<string, unknown>;

  // File upload
  fileUpload: {
    maxFileSizeMB: number;
    maxFileSizeBytes: number;      // derived: maxFileSizeMB * 1024 * 1024
    acceptedFileTypes: string[];
    acceptedMimeTypes: string[];
  };

  // Error messages
  errorMessages: {
    networkError: string;
    fileTooLarge: string;
    invalidFileType: string;
    generic: string;
  };
}
```

All required string fields are validated at mount time by `validateChatUIConfig` — it throws a descriptive error if any field is missing or empty.

---

## Dev Proxy (`src/setupProxy.js`)

During development, CRA proxies all `/api` requests to the backend:

```javascript
createProxyMiddleware({
  target: 'http://localhost:8000',
  changeOrigin: true,
});
```

This means `REACT_APP_API_BASE_URL` is not required locally — requests to `/api/v1/*` are forwarded automatically.
