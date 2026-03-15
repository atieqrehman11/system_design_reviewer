# Requirements: Markdown-Rich API Output

## Introduction

The backend currently returns all agent outputs as structured JSON with plain string values for narrative fields. All agent outputs — including intermediate ones — are streamed to the client via NDJSON events. The `thinking_style` messages and task output narrative fields are all visible to the user, yet none are formatted, making them hard to read.

This spec defines:
1. Which fields across all agent outputs should support rich formatting
2. A versioned config (`v2`) to preserve `v1` behavior for rollback and comparison
3. A user-controlled output format so API consumers, UI users, and future clients can request the format that suits their use case
4. Frontend changes to send `output_format` in requests and render Markdown fields properly

## Glossary

- **Narrative field**: A prose string field intended for human reading (e.g. `summary`, `deep_dive`, `justification`)
- **Structured field**: A typed value used by agents or UI logic (e.g. score, id, enum, boolean, typed list items)
- **Thinking message**: The `thinking_style` string streamed when an agent starts — static, defined in `agents.yaml`
- **Output format**: The rendering format requested by the client — `markdown` (default), `plain`, or `json`
- **v2 config**: A new versioned copy of `agents.yaml` and `tasks.yaml` with format-aware prompts
- **Markdown renderer**: A frontend component that renders Markdown strings as formatted HTML (e.g. `react-markdown`)
- **Narrative field**: A prose string field intended for human reading (e.g. `summary`, `deep_dive`, `justification`)

---

## Requirements

### Requirement 1 — Narrative fields in task outputs support the requested format

**User Story:** As a user, I want the review results — summaries, analysis, and deep-dive sections — to be properly formatted so I can read and scan them easily.

#### Acceptance Criteria

1. The `summary` field in `PerformanceReview` SHALL be written in the requested output format
2. The `summary` field in `SecurityReview` SHALL be written in the requested output format
3. The `deep_dive` field in `ReviewReport` SHALL be written in the requested output format
4. The `justification` field in `ReliabilityScore` SHALL be written in the requested output format
5. Structured fields (scores, IDs, enums, booleans, typed list items) SHALL always remain plain JSON primitives regardless of output format

### Requirement 2 — Thinking messages are formatted for readability

**User Story:** As a user, I want the agent thinking messages shown during processing to be readable and well-structured, not a wall of plain text.

#### Acceptance Criteria

1. The `thinking_style` field for each agent in `agents.yaml` SHALL be written in Markdown in the v2 config
2. `thinking_style` is a static string and is NOT subject to the `output_format` control — it is always Markdown in v2
3. `thinking_style` in v1 config SHALL remain unchanged

### Requirement 3 — Internal agent schemas remain pure JSON

**User Story:** As a developer, I want agent-to-agent communication to stay structured JSON so downstream agents can reliably extract values without parsing prose.

#### Acceptance Criteria

1. `DocBlueprint` fields SHALL NOT use Markdown — it contains no narrative fields; all fields are structured data (lists, enums, typed objects) that are both consumed by downstream agents and rendered structurally in the UI
2. Typed list items (`Bottleneck`, `Vulnerability`, `Finding`, `Scorecard`) SHALL remain plain JSON objects — the UI renders these as structured cards, not prose
3. No agent SHALL be required to parse a Markdown string to extract a structured value

### Requirement 4 — Versioned config (v2)

**User Story:** As a developer, I want format-aware prompts to live in a new `v2` config so `v1` behavior is preserved for rollback, A/B comparison, and audit.

#### Acceptance Criteria

1. A new `backend/app/config/review/v2/` directory SHALL be created containing `agents.yaml` and `tasks.yaml`
2. The `v1` config SHALL remain completely unchanged
3. The active config version SHALL be controlled by a single application setting
4. The `v2` config SHALL be the default for new deployments
5. Switching between `v1` and `v2` SHALL require only a config value change — no code changes

### Requirement 5 — Client-controlled output format

**User Story:** As an API consumer or UI user, I want to specify whether I want narrative output in Markdown, plain text, or minimal JSON-friendly form so I can get the response in the format that suits my client.

#### Acceptance Criteria

1. The `ReviewRequest` model SHALL accept an optional `output_format` field with allowed values: `"markdown"`, `"plain"`, and `"json"`
2. WHEN `output_format` is `"markdown"`, narrative fields SHALL use Markdown syntax (headings, bold, lists, code blocks)
3. WHEN `output_format` is `"plain"`, narrative fields SHALL be written as clean prose with no Markdown syntax
4. WHEN `output_format` is `"json"`, narrative prose fields (`summary`, `deep_dive`, `justification`) SHALL be minimal or omitted — the structured fields (`bottlenecks`, `vulnerabilities`, `findings`, `scorecard`, `score`) already carry the full information and no prose wrapping is needed
5. No schema type changes are required for any format — all three formats are valid values for existing `str` fields
6. IF `output_format` is omitted, the system SHALL default to `"markdown"`
7. The format instruction SHALL be applied by the LLM at generation time — the system SHALL NOT post-process output to add or strip formatting

### Requirement 6 — Backward compatibility

**User Story:** As a developer, I want existing integrations to continue working without any changes on their side.

#### Acceptance Criteria

1. No existing field SHALL be renamed, removed, or have its Python type changed
2. The NDJSON streaming format and `ReviewResponse` envelope SHALL remain unchanged
3. Clients that do not send `output_format` SHALL receive Markdown-formatted output by default — this is a safe, additive change

### Requirement 7 — Frontend sends `output_format` in review requests

**User Story:** As a UI user, I want the frontend to request Markdown output by default so the review results are always well-formatted without any manual configuration.

#### Acceptance Criteria

1. THE Chat Interface SHALL include `output_format` in every request sent to `POST /api/v1/review`
2. THE Chat Interface SHALL default to sending `output_format: "markdown"` unless the user has selected a different format
3. THE `ReviewRequest` TypeScript type in the frontend SHALL be updated to include the `output_format` field
4. THE API service layer SHALL pass `output_format` as part of the request body

### Requirement 8 — Frontend renders Markdown narrative fields

**User Story:** As a user, I want narrative fields in the review report to be rendered as formatted text — with headings, bold, lists, and code blocks — so the output is easy to read.

#### Acceptance Criteria

1. THE Chat Interface SHALL render the `summary`, `deep_dive`, and `justification` fields using a Markdown renderer
2. WHEN a narrative field contains Markdown syntax, THE Chat Interface SHALL display it as formatted HTML — not raw Markdown characters
3. WHEN a narrative field contains plain text (e.g. `output_format: "plain"`), THE Chat Interface SHALL display it as plain prose without modification
4. WHEN a narrative field is empty or null (e.g. `output_format: "json"`), THE Chat Interface SHALL not render that section
5. Structured fields (`bottlenecks`, `vulnerabilities`, `findings`, `scorecard`, `score`) SHALL continue to be rendered as structured cards — not passed through the Markdown renderer
