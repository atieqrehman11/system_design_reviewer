# Frontend Code Review Report

Severity scale: 🔴 High · 🟡 Medium · 🟢 Low  
Priority scale: P1 (do now) · P2 (next sprint) · P3 (backlog)

---

## 1. Architecture & Design

| # | Issue | Severity | Priority | File |
|---|-------|----------|----------|------|
| F1 | `useChatInterface.ts` is doing too much — review submission, chat streaming, message state, error state, session management, and stream parsing are all in one hook. It should be split: `useReviewStream`, `useChatStream`, and a thin `useChatInterface` that composes them. | 🟡 | P2 | `useChatInterface.ts` |
| F2 | `drainChatStream`, `processLines`, `processSingleLine`, `makeReviewEventHandler`, and `makeChatStreamCallbacks` are module-level functions in `useChatInterface.ts`. They are tightly coupled to the hook's internals and should either be private to the hook or moved to a dedicated `chatStream.ts` utility. | 🟢 | P3 | `useChatInterface.ts` |
| F3 | `ChatRequestOptions` interface is defined locally inside `chatClient.ts` instead of `types.ts`. It duplicates the shape of `RequestOptions` (same `signal` and `timeout` fields). Consolidate into `RequestOptions` or extend it. | 🟢 | P3 | `chatClient.ts` |

---

## 2. Error Handling

| # | Issue | Severity | Priority | File |
|---|-------|----------|----------|------|
| F4 | `executeRequest` in `client.ts` has a code path that falls through without returning or throwing — if `handleFetchError` somehow doesn't throw (it always does, but TypeScript can't prove it), the function returns `undefined`. The return type should be narrowed or a final `throw` added after `handleFetchError`. | 🟡 | P2 | `client.ts` |
| F5 | `chatClient.ts` checks `errorData.detail` first (FastAPI format) then `errorData.message`. Now that the backend uses a custom exception handler that returns `message`, the `detail` fallback is stale. Should align with the actual backend response shape. | 🟢 | P3 | `chatClient.ts` |
| F6 | `processSingleLine` in `useChatInterface.ts` catches a parse error and logs it, but then silently continues — if a `status: "error"` event fails to parse, the user sees no feedback. The outer `drainChatStream` should surface unparseable error payloads. | 🟡 | P2 | `useChatInterface.ts` |
| F7 | `parseNDJSONStream` in `stream.ts` calls `onComplete()` when `done` is true, but does not call it if an exception is thrown — the `finally` block only releases the reader lock. `onComplete` or `onError` should always be called to avoid the caller hanging in a pending state. | 🟡 | P2 | `stream.ts` |

---

## 3. Type Safety

| # | Issue | Severity | Priority | File |
|---|-------|----------|----------|------|
| F8 | `ReviewReport` is typed as `{ [key: string]: unknown }` — effectively `any`. This flows through `Message.report` and into report rendering components with no type safety. Define a proper interface matching the backend `ReviewReport` Pydantic schema. | 🟡 | P2 | `types/index.ts` |
| F9 | `processSingleLine` parses JSON into `{ chunk?: string; status?: string; message?: string }` inline. This type should be a named interface in `types/index.ts` — it already exists as `ChatChunkResponse` but isn't used here. | 🟢 | P3 | `useChatInterface.ts` |
| F10 | `combineAbortSignals` in `signal.ts` adds an `abort` event listener but never removes it. For signals that outlive the request, this is a memory leak. Use `{ once: true }` (already done) — this is fine, but the early-abort path (`controller.abort(); break`) doesn't clean up the already-attached listeners on previous signals in the loop. | 🟢 | P3 | `signal.ts` |

---

## 4. React & Hooks

| # | Issue | Severity | Priority | File |
|---|-------|----------|----------|------|
| F11 | `handleReviewSubmit` and `handleChatSubmit` both use the `(async () => { ... })()` IIFE pattern inside `useCallback`. This means errors thrown before the first `await` are silently swallowed. Prefer returning the promise and handling it in `handleSubmit`, or use a `useEffect`-style pattern. | 🟡 | P2 | `useChatInterface.ts` |
| F12 | `handleReviewSubmit` has an empty dependency array `[]` in `useCallback` but references `setMessages`, `setError`, `setIsStreaming`, `setIsFollowUpMode`, and `activeCorrelationIdRef`. State setters are stable so this is safe, but `activeCorrelationIdRef` being a ref means stale closure is not an issue — however this should be documented to avoid future bugs. | 🟢 | P3 | `useChatInterface.ts` |
| F13 | `onSubmit` in `ChatInterface.tsx` is a wrapper that just calls `handleSubmit` — it adds no logic and can be removed. Pass `handleSubmit` directly to `InputArea`. | 🟢 | P3 | `ChatInterface.tsx` |

---

## 5. Security

| # | Issue | Severity | Priority | File |
|---|-------|----------|----------|------|
| F14 | `API_CONFIG.baseUrl` falls back to `/api/v1` when `REACT_APP_API_BASE_URL` is not set. This is fine for proxied dev, but in production the env var must be set — there is no validation or warning if it's missing. Add a startup check or console warning. | 🟢 | P3 | `constants.ts` |

---

## 6. Code Quality & Standards

| # | Issue | Severity | Priority | File |
|---|-------|----------|----------|------|
| F15 | `generateMessageId` and `generateCorrelationId` in `id.ts` use `Date.now() + Math.random()` which is not cryptographically unique and can collide under high concurrency. Use `crypto.randomUUID()` which is available in all modern browsers and Node 14.17+. | 🟡 | P2 | `utils/id.ts` |
| F16 | `FILE_UPLOAD_CONFIG` defines both `maxFileSizeMB: 5` and `maxFileSizeBytes: 5 * 1024 * 1024` as separate constants. `maxFileSizeBytes` should be derived from `maxFileSizeMB` to avoid them going out of sync. | 🟢 | P3 | `constants.ts` |
| F17 | `isValidFileType` in `useFileUploader.ts` uses `substring(filename.lastIndexOf('.'))` to extract the extension. This fails for files with no extension (returns the full filename) and for dotfiles like `.gitignore` (returns the full name). Use a more robust approach. | 🟡 | P2 | `useFileUploader.ts` |
| F18 | `submitReviewWithRetry` in `retry.ts` has a `throw new Error('Retry failed')` at the end that is unreachable — the loop always throws `lastError` on the final attempt. This is dead code and a SonarQube smell. | 🟢 | P3 | `retry.ts` |
| F19 | `logRetryAttempt` logs the attempt number but the delay logged is the delay *before* the current attempt, not the delay that was actually waited. The log call happens after `setTimeout` resolves, so the message is misleading. | 🟢 | P3 | `retry.ts` |
| F20 | `ChatInterface.tsx` hardcodes the streaming indicator text as `'Thinking...'` and `'Processing...'` inline. These should be in `UI_TEXT` constants for consistency and i18n readiness. | 🟢 | P3 | `ChatInterface.tsx` |
