import React, { useRef, useEffect, useState } from 'react';
import type { Message, ReportData } from '../../types/core';
import { MessageType } from '../../types/core';
import MessageBubble from '../MessageBubble';
import styles from './MessageList.module.css';

interface MessageListProps {
  messages: Message[];
  isStreaming?: boolean;
  /** Shown in the streaming indicator — e.g. "Architect Assistant is working..." */
  assistantName?: string;
  /** Optional domain-specific report renderer forwarded to each MessageBubble. */
  renderReport?: (report: ReportData) => React.ReactNode;
}

/**
 * Group messages by correlation ID for visual separation of review sessions.
 */
function groupMessagesByCorrelation(messages: Message[]): Message[][] {
  const groups: Message[][] = [];
  let currentGroup: Message[] = [];
  let lastCorrelationId: string | undefined;

  messages.forEach((message) => {
    if (message.correlationId !== lastCorrelationId && currentGroup.length > 0) {
      groups.push(currentGroup);
      currentGroup = [];
    }
    currentGroup.push(message);
    lastCorrelationId = message.correlationId;
  });

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * Return the agent name from the most recent agent message, or null if none.
 */
function getActiveAgentName(messages: Message[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.agent) {
      return message.agent;
    }
  }
  return null;
}

/**
 * Return the ID of the last AGENT_RESULT message that carries a report.
 */
function getLastResultId(messages: Message[]): string | null {
  const resultsWithReports = messages.filter(
    (m) => m.type === MessageType.AGENT_RESULT && m.report,
  );
  if (resultsWithReports.length > 0) {
    return resultsWithReports.at(-1)?.id ?? null;
  }
  return null;
}

/**
 * MessageList — displays messages with auto-scroll and grouped streaming events.
 */
const MessageList: React.FC<MessageListProps> = ({
  messages,
  isStreaming = false,
  assistantName,
  renderReport,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const handleScroll = (): void => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 50);
  };

  useEffect(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  const messageGroups = groupMessagesByCorrelation(messages);
  const activeAgent = getActiveAgentName(messages);
  const streamingText = `${activeAgent ?? assistantName ?? 'Assistant'} is working...`;
  const lastResultId = getLastResultId(messages);

  return (
    <div
      ref={containerRef}
      className={styles.messageListContainer}
      onScroll={handleScroll}
    >
      {messageGroups.map((group, groupIndex) => {
        const groupKey = group[0]?.id ?? `group-${groupIndex}`;
        return (
          <div key={groupKey} className={styles.messageGroup}>
            {group.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isLatestResult={message.id === lastResultId}
                renderReport={renderReport}
              />
            ))}
            {groupIndex < messageGroups.length - 1 && (
              <div className={styles.groupSeparator} />
            )}
          </div>
        );
      })}

      {isStreaming && (
        <div className={styles.streamingIndicator}>
          <div className={styles.streamingDots}>
            <span className={styles.streamingDot} />
            <span className={styles.streamingDot} />
            <span className={styles.streamingDot} />
          </div>
          <span className={styles.streamingText}>{streamingText}</span>
        </div>
      )}

      <div ref={messagesEndRef} className={styles.scrollAnchor} />
    </div>
  );
};

export default MessageList;
