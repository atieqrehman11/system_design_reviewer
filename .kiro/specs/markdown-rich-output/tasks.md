# Implementation Tasks: Markdown-Rich API Output

- [x] 1. Add `output_format` to `ReviewRequest` model
  - In `backend/app/models/api_schema.py`, add field to `ReviewRequest`:
    ```python
    output_format: Literal["markdown", "plain", "json"] = "markdown"
    ```
  - Add `Literal` to imports from `typing`
  - No other schema changes
  - _Requirements: 5.1, 5.6, 6.1_

- [x] 2. Pass `output_format` through `reviewer_service.py`
  - In `run_crew_job`, add `output_format` to the `crew.kickoff()` inputs:
    ```python
    crew.kickoff(inputs={
        'design_doc': design_doc,
        'output_format': request.output_format
    })
    ```
  - _Requirements: 5.7_

- [x] 3. Add config version selector to `reviewer_crew.py` and `settings.toml`
  - In `backend/app/settings.toml`, add:
    ```toml
    [reviewer]
    config_version = "v2"
    ```
  - In `DesignReviewerCrew`, read `config_version` from settings and resolve config paths dynamically:
    ```python
    agents_config = f'../../config/review/{config_version}/agents.yaml'
    tasks_config  = f'../../config/review/{config_version}/tasks.yaml'
    ```
  - Switching versions requires only a settings change — no code change
  - _Requirements: 4.3, 4.4, 4.5_

- [x] 4. Create `v2/agents.yaml` — rewrite `thinking_style` fields in Markdown
  - Create `backend/app/config/review/v2/agents.yaml` as a copy of `v1/agents.yaml`
  - Rewrite the `thinking_style` field for all four agents using Markdown formatting (bold, bullet points)
  - `thinking_style` is static — it does NOT reference `{output_format}`; it is always Markdown in v2
  - `v1/agents.yaml` remains completely unchanged
  - _Requirements: 2.1, 2.2, 4.1, 4.2_

- [x] 5. Create `v2/tasks.yaml` — add FORMAT DIRECTIVE to narrative tasks
  - Create `backend/app/config/review/v2/tasks.yaml` as a copy of `v1/tasks.yaml`
  - Add a `FORMAT DIRECTIVE` block to `performance_review_task`, `security_review_task`, and `final_review_task` descriptions:
    ```
    FORMAT DIRECTIVE:
    Write the 'summary' field according to the requested output format: {output_format}
    - If "markdown": use ## headings, **bold** for critical findings, - for bullet lists
    - If "plain": write clean prose with no Markdown syntax
    - If "json": write a single concise sentence only — structured fields carry the detail
    ```
  - Apply equivalent directive to `deep_dive` and `justification` in `final_review_task`
  - `v1/tasks.yaml` remains completely unchanged
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 3.3, 4.1, 4.2, 5.2, 5.3, 5.4_

- [x] 6. Update Pydantic field descriptions to reflect format-aware contract
  - In `performance_schema.py`: update `PerformanceReview.summary` and `ReliabilityScore.justification` descriptions to: `"Narrative field. Content format depends on output_format: Markdown, plain prose, or minimal."`
  - In `security_schema.py`: update `SecurityReview.summary` description similarly
  - In `final_report_schema.py`: update `deep_dive` description similarly
  - No type changes
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 7. Verify `output_format` default and backward compatibility
  - Confirm that requests without `output_format` field default to `"markdown"`
  - Confirm existing API contract (field names, types, NDJSON format) is unchanged
  - _Requirements: 5.6, 6.1, 6.2, 6.3_

- [ ] 8. Manual end-to-end verification
  - Submit a sample design document three times with `output_format: "markdown"`, `"plain"`, and `"json"` and verify:
    - `"markdown"`: `summary`, `deep_dive`, `justification` contain `##`, `**`, `-` syntax
    - `"plain"`: same fields contain clean prose with no Markdown characters
    - `"json"`: same fields are minimal (one sentence or empty); structured fields (`bottlenecks`, `vulnerabilities`, `findings`, `score`) are fully populated
    - All three: `reliability_score.score` is an integer, `findings` items are plain JSON objects, `DocBlueprint` contains no Markdown
  - Switch `config_version` to `"v1"` and verify original behavior is restored
  - _Requirements: 1, 2, 3, 4, 5_

- [x] 9. Update frontend TypeScript types for `output_format`
  - In `frontend/src/types/index.ts`, add `OutputFormat` type and `output_format` field:
    ```typescript
    export type OutputFormat = 'markdown' | 'plain' | 'json';
    ```
  - Add `output_format?: OutputFormat` to the request interface used by the API service
  - _Requirements: 7.3_

- [x] 10. Update frontend API service to send `output_format`
  - In `frontend/src/services/api/client.ts`, include `output_format: 'markdown'` in the request body sent to `POST /api/v1/review`
  - Ensure the value is passed through from the call site so it can be changed in future
  - _Requirements: 7.1, 7.2, 7.4_

- [x] 11. Add `react-markdown` and render narrative fields
  - Install `react-markdown`: `npm install react-markdown`
  - In `frontend/src/components/MessageBubble/MessageBubble.tsx`, update `formatValue` to detect narrative fields (`summary`, `deep_dive`, `justification`) and render them through `<ReactMarkdown>` instead of `String(value)`
  - WHEN the field value is empty or null, render nothing
  - Structured fields (`bottlenecks`, `vulnerabilities`, `findings`, `scorecard`, `score`) SHALL continue to use existing card rendering — do not pass them through the Markdown renderer
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 12. Style rendered Markdown in report content
  - In `frontend/src/components/MessageBubble/MessageBubble.module.css`, add scoped styles for Markdown elements rendered inside `.reportValue`: `h1`, `h2`, `h3`, `strong`, `ul`, `li`, `code`, `pre`
  - Ensure styles are consistent with the existing Gemini-style design (font sizes, spacing, colors from CSS variables)
  - _Requirements: 8.2_
