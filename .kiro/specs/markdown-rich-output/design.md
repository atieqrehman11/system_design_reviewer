# Design: Markdown-Rich API Output

## Overview

The change is intentionally minimal. No new infrastructure, no new endpoints, no schema type changes. The core insight is:

> **Markdown is just a string.** Pydantic types don't change. The LLM writes different content into the same `str` fields based on a format instruction passed at runtime.

Two orthogonal concerns are addressed:

1. **Format control** — `output_format` flows from the API request through to the LLM prompt as a variable
2. **Config versioning** — all prompt changes live in `v2/`, leaving `v1/` untouched

---

## Data Flow

### Current (v1)
```
ReviewRequest
    │
    ▼
reviewer_service.py
  crew.kickoff(inputs={'design_doc': ...})
    │
    ▼
tasks.yaml (v1) — no format instruction
  LLM writes plain strings into summary/deep_dive/justification
```

### After (v2)
```
ReviewRequest { design_doc, output_format: "markdown" | "plain" | "json" }
    │
    ▼
reviewer_service.py
  crew.kickoff(inputs={'design_doc': ..., 'output_format': 'markdown'})
    │
    ▼
tasks.yaml (v2) — FORMAT DIRECTIVE references {output_format}
  LLM writes formatted/plain/minimal strings based on instruction
```

---

## Pipeline After Change

```
User Input + output_format
    │
    ▼
[Librarian Agent]
  DocBlueprint — pure structured JSON, no narrative fields
  thinking_style — static Markdown string (agents.yaml v2)
    │
    ├──────────────────────────┐
    ▼                          ▼
[Performance Architect]    [Security Architect]
  thinking_style: Markdown   thinking_style: Markdown
  PerformanceReview:         SecurityReview:
  - summary: {output_format} - summary: {output_format}
  - bottlenecks: JSON        - vulnerabilities: JSON
  - reliability_score: JSON
    │                          │
    └────────────┬─────────────┘
                 ▼
    [Chief Strategist]
      thinking_style: Markdown
      ReviewReport:
      - scorecard: JSON
      - findings: JSON
      - deep_dive: {output_format}
                 │
                 ▼
    API → Frontend
```

---

## What Changes

### 1. `ReviewRequest` model — add `output_format` field

**`backend/app/models/api_schema.py`**
```python
from typing import Literal, Optional
from pydantic import BaseModel

class ReviewRequest(BaseModel):
    design_doc: str = None
    correlation_id: Optional[str] = None
    output_format: Literal["markdown", "plain", "json"] = "markdown"
```

No other API schema changes.

---

### 2. `reviewer_service.py` — pass `output_format` to crew kickoff

```python
crew.kickoff(inputs={
    'design_doc': design_doc,
    'output_format': request.output_format  # new
})
```

---

### 3. New versioned config — `config/review/v2/`

Create `backend/app/config/review/v2/agents.yaml` and `tasks.yaml` as copies of v1, then apply the following changes.

#### `v2/agents.yaml` — `thinking_style` fields rewritten in Markdown

Each agent's `thinking_style` is updated to use Markdown formatting. Example:

```yaml
performance_architect:
  thinking_style: >
    **Stress-testing architectural boundaries.**
    Applying the USE Method to evaluate resource saturation —
    hunting for bottlenecks that will trigger cascade failure at the 50k user threshold.
```

`thinking_style` is static — it does not reference `{output_format}`. It is always Markdown in v2.

#### `v2/tasks.yaml` — FORMAT DIRECTIVE added to narrative tasks

A `FORMAT DIRECTIVE` block is added to `performance_review_task`, `security_review_task`, and `final_review_task`. It references the `{output_format}` input variable:

```yaml
performance_review_task:
  description: >
    ...existing description...

    FORMAT DIRECTIVE:
    Write the 'summary' field according to the requested output format: {output_format}
    - If "markdown": use ## headings, **bold** for critical findings, - for bullet lists
    - If "plain": write clean prose with no Markdown syntax
    - If "json": write a single concise sentence only — the structured fields carry the detail
```

