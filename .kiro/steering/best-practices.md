# Project Best Practices

## Tech Stack
- React 18 with TypeScript (strict mode, target: ES5, lib: ES6)
- CSS Modules for all component styling
- Custom hooks for state and logic separation
- Jest + React Testing Library for tests

## TypeScript
- Always use explicit types — avoid `any` where possible; if unavoidable, add a comment explaining why
- Use `interface` for component props and public API shapes
- Use `type` for unions, aliases, and utility types
- Never use `String#replaceAll()` — the TypeScript target is ES5/ES6 which doesn't support it; use `String#replace(/_/g, ' ')` with a global regex instead
- Prefer `Boolean(value)` over double negation `!!value`
- Avoid non-null assertions (`!`) — use proper null checks instead

## React Components
- One component per file, named the same as the file
- Each component folder must have an `index.tsx` re-export
- Separate logic from UI: extract state and side effects into a custom `use<ComponentName>.ts` hook
- Use `React.FC<Props>` for component type annotation
- Keep components focused — if a component grows too large, split it
- Avoid inline styles — always use CSS Modules
- Use `React.useState` initializer function (not value) when initial state depends on props

## CSS Modules
- One `.module.css` file per component, co-located in the same folder
- Use camelCase class names (e.g. `.messageHeader`, not `.message-header`)
- Use CSS variables defined in `index.css` for spacing, colors, and typography
- Avoid hardcoded pixel values for spacing — prefer CSS variables like `var(--spacing-md)`
- Do not use `!important`

## State Management
- Keep state as local as possible — lift only when necessary
- Use `useCallback` for handlers passed as props to avoid unnecessary re-renders
- When updating state based on previous state, always use the functional form: `setState(prev => ...)`
- Avoid deeply nested state — flatten where possible

## UX & Display
- Boolean values in UI should display as "✓ Yes" / "✗ No" — never raw `true`/`false`
- Empty arrays, null, and undefined should display as human-readable text ("None", "Not set", "Empty list")
- Numbers should be formatted with `toLocaleString()` for readability
- Empty sections (e.g. validation errors with no items) should be hidden, not shown as empty
- Important fields (e.g. scores) should be sorted to the top of lists
- Collapsible sections: only the latest/most relevant result should be expanded by default
- Streaming indicators should be compact inline bubbles, not full-width banners
- Agent names should always be shown in context (e.g. "Design Reviewer is working..." not "Agent is working...")

## Naming Conventions
- Components: PascalCase (`MessageBubble`)
- Hooks: camelCase prefixed with `use` (`useChatInterface`)
- CSS classes: camelCase (`reportKeyHighlight`)
- Constants: UPPER_SNAKE_CASE (`UI_TEXT`, `API_BASE_URL`)
- Utility functions: camelCase, verb-first (`formatValue`, `getMessageIcon`)

## File Structure
```
components/
  ComponentName/
    ComponentName.tsx       # Component
    ComponentName.module.css # Styles
    useComponentName.ts     # Hook (if needed)
    index.tsx               # Re-export
```

## Error Handling
- Always handle stream errors and API errors explicitly
- Show user-friendly error messages in the UI — never raw error objects
- Log detailed errors to the console for debugging
- Use the `ApiError` class for typed API errors

## Accessibility
- Interactive elements must be native HTML (`<button>`, `<input>`) — avoid `div` with `onClick`
- All interactive elements need keyboard support (`onKeyDown` for Enter/Space)
- Use `aria-expanded` on collapsible elements
- Provide `aria-label` on icon-only buttons
- Ensure sufficient color contrast

## Testing
- Tests live in `__tests__/` folders co-located with the code they test
- Test file naming: `<module>.test.ts` or `<component>.test.tsx`
- Run tests with `npm test -- --watchAll=false` for single execution
- Write tests for transformer/utility logic; focus on behavior not implementation
- Update existing tests when changing behavior — don't leave stale assertions

## Hooks & Async Patterns
- Never use IIFEs (`(async () => { ... })()`) inside `useCallback` — define a named `async function run()` and call `run().catch(...)` so errors are always surfaced
- `useCallback` with an empty dep array `[]` is safe when all referenced values are stable state setters or refs — document this with a comment to prevent future "fixes" that add unnecessary deps
- When a hook grows beyond one responsibility (state, streaming, error handling), split it: one sub-hook per concern, composed by a thin parent hook
- Pure stream utilities (no React deps) belong in a dedicated `*Utils.ts` file — fully testable in isolation
- Extract inner callback factories (e.g. `makeXCallbacks`) to module level to avoid nesting functions more than 4 levels deep (SonarQube rule)

## TypeScript & IDs
- Use `crypto.randomUUID()` for generating unique IDs — never `Date.now() + Math.random()` which can collide under concurrency
- Derive computed constants from their source: `maxFileSizeBytes` should be `maxFileSizeMB * 1024 * 1024`, not a separate hardcoded value
- Name stream chunk response types explicitly (e.g. `ChatChunkResponse`) and import them — don't re-declare inline shapes

## Error Handling (Streams)
- `onComplete` / `onError` callbacks must always be called — including in exception paths; use `finally` blocks to guarantee this
- Stream error paths must always call `onComplete` so callers don't hang in a pending state
- Inline message errors (bubble-level) and banner errors serve different purposes — don't show both for the same failure

## Python Backend
- Use `%s`-style logger formatting (`logger.info("msg %s", value)`) — never f-strings in log calls (SonarQube / performance)
- `asyncio.CancelledError` must always be re-raised — never swallowed in a bare `except Exception` block
- Raise domain-specific exceptions (e.g. `ReviewNotFoundException`) from services; let a central exception handler map them to HTTP responses — don't raise `HTTPException` directly in service or business logic layers
- Singleton classes must guard `__init__` with an `if hasattr(self, '_initialized')` check to prevent re-initialisation on repeated `getInstance()` calls
- Use `frozenset` for immutable keyword/constant sets — signals intent and prevents accidental mutation
- Shared string/numeric constants belong in `constants.py` — never duplicated across modules

## Rules
- Always follow best practice of language the code is written in
- Ensure the functions/lib is not deprecated
- Ensure the code generated must not have any sonarqube issues and code smells
- Ensure the code generated must adhere to standards, created in its best place to avoid any technical debt
- Ensure the best place for any method — if it can be part of a class then it must be added to the class
- Always ensure Single Responsibility rule for method/class level and keep the methods testable
