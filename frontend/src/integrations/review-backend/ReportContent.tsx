/**
 * Domain-specific report renderer for the review-backend integration.
 * Renders a ReviewReport as a rich, structured UI.
 */
import React from 'react';
import ReactMarkdown from 'react-markdown';
import {
  SKIP_FIELDS,
  SCORE_OBJECT_FIELDS,
  SCORE_FIELDS,
  SCORECARD_KEY,
  NARRATIVE_FIELDS,
  HEADLESS_NARRATIVE_FIELDS,
  isEmptyValue,
  isFlatObject,
  isSimpleList,
  getSimpleListLabel,
  sortAndFilterEntries,
  labelFromKey,
} from './reportUtils';
import styles from './ReportContent.module.css';

// ---------------------------------------------------------------------------
// Severity badge colours
// ---------------------------------------------------------------------------

const SEVERITY_COLORS: Record<string, string> = {
  critical: styles.severityCritical,
  high: styles.severityHigh,
  medium: styles.severityMedium,
  low: styles.severityLow,
};

// ---------------------------------------------------------------------------
// Cell value formatter (used in tables)
// ---------------------------------------------------------------------------

function formatCellValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className={styles.nullValue}>—</span>;
  }
  if (typeof value === 'boolean') {
    return (
      <span className={value ? styles.booleanTrue : styles.booleanFalse}>
        {value ? '✓' : '✗'}
      </span>
    );
  }
  if (typeof value === 'number') {
    return <span className={styles.numberValue}>{value.toLocaleString()}</span>;
  }
  if (typeof value === 'string') {
    const severityClass = SEVERITY_COLORS[value.toLowerCase()];
    if (severityClass) {
      return <span className={`${styles.arrayCardBadge} ${severityClass}`}>{value}</span>;
    }
    return value;
  }
  return JSON.stringify(value);
}

// ---------------------------------------------------------------------------
// formatValue helpers (split to reduce cognitive complexity)
// ---------------------------------------------------------------------------

function formatArrayValue(key: string, value: unknown[]): React.ReactNode {
  if (value.length === 0) return <span className={styles.emptyValue}>Empty list</span>;

  if (typeof value[0] === 'object' && value[0] !== null) {
    const objItems = value as Record<string, unknown>[];
    if (isSimpleList(objItems)) {
      return (
        <ul className={styles.primitiveList}>
          {objItems.map((item, i) => {
            const label = getSimpleListLabel(item);
            const rowKey = typeof item.id === 'string' ? item.id : `row-${i}`;
            return <li key={rowKey}>{label}</li>;
          })}
        </ul>
      );
    }
    return <ObjectTable items={objItems} />;
  }

  return (
    <ul className={styles.primitiveList}>
      {value.map((item, i) => {
        const text =
          typeof item === 'string' || typeof item === 'number'
            ? String(item)
            : JSON.stringify(item);
        return <li key={`${text.slice(0, 20)}-${i}`}>{text}</li>;
      })}
    </ul>
  );
}

/** Format a single report value for display. */
export function formatValue(key: string, value: unknown): React.ReactNode {
  if (value === null) return <span className={styles.nullValue}>None</span>;
  if (value === undefined) return <span className={styles.nullValue}>Not set</span>;
  if (typeof value === 'boolean') {
    return (
      <span className={value ? styles.booleanTrue : styles.booleanFalse}>
        {value ? '✓ Yes' : '✗ No'}
      </span>
    );
  }
  if (Array.isArray(value)) return formatArrayValue(key, value);
  if (typeof value === 'object') return <pre>{JSON.stringify(value, null, 2)}</pre>;
  if (typeof value === 'number') {
    return <span className={styles.numberValue}>{value.toLocaleString()}</span>;
  }
  if (typeof value === 'string') {
    if (NARRATIVE_FIELDS.has(key) && value.trim()) {
      return (
        <div className={styles.markdownContent}>
          <ReactMarkdown>{value}</ReactMarkdown>
        </div>
      );
    }
    return value;
  }
  // Fallback for any remaining primitive types (e.g. bigint)
  return typeof value === 'bigint' ? value.toString() : '';
}

// ---------------------------------------------------------------------------
// ObjectTable
// ---------------------------------------------------------------------------

const EXCLUDED_TABLE_KEYS = new Set([
  'observation',
  'impact',
  'remediation',
  'threat_description',
  'attack_vector',
  'mitigation_strategy',
  'why_it_blocks_scaling',
  'fix',
]);

interface ObjectTableProps {
  readonly items: Record<string, unknown>[];
}