Same pattern applied to `security_review_task` (`summary`) and `final_review_task` (`deep_dive`, `justification`).

---

### 4. Config version selector

**`backend/app/settings.toml`** — add a setting:
```toml
[reviewer]
config_version = "v2"
```

**`reviewer_crew.py`** — read the setting to resolve config paths:
```python
agents_config = f'../../config/review/{config_version}/agents.yaml'
tasks_config  = f'../../config/review/{config_version}/tasks.yaml'
```

Switching from `v2` back to `v1` requires only changing `config_version = "v1"` — no code changes.

---

### 5. Pydantic field descriptions — document the contract

Update `description` values on narrative fields to reflect that content varies by format. No type changes.

```python
# performance_schema.py
summary: str = Field(
    ...,
    description="Narrative field. Content format depends on output_format: Markdown, plain prose, or minimal."
)

# security_schema.py  
summary: str = Field(
    ...,
    description="Narrative field. Content format depends on output_format: Markdown, plain prose, or minimal."
)

# final_report_schema.py
deep_dive: Optional[str] = Field(
    None,
    description="Narrative field. Content format depends on output_format: Markdown, plain prose, or minimal."
)
```

---

## What Does NOT Change

| Component | Reason |
|---|---|
| `DocBlueprint` schema | No narrative fields — all structured data |
| `ReviewResponse` API envelope | Wrapper unchanged |
| NDJSON streaming format | Unchanged |
| `reviewer_facade.py` | Unchanged |
| All Pydantic field types | `str` stays `str`, `int` stays `int` |
| `v1/` config files | Completely untouched |

---

## Frontend Impact

### 1. Update TypeScript types

In `frontend/src/types/index.ts`, add `output_format` to the request type:

```typescript
export type OutputFormat = 'markdown' | 'plain' | 'json';

export interface ReviewRequest {
  design_doc: string;
  output_format?: OutputFormat;
}
```

### 2. Update API service to send `output_format`

In `frontend/src/services/api/client.ts`, include `output_format` in the request body:

```typescript
body: JSON.stringify({
  design_doc: content,
  output_format: 'markdown',  // default
})
```

### 3. Add `react-markdown` and render narrative fields

Install `react-markdown`:
```
npm install react-markdown
```

In `MessageBubble/MessageBubble.tsx`, the `ReportContent` component renders narrative fields (`summary`, `deep_dive`, `justification`) through `<ReactMarkdown>` instead of plain `String(value)`. Structured fields continue to render as cards.

```tsx
import ReactMarkdown from 'react-markdown';

// In formatValue — detect narrative fields and render as Markdown
function formatValue(key: string, value: unknown): React.ReactNode {
  const narrativeFields = ['summary', 'deep_dive', 'justification'];
  if (narrativeFields.includes(key) && typeof value === 'string' && value.trim()) {
    return <ReactMarkdown>{value}</ReactMarkdown>;
  }
  // ... existing structured rendering
}
```

### 4. Style Markdown output

Add CSS to `MessageBubble.module.css` to style rendered Markdown elements (`h2`, `strong`, `ul`, `li`, `code`, `pre`) within the report content area.

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| LLM ignores `{output_format}` instruction | Low | GPT-4o-mini follows explicit formatting directives reliably; prompt is unambiguous |
| LLM uses Markdown in `plain` mode | Low | Negative instruction ("no Markdown syntax") is clear |
| LLM writes verbose prose in `json` mode | Low | Instruction limits to one sentence; structured fields carry the detail |
| Markdown in `thinking_style` looks odd in v1 clients | None | `thinking_style` change is v2 only; v1 clients use v1 config |
| `output_format` not forwarded to crew | Medium | Covered by task 2 — explicit code change with test coverage |
| v2 config path resolution fails | Low | Config version is read from settings at startup; easy to validate |
