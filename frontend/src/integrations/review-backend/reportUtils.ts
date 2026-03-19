/**
 * Utility functions and constants for rendering review reports.
 * All functions are pure — no React dependencies.
 */

/** Fields to skip entirely — internal flags not useful to display. */
export const SKIP_FIELDS = new Set([
  'is_valid',
  'data_available',
  'generated_at',
  'validation_strictness',
]);

/** Score object fields — already shown as score cards, skip the nested section. */
export const SCORE_OBJECT_FIELDS = new Set(['reliability_score']);

/** Score fields shown as score cards. */
export const SCORE_FIELDS = new Set(['score', 'reliability_score', 'architecture_health']);

/** Scorecard field gets a dedicated hero rendering. */
export const SCORECARD_KEY = 'scorecard';

/** Narrative fields rendered via Markdown renderer. */
export const NARRATIVE_FIELDS = new Set(['summary', 'deep_dive', 'justification']);

/** Narrative fields whose key label is redundant (Markdown content has its own headings). */
export const HEADLESS_NARRATIVE_FIELDS = new Set(['summary', 'deep_dive']);

/**
 * Convert a snake_case key to a human-readable label.
 * Uses replace with global regex — never replaceAll (ES5/ES6 target).
 */
/** Convert a snake_case key to a human-readable label. */
export function labelFromKey(key: string): string {
  // ES5/ES6 target: String#replaceAll is not available — use replace with global regex
  return key.replace(/_/g, ' ');
}

/** Returns true when a value should be treated as empty/absent. */
export function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value as Record<string, unknown>).length === 0
  ) {
    return true;
  }
  return false;
}

/** Normalise a key for comparison (strip underscores, lowercase). */
export function normalizeKey(key: string): string {
  // ES5/ES6 target: String#replaceAll is not available — use replace with global regex
  return key.replace(/_/g, '').toLowerCase();
}

/** Returns true when all values in an object are primitives or empty arrays. */
export function isFlatObject(obj: Record<string, unknown>): boolean {
  return Object.values(obj).every((v) => {
    if (v === null || v === undefined) return true;
    if (typeof v !== 'object') return true;
    if (Array.isArray(v) && (v.length === 0 || typeof v[0] !== 'object')) return true;
    return false;
  });
}

/** Returns true when every item in a list has ≤ 2 primitive values. */
export function isSimpleList(items: Record<string, unknown>[]): boolean {
  return items.every((item) => {
    const vals = Object.values(item).filter((v) => v !== null && v !== undefined);
    return vals.length <= 2 && vals.every((v) => typeof v === 'string' || typeof v === 'number');
  });
}

/** Extract a display label from a simple-list item. */
export function getSimpleListLabel(item: Record<string, unknown>): string {
  const preferred = ['issue', 'finding', 'name', 'title', 'description'];
  for (const key of preferred) {
    const val = item[key];
    if (typeof val === 'string') return val;
  }
  const firstString = Object.values(item).find((v) => typeof v === 'string');
  return typeof firstString === 'string' ? firstString : '';
}

/**
 * Sort and filter report entries.
 * Reliability score is sorted to the top; empty validation errors are hidden.
 */
export function sortAndFilterEntries(entries: [string, unknown][]): [string, unknown][] {
  return entries
    .filter(([key, value]) => !(normalizeKey(key) === 'validationerrors' && isEmptyValue(value)))
    .sort(([keyA], [keyB]) => {
      if (normalizeKey(keyA) === 'reliabilityscore') return -1;
      if (normalizeKey(keyB) === 'reliabilityscore') return 1;
      return 0;
    });
}