function ObjectTable({ items }: ObjectTableProps) {
  const allKeys = Array.from(
    new Set(
      items.flatMap((item) => Object.keys(item).filter((k) => !EXCLUDED_TABLE_KEYS.has(k))),
    ),
  );
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.dataTable}>
        <thead>
          <tr>
            {allKeys.map((k) => (
              <th key={k}>{labelFromKey(k).toUpperCase()}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const rowKey = typeof item.id === 'string' ? item.id : `row-${i}`;
            return (
              <tr key={rowKey}>
                {allKeys.map((k) => (
                  <td key={k}>{formatCellValue(item[k])}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FlatPropertyGrid
// ---------------------------------------------------------------------------

interface FlatPropertyGridProps {
  readonly obj: Record<string, unknown>;
}

function FlatPropertyGrid({ obj }: FlatPropertyGridProps) {
  const entries = Object.entries(obj).filter(([, v]) => !isEmptyValue(v));
  const primitiveEntries = entries.filter(([, v]) => !Array.isArray(v));
  const arrayEntries = entries.filter(([, v]) => Array.isArray(v));
  return (
    <div className={styles.flatSection}>
      {primitiveEntries.length > 0 && (
        <div className={styles.propertyGrid}>
          {primitiveEntries.map(([k, v]) => (
            <div key={k} className={styles.propertyItem}>
              <span className={styles.propertyKey}>{labelFromKey(k)}</span>
              <span className={styles.propertyValue}>
                {typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
                  ? String(v)
                  : JSON.stringify(v)}
              </span>
            </div>
          ))}
        </div>
      )}
      {arrayEntries.map(([k, v]) => (
        <div key={k} className={styles.propertyListItem}>
          <span className={styles.propertyKey}>{labelFromKey(k)}</span>
          <ul className={styles.propertyBullets}>
            {(v as unknown[]).map((item, i) => {
              const text =
                typeof item === 'string' || typeof item === 'number'
                  ? String(item)
                  : JSON.stringify(item);
              return <li key={`${k}-${i}`}>{text}</li>;
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ScoreCards
// ---------------------------------------------------------------------------

function getScoreColor(score: number): string {
  if (score >= 80) return styles.scoreHigh;
  if (score >= 50) return styles.scoreMedium;
  return styles.scoreLow;
}

interface ScoreCardsProps {
  readonly report: Record<string, unknown>;
}

function ScoreCards({ report }: ScoreCardsProps) {
  const scores: { label: string; value: number }[] = [];
  for (const [key, val] of Object.entries(report)) {
    if (typeof val === 'number' && SCORE_FIELDS.has(key)) {
      scores.push({ label: labelFromKey(key), value: val });
    }
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      const nested = val as Record<string, unknown>;
      if (typeof nested.score === 'number') {
        scores.push({ label: labelFromKey(key), value: nested.score });
      }
    }
  }
  if (scores.length === 0) return null;
  return (
    <div className={styles.scoreCards}>
      {scores.map(({ label, value }) => (
        <div key={label} className={`${styles.scoreCard} ${getScoreColor(value)}`}>
          <span className={styles.scoreValue}>{value}</span>
          <span className={styles.scoreLabel}>{label.toUpperCase()}</span>
          <div className={styles.scoreBar}>
            <div className={styles.scoreBarFill} style={{ width: `${value}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ScorecardHero
// ---------------------------------------------------------------------------

interface ScorecardHeroProps {
  readonly scorecard: Record<string, unknown>;
}

function ScorecardHero({ scorecard }: ScorecardHeroProps) {
  const health =
    typeof scorecard.architecture_health === 'string' ? scorecard.architecture_health : '';
  const risk =
    typeof scorecard.primary_risks === 'string' ? scorecard.primary_risks : '';
  const bottleneck =
    typeof scorecard.primary_bottleneck === 'string' ? scorecard.primary_bottleneck : '';
  return (
    <div className={styles.scorecardHero}>
      {health && (
        <div className={styles.scorecardHealth}>
          <span className={styles.scorecardHealthValue}>{health}</span>
          <span className={styles.scorecardHealthLabel}>ARCHITECTURE HEALTH</span>
        </div>
      )}
      <div className={styles.scorecardAlerts}>
        {risk && (
          <div className={styles.scorecardAlert}>
            <span className={styles.scorecardAlertIcon}>⚠️</span>
            <div>
              <div className={styles.scorecardAlertLabel}>PRIMARY RISK</div>
              <div className={styles.scorecardAlertText}>{risk}</div>
            </div>
          </div>
        )}
        {bottleneck && (
          <div className={styles.scorecardAlert}>
            <span className={styles.scorecardAlertIcon}>🔴</span>
            <div>
              <div className={styles.scorecardAlertLabel}>PRIMARY BOTTLENECK</div>
              <div className={styles.scorecardAlertText}>{bottleneck}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ReportContent — public component
// ---------------------------------------------------------------------------

export interface ReportContentProps {
  readonly report: Record<string, unknown>;
}

/**
 * Renders a review report as a structured, collapsible UI.
 * Handles score cards, scorecard hero, narrative markdown, tables, and flat grids.
 */
export const ReportContent: React.FC<ReportContentProps> = ({ report }) => {
  const entries = sortAndFilterEntries(Object.entries(report));
  return (
    <div className={styles.reportContent}>
      <ScoreCards report={report} />
      {entries.map(([key, value]) => {
        if (SKIP_FIELDS.has(key) || isEmptyValue(value) || SCORE_OBJECT_FIELDS.has(key)) {
          return null;
        }

        const keyLabel = labelFromKey(key).toUpperCase();

        if (HEADLESS_NARRATIVE_FIELDS.has(key) && typeof value === 'string') {
          return (
            <div key={key} className={styles.reportSection}>
              <div className={styles.markdownContent}>
                <ReactMarkdown>{value}</ReactMarkdown>
              </div>
            </div>
          );
        }

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          const obj = value as Record<string, unknown>;
          if (key === SCORECARD_KEY) {
            return (
              <div key={key} className={styles.reportSection}>
                <ScorecardHero scorecard={obj} />
              </div>
            );
          }
          return (
            <div key={key} className={styles.reportSection}>
              <div className={styles.reportKey}>{keyLabel}</div>
              {isFlatObject(obj) ? (
                <FlatPropertyGrid obj={obj} />
              ) : (
                <div className={styles.reportNestedContent}>
                  <ReportContent report={obj} />
                </div>
              )}
            </div>
          );
        }

        return (
          <div key={key} className={styles.reportSection}>
            <div className={styles.reportKey}>{keyLabel}</div>
            <div className={styles.reportValue}>{formatValue(key, value)}</div>
          </div>
        );
      })}
    </div>
  );
};
