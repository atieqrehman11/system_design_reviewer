import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, MessageType } from '../../types';
import { useMessageBubble } from './useMessageBubble';
import { ReportContent } from './ReportContent';
import styles from './MessageBubble.module.css';

interface MessageBubbleProps {
  message: Message;
  isLatestResult?: boolean;
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

function ThinkingIndicator() {
  return (
    <span className={styles.thinkingIndicator}>
      <span className={styles.thinkingDot} />
      <span className={styles.thinkingDot} />
      <span className={styles.thinkingDot} />
    </span>
  );
}

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
          <button className={styles.messageHeader} onClick={toggleExpanded} aria-expanded={isExpanded}>
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
          {message.type === MessageType.AGENT_THINKING && (
            <div className={styles.messageContent}>
              <div className={styles.markdownContent}>
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
              <ThinkingIndicator />
            </div>
          )}
          {message.type !== MessageType.AGENT_THINKING && !hasReport && (
            <div className={styles.messageContent}>{message.content}</div>
          )}
          {message.report && <ReportContent report={message.report as Record<string, unknown>} />}
        </>
      )}
    </div>
  );
};

export default MessageBubble;
