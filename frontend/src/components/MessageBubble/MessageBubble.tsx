import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, MessageType } from '../../types';
import { useMessageBubble } from './useMessageBubble';
import styles from './MessageBubble.module.css';

interface MessageBubbleProps {
  message: Message;
  isLatestResult?: boolean;
}

// --- Lookup maps (replaces switch statements) ---

const MESSAGE_ICONS: Record<MessageType, string> = {
  [MessageType.USER]: '👤',
  [MessageType.AGENT_THINKING]: '🤔',
  [MessageType.AGENT_RESULT]: '✅',
  [MessageType.SYSTEM_COMPLETE]: '🎉',
  [MessageType.ERROR]: '⚠️',
};

const MESSAGE_CLASSES: Record<MessageType, string> = {
  [MessageType.USER]: styles.user,
  [MessageType.AGENT_THINKING]: styles.agentThinking,
  [MessageType.AGENT_RESULT]: styles.agentResult,
  [MessageType.SYSTEM_COMPLETE]: styles.systemComplete,
  [MessageType.ERROR]: styles.error,
};

// --- Utility functions ---

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) return true;
  return false;
}

// Fields to skip entirely — internal flags not useful to display
const SKIP_FIELDS = new Set(['is_valid', 'data_available', 'generated_at', 'validation_strictness']);

// Score object fields — already shown as score cards, skip the nested section
const SCORE_OBJECT_FIELDS = new Set(['reliability_score']);

// Flat object fields — render as inline property grid instead of nested sections
// An object is "flat" if all its values are primitives or arrays of primitives
function isFlatObject(obj: Record<string, unknown>): boolean {
  return Object.values(obj).every(v => {
    if (v === null || v === undefined) return true;
    if (typeof v !== 'object') return true;
    if (Array.isArray(v) && (v.length === 0 || typeof v[0] !== 'object')) return true;
    return false;
  });
}

// Narrative fields rendered via Markdown renderer
const NARRATIVE_FIELDS = new Set(['summary', 'deep_dive', 'justification']);

// Narrative fields whose key label is redundant (Markdown content has its own headings)
const HEADLESS_NARRATIVE_FIELDS = new Set(['summary', 'deep_dive']);

// Severity badge colors
const SEVERITY_COLORS: Record<string, string> = {
  critical: styles.severityCritical,
  high: styles.severityHigh,
  medium: styles.severityMedium,
  low: styles.severityLow,
};

function formatStringValue(key: string, value: string): React.ReactNode {
  if (NARRATIVE_FIELDS.has(key) && value.trim()) {
    return (
      <div className={styles.markdownContent}>
        <ReactMarkdown>{value}</ReactMarkdown>
      </div>
    );
  }
  return value;
}

function formatCellValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined) return <span className={styles.nullValue}>—</span>;
  if (typeof value === 'boolean') {
    return <span className={value ? styles.booleanTrue : styles.booleanFalse}>{value ? '✓' : '✗'}</span>;
  }
  if (typeof value === 'number') return <span className={styles.numberValue}>{value.toLocaleString()}</span>;
  const str = String(value);
  const severityClass = SEVERITY_COLORS[str.toLowerCase()];
  if (severityClass) {
    return <span className={`${styles.arrayCardBadge} ${severityClass}`}>{str}</span>;
  }
  return str;
}

interface ObjectTableProps {
  readonly items: Record<string, unknown>[];
}

// If every item in the array is a simple object with only one meaningful text field,
// render as a bullet list instead of a table
function isSimpleList(items: Record<string, unknown>[]): boolean {
  return items.every(item => {
    const vals = Object.values(item).filter(v => v !== null && v !== undefined && String(v).trim() !== '');
    return vals.length <= 2 && vals.every(v => typeof v === 'string' || typeof v === 'number');
  });
}

