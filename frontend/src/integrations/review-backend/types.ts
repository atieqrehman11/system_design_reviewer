/**
 * Domain types for the review-backend integration.
 * These are specific to the system-design-reviewer backend and must NOT
 * be imported by anything in src/core/.
 */

// ---------------------------------------------------------------------------
// API response shape from the review backend
// ---------------------------------------------------------------------------

/** Raw event streamed from the review backend over NDJSON. */
export interface ReviewResponse {
  agent?: string;
  message_type?: string;
  status?: string;
  message?: string;
  report?: ReviewReport;
}

// ---------------------------------------------------------------------------
// Report domain types — mirror backend final_report_schema.py
// ---------------------------------------------------------------------------

/** Scorecard summary produced by the review crew. */
export interface ReviewScorecard {
  architecture_health: string;
  primary_risks: string;
  primary_bottleneck: string;
}

/** A single finding with priority, category, and remediation guidance. */
export interface ReviewFinding {
  priority: 'High' | 'Medium' | 'Low';
  category: string;
  finding: string;
  impact: string;
  fix: string;
}

/**
 * Full review report returned by the backend.
 * Sub-agent reports are merged in, so an index signature allows extra keys.
 */
export interface ReviewReport {
  data_available: boolean;
  generated_at: string;
  scorecard?: ReviewScorecard;
  findings?: ReviewFinding[];
  deep_dive?: string;
  [key: string]: unknown;
}
