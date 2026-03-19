import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { Message, ReportData } from '../../types/core';
import { MessageType } from '../../types/core';
import { useMessageBubble } from './useMessageBubble';
import GenericReportRenderer from './GenericReportRenderer';
import CopyButton from '../CopyButton';
import styles from './MessageBubble.module.css';

export interface MessageBubbleProps {
  message: Message;
  isLatestResult?: boolean;
  /**
   * Optional domain-specific report renderer.
   * Falls back to GenericReportRenderer when absent.
   */
  renderReport?: (report: ReportData) => React.ReactNode;
}

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

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function getCopyText(message: Message): string {
  if (message.report) {
    return JSON.stringify(message.report, null, 2);
  }
  return message.content;
}

const ThinkingIndicator: React.FC = () => (
  <span className={styles.thinkingIndicator}>
    <span className={styles.thinkingDot} />
    <span className={styles.thinkingDot} />
    <span className={styles.thinkingDot} />
  </span>
);

function renderReportContent(
  report: ReportData,
  renderReport?: (r: ReportData) => React.ReactNode,
): React.ReactNode {
  if (renderReport) {
    return renderReport(report);
  }
  return <GenericReportRenderer report={report} />;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isLatestResult = false,
  renderReport,
}) => {
  const hasReport = Boolean(message.report);
  const { isExpanded, toggleExpanded } = useMessageBubble({ hasReport, isLatestResult });

  const messageClass = MESSAGE_CLASSES[message.type] ?? '';
  const icon = MESSAGE_ICONS[message.type] ?? '';
  const showHeader = Boolean(message.agent) || message.type !== MessageType.USER;
  const copyText = getCopyText(message);

  return (
    <div className={`${styles.messageBubble} ${messageClass}`}>
      {message.type === MessageType.SYSTEM_COMPLETE ? (
        <div className={styles.systemCompleteRow}>
          <span className={styles.messageIcon}>{icon}</span>
          <span>{message.content}</span>
          <span className={styles.timestamp}>{formatTimestamp(message.timestamp)}</span>
          <CopyButton text={copyText} className={styles.bubbleCopyButton} />
        </div>
      ) : (
        <>
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
                <CopyButton text={copyText} className={styles.bubbleCopyButton} />
              </button>
            ) : (
              <div className={styles.messageHeader}>
                <div className={styles.headerLeft}>
                  {icon && <span className={styles.messageIcon}>{icon}</span>}
                  {message.agent && <span className={styles.agentName}>{message.agent}</span>}
                </div>
                <span className={styles.timestamp}>{formatTimestamp(message.timestamp)}</span>
                <CopyButton text={copyText} className={styles.bubbleCopyButton} />
              </div>
            )
          )}

          {message.type === MessageType.USER && (
            <div className={styles.userCopyWrapper}>
              <CopyButton text={copyText} />
            </div>
          )}

          {isExpanded && (
            <>
              {message.type === MessageType.AGENT_THINKING && (
                <div className={styles.messageContent}>
                  <div className={styles.markdownContent}>
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                  <ThinkingIndicator />
                </div>
              )}
              {message.type !== MessageType.AGENT_THINKING && !hasReport && (
                <div className={styles.messageContent}>
                  <div className={styles.markdownContent}>
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                </div>
              )}
              {message.report && renderReportContent(message.report, renderReport)}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default MessageBubble;
