# Backend Code Review Report

Severity scale: 🔴 High · 🟡 Medium · 🟢 Low  
Priority scale: P1 (do now) · P2 (next sprint) · P3 (backlog)

---

## 1. Architecture & Design

| # | Issue | Severity | Priority | File |
|---|-------|----------|----------|------|
| B1 | `event_dispatcher` and `ReviewerEventListener` are instantiated as **module-level singletons** in `reviewer_service.py`, but `review.py` creates its own separate `EventDispatcher()` instance. Two singleton instances of the same class exist — the dispatcher in the service and the one in the facade are different objects, which will silently drop events. | 🔴 | P1 | `reviewer_service.py`, `review.py` |
| B2 | `EventDispatcher` uses `__new__` singleton pattern but `active_queues` is set on the **class** (`cls.active_queues`), not the instance. This is fragile — any subclass or re-instantiation can corrupt shared state. Use a proper instance attribute in `__init__`. | 🔴 | P1 | `event_dispatcher.py` |
| B3 | `ReviewerService`, `ReviewerFacade`, `DocumentExtractor`, and `EventDispatcher` are all instantiated directly inside `review.py` at module level. There is no dependency injection — tight coupling makes unit testing impossible without monkey-patching. | 🟡 | P2 | `review.py` |
| B4 | `_looks_like_design_doc` and `_DESIGN_KEYWORDS` are module-level in `reviewer_crew.py` but are only used by `validate_input_content`. They belong either inside the class or in a dedicated validator module. | 🟢 | P3 | `reviewer_crew.py` |

---

## 2. Error Handling

| # | Issue | Severity | Priority | File |
|---|-------|----------|----------|------|
| B5 | `review.py` still raises `HTTPException` directly in `review_design_document_upload` for the extraction error and the missing file/doc guard. Inconsistent with the custom exception pattern now used in `chat.py`. | 🟡 | P2 | `review.py` |
| B6 | `exception_handlers.py` global `Exception` handler accesses `exc.detail` and `exc.status_code` without checking if those attributes exist — will raise `AttributeError` for plain `Exception` instances, masking the original error. | 🔴 | P1 | `exception_handlers.py` |
| B7 | `reviewer_service.py` `_target()` catches all exceptions but only puts the error message on `sync_queue` — it never dispatches via `event_dispatcher`, so the SSE stream the client is listening to never receives the error event. The client will hang until timeout. | 🔴 | P1 | `reviewer_service.py` |
| B8 | `util.py` `log_task_metrics` silently swallows all exceptions with a bare `except Exception`. At minimum the exception should be logged via the `logger`, not `print`. | 🟢 | P3 | `util.py` |
| B9 | `document_extractor.py` catches a bare `Exception` and re-raises as `ExtractionError`, discarding the original traceback context. The `from exc` is correct but the outer `except ExtractionError: raise` block is redundant — it can be removed. | 🟢 | P3 | `document_extractor.py` |

---

## 3. Logging

| # | Issue | Severity | Priority | File |
|---|-------|----------|----------|------|
| B10 | `print()` is used throughout the entire backend for logging (`reviewer_service.py`, `reviewer_crew.py`, `event_dispatcher.py`, `reviewer_facade.py`, `reviewer_event_listeners.py`). The `logger` in `logger.py` exists but is only used in `exception_handlers.py`. All `print` calls should be replaced with structured `logger` calls. | 🟡 | P2 | Multiple files |
| B11 | `logger.py` sets the root logging level to `ERROR`, which suppresses all `INFO` and `DEBUG` output. This means even if `print` is replaced with `logger.info`, nothing will appear. The level should be configurable via settings. | 🟡 | P2 | `logger.py` |

---

## 4. Type Safety

| # | Issue | Severity | Priority | File |
|---|-------|----------|----------|------|
| B12 | `_extract_report_data(self, result)` has no type annotation on `result` — it accepts a CrewAI `CrewOutput` but is typed as implicit `Any`. Add a proper type hint or at minimum `object`. | 🟢 | P3 | `reviewer_service.py` |
| B13 | `ReviewResponse.report` is typed as `Optional[object]` in `api_schema.py`. This is effectively `Any` and will not serialize correctly with Pydantic. Should be `Optional[Dict[str, Any]]`. | 🟡 | P2 | `api_schema.py` |
| B14 | `EventDispatcher.dispatch` parameter `data` is typed as `any` (lowercase) which is not a valid Python type annotation — it should be `Any` from `typing`, or a union of expected types. | 🟡 | P2 | `event_dispatcher.py` |
| B15 | `validate_input_content` in `reviewer_crew.py` has no return type annotation and `inputs` has no type annotation. Should be `def validate_input_content(self, inputs: dict) -> dict`. | 🟢 | P3 | `reviewer_crew.py` |

---

## 5. Security

| # | Issue | Severity | Priority | File |
|---|-------|----------|----------|------|
| B16 | `/properties` endpoint in `status.py` returns **all configuration settings** including API keys, Azure credentials, and secrets. This endpoint must be removed or protected behind authentication. | 🔴 | P1 | `status.py` |
| B17 | `review_sessions.db` is stored inside `backend/app/` and committed to the repo (visible in the file tree). The database file should be in `.gitignore` and stored outside the app package directory. | 🟡 | P2 | `review_store.py` |
| B18 | `_DB_PATH` is hardcoded relative to the source file location. It should be configurable via settings so it can be pointed to a proper data directory in production. | 🟡 | P2 | `review_store.py` |

---

## 6. Code Quality & Standards

| # | Issue | Severity | Priority | File |
|---|-------|----------|----------|------|
| B19 | `util.py` contains `load_prompt` which reads from a hardcoded `prompts/` path that doesn't exist in the project. This is dead/broken code and should be removed. | 🟡 | P2 | `util.py` |
| B20 | `reviewer_facade.py` uses `asyncio.get_event_loop()` which is deprecated since Python 3.10. Replace with `asyncio.get_running_loop()`. | 🟡 | P2 | `reviewer_facade.py` |
| B21 | `_create_llm` in `reviewer_crew.py` calls `self.agents_config.get(agent_name, {})` but `agents_config` is a string path at class level — after CrewAI loads it, it becomes a dict, but this is implicit and fragile. The method should guard against the string case. | 🟡 | P2 | `reviewer_crew.py` |
| B22 | `config.py` `__init__` is called every time `Settings()` is instantiated due to the singleton pattern not guarding `__init__`. Add an `_initialized` flag to prevent re-running `_load_config()` on subsequent calls. | 🟡 | P2 | `config.py` |
| B23 | `LLMService` Azure branch hardcodes `temperature=1.0`, `top_p=1.0`, and `max_completion_tokens=4096` — these should come from config just like the chat LLM params. | 🟢 | P3 | `llm.py` |
| B24 | `ChatMessageRequest` and `ChatRequest` Pydantic models are defined inside `chat.py` (an endpoint file). Request/response schemas belong in `models/api_schema.py`. | 🟢 | P3 | `chat.py` |
| B25 | `_STREAM_HEADERS` dict is duplicated identically in both `chat.py` and `review.py`. Extract to a shared constant in `common/` or `models/`. | 🟢 | P3 | `chat.py`, `review.py` |
