import React from 'react';
import type { ReportData } from '../../types/core';
import styles from './GenericReportRenderer.module.css';

interface GenericReportRendererProps {
  report: ReportData;
}

/**
 * Format a snake_case key as Title Case for display.
 * Uses replace with a global regex — never replaceAll (ES5/ES6 target).
 */
function formatKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Render a single scalar value with appropriate formatting.
 */
function renderScalar(value: unknown): React.ReactNode {
  if (value === null) {
    return <span className={styles.nullValue}>None</span>;
  }
  if (value === undefined) {
    return <span className={styles.nullValue}>Not set</span>;
  }
  if (typeof value === 'boolean') {
    return value
      ? <span className={styles.boolTrue}>✓ Yes</span>
      : <span className={styles.boolFalse}>✗ No</span>;
  }
  if (typeof value === 'number') {
    return <span className={styles.numberValue}>{value.toLocaleString()}</span>;
  }
  return <span className={styles.value}>{String(value)}</span>;
}

/**
 * Render a value that may be scalar, array, or nested object.
 * Nesting is handled recursively up to the natural depth of the data.
 */
function renderValue(value: unknown): React.ReactNode {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className={styles.nullValue}>Empty list</span>;
    }
    return (
      <div className={styles.nested}>
        {value.map((item, idx) => (
          // Array items have no stable key — index is the only option here
          // eslint-disable-next-line react/no-array-index-key
          <div key={idx}>{renderValue(item)}</div>
        ))}
      </div>
    );
  }

  if (value !== null && typeof value === 'object') {
    return (
      <div className={styles.nested}>
        <GenericReportRenderer report={value as ReportData} />
      </div>
    );
  }

  return renderScalar(value);
}

/**
 * GenericReportRenderer — renders any ReportData as a human-readable key-value tree.
 *
 * Formatting rules:
 * - boolean  → ✓ Yes / ✗ No
 * - null      → None
 * - undefined → Not set
 * - []        → Empty list
 * - number    → toLocaleString()
 * - object    → recursive with indent
 * - string    → raw string
 *
 * Keys are converted from snake_case to Title Case.
 */
const GenericReportRenderer: React.FC<GenericReportRendererProps> = ({ report }) => (
  <div className={styles.container}>
    {Object.entries(report).map(([key, value]) => (
      <div key={key} className={styles.entry}>
        <div className={styles.key}>{formatKey(key)}</div>
        <div>{renderValue(value)}</div>
      </div>
    ))}
  </div>
);

export default GenericReportRenderer;
