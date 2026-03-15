import React from 'react';
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
  return false;
}

function formatValue(value: unknown): React.ReactNode {
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
    return value.length === 0
      ? <span className={styles.emptyValue}>Empty list</span>
      : <pre>{JSON.stringify(value, null, 2)}</pre>;
  }
  if (typeof value === 'object') return <pre>{JSON.stringify(value, null, 2)}</pre>;
  if (typeof value === 'number') return <span className={styles.numberValue}>{value.toLocaleString()}</span>;
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
      {entries.map(([key, value]) => (
        <div key={key} className={styles.reportSection}>
          <div className={normalizeKey(key) === 'reliabilityscore' ? styles.reportKeyHighlight : styles.reportKey}>
            {key.replace(/_/g, ' ').toUpperCase()}
          </div>
          <div className={styles.reportValue}>{formatValue(value)}</div>
        </div>
      ))}
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
            {message.type === MessageType.AGENT_THINKING
              ? <>{message.content} <ThinkingIndicator /></>
              : message.content
            }
          </div>
          {message.report && <ReportContent report={message.report as Record<string, unknown>} />}
        </>
      )}
    </div>
  );
};

export default MessageBubble;