function getSimpleListLabel(item: Record<string, unknown>): string {
  // Pick the most meaningful field as the bullet text
  const preferred = ['issue', 'finding', 'name', 'title', 'description'];
  for (const key of preferred) {
    if (typeof item[key] === 'string') return item[key] as string;
  }
  return String(Object.values(item).find(v => typeof v === 'string') ?? '');
}

function ObjectTable({ items }: ObjectTableProps) {
  // Derive columns from all keys across all items, excluding long text fields
  const EXCLUDED_KEYS = new Set(['observation', 'impact', 'remediation', 'threat_description', 'attack_vector', 'mitigation_strategy', 'why_it_blocks_scaling', 'fix']);
  const allKeys = Array.from(
    new Set(items.flatMap(item => Object.keys(item).filter(k => !EXCLUDED_KEYS.has(k))))
  );

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.dataTable}>
        <thead>
          <tr>
            {allKeys.map(k => (
              <th key={k}>{k.replace(/_/g, ' ').toUpperCase()}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={String(item.id ?? item.name ?? i)}>
              {allKeys.map(k => (
                <td key={k}>{formatCellValue(item[k])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Fields treated as highlight scores — shown as score cards at the top
const SCORE_FIELDS = new Set(['score', 'reliability_score', 'architecture_health']);

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
              <span className={styles.propertyKey}>{k.replace(/_/g, ' ')}</span>
              <span className={styles.propertyValue}>{String(v)}</span>
            </div>
          ))}
        </div>
      )}
      {arrayEntries.map(([k, v]) => (
        <div key={k} className={styles.propertyListItem}>
          <span className={styles.propertyKey}>{k.replace(/_/g, ' ')}</span>
          <ul className={styles.propertyBullets}>
            {(v as unknown[]).map((item, i) => (
              <li key={`${String(item)}-${i}`}>{String(item)}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function getScoreColor(score: number): string {
  if (score >= 80) return styles.scoreHigh;
  if (score >= 50) return styles.scoreMedium;
  return styles.scoreLow;
}

interface ScoreCardsProps {
  readonly report: Record<string, unknown>;
}

function ScoreCards({ report }: ScoreCardsProps) {
  // Collect numeric score fields from top level and one level deep
  const scores: { label: string; value: number }[] = [];

  for (const [key, val] of Object.entries(report)) {
    if (typeof val === 'number' && SCORE_FIELDS.has(key)) {
      scores.push({ label: key.replace(/_/g, ' '), value: val });
    }
    // Check nested objects (e.g. reliability_score.score)
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      const nested = val as Record<string, unknown>;
      if (typeof nested.score === 'number') {
        scores.push({ label: key.replace(/_/g, ' '), value: nested.score });
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

function formatValue(key: string, value: unknown): React.ReactNode {
  if (value === null) return <span className={styles.nullValue}>None</span>;
  if (value === undefined) return <span className={styles.nullValue}>Not set</span>;
  if (typeof value === 'boolean') {
    return (
      <span className={value ? styles.booleanTrue : styles.booleanFalse}>
        {value ? '✓ Yes' : '✗ No'}
      </span>
    );
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className={styles.emptyValue}>Empty list</span>;
    // Array of objects — simple list or table
    if (typeof value[0] === 'object' && value[0] !== null) {
      const objItems = value as Record<string, unknown>[];
      if (isSimpleList(objItems)) {
        return (
          <ul className={styles.primitiveList}>
            {objItems.map((item, i) => (
              <li key={String(item.id ?? item.name ?? i)}>{getSimpleListLabel(item)}</li>
            ))}
          </ul>
        );
      }
      return <ObjectTable items={objItems} />;
    }
    // Array of primitives — bullet list
    return (
      <ul className={styles.primitiveList}>
        {(value as unknown[]).map((item, i) => (
          <li key={`${String(item)}-${i}`}>{String(item)}</li>
        ))}
      </ul>
    );
  }
  if (typeof value === 'object') return <pre>{JSON.stringify(value, null, 2)}</pre>;
  if (typeof value === 'number') return <span className={styles.numberValue}>{value.toLocaleString()}</span>;
  if (typeof value === 'string') return formatStringValue(key, value);
  return String(value);
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/_/g, '');
}

function sortAndFilterEntries(entries: [string, unknown][]): [string, unknown][] {
  return entries
    .filter(([key, value]) => !(normalizeKey(key) === 'validationerrors' && isEmptyValue(value)))
    .sort(([keyA], [keyB]) => {
      if (normalizeKey(keyA) === 'reliabilityscore') return -1;
      if (normalizeKey(keyB) === 'reliabilityscore') return 1;
      return 0;
    });
}

// --- Sub-components ---

function ThinkingIndicator() {
  return (
    <span className={styles.thinkingIndicator}>
      <span className={styles.thinkingDot} />
      <span className={styles.thinkingDot} />
      <span className={styles.thinkingDot} />
    </span>
  );
}

interface ReportContentProps {
  readonly report: Record<string, unknown>;
}

function ReportContent({ report }: ReportContentProps) {
  const entries = sortAndFilterEntries(Object.entries(report));
  return (
    <div className={styles.reportContent}>
      <ScoreCards report={report} />
      {entries.map(([key, value]) => {
        if (SKIP_FIELDS.has(key)) return null;
        if (isEmptyValue(value)) return null;
        if (SCORE_OBJECT_FIELDS.has(key)) return null;

        const keyLabel = key.replace(/_/g, ' ').toUpperCase();

        // Headless narrative — no label, content has its own headings
        if (HEADLESS_NARRATIVE_FIELDS.has(key) && typeof value === 'string') {
          return (
            <div key={key} className={styles.reportSection}>
              <div className={styles.markdownContent}><ReactMarkdown>{value}</ReactMarkdown></div>
            </div>
          );
        }

        // Object — auto-detect flat vs complex
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          const obj = value as Record<string, unknown>;
          return (
            <div key={key} className={styles.reportSection}>
              <div className={styles.reportKey}>{keyLabel}</div>
              {isFlatObject(obj)
                ? <FlatPropertyGrid obj={obj} />
                : <div className={styles.reportNestedContent}><ReportContent report={obj} /></div>
              }
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
}

// --- Main component ---

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isLatestResult = false }) => {
  const hasReport = Boolean(message.report);
  const { isExpanded, toggleExpanded } = useMessageBubble({ hasReport, isLatestResult });

  const messageClass = MESSAGE_CLASSES[message.type] ?? '';
  const icon = MESSAGE_ICONS[message.type] ?? '';
  const showHeader = Boolean(message.agent) || message.type !== MessageType.USER;

  return (
    <div className={`${styles.messageBubble} ${messageClass}`}>
      {showHeader && (
        hasReport ? (
          <button
            className={styles.messageHeader}
            onClick={toggleExpanded}
            aria-expanded={isExpanded}
          >
            <div className={styles.headerLeft}>
              {icon && <span className={styles.messageIcon}>{icon}</span>}
              {message.agent && <span className={styles.agentName}>{message.agent}</span>}
              <span className={styles.collapseIndicator}>{isExpanded ? '▼' : '▶'}</span>
            </div>
            <span className={styles.timestamp}>{formatTimestamp(message.timestamp)}</span>
          </button>
        ) : (
          <div className={styles.messageHeader}>
            <div className={styles.headerLeft}>
              {icon && <span className={styles.messageIcon}>{icon}</span>}
              {message.agent && <span className={styles.agentName}>{message.agent}</span>}
            </div>
            <span className={styles.timestamp}>{formatTimestamp(message.timestamp)}</span>
          </div>
        )
      )}

      {isExpanded && (
        <>
          <div className={styles.messageContent}>
            {message.type === MessageType.AGENT_THINKING ? (
              <>
                <div className={styles.markdownContent}>
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
                <ThinkingIndicator />
              </>
            ) : (
              message.content
            )}
          </div>
          {message.report && <ReportContent report={message.report as Record<string, unknown>} />}
        </>
      )}
    </div>
  );
};

export default MessageBubble;
