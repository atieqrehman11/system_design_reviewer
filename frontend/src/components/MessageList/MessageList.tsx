import React, { useRef, useEffect, useState } from 'react';
import { Message, MessageType } from '../../types';
import MessageBubble from '../MessageBubble';
import styles from './MessageList.module.css';

interface MessageListProps {
  messages: Message[];
  isStreaming?: boolean;
}

/**
 * Group messages by correlation ID for better visual organization
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
 * Get the active agent name from recent messages
 */
function getActiveAgentName(messages: Message[]): string | null {
  // Look for the most recent agent message (thinking or result)
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.agent) {
      return message.agent;
    }
  }
  return null;
}

/**
 * Get the ID of the very last result message with a report across all messages
 */
function getLastResultId(messages: Message[]): string | null {
  // Find all result messages with reports
  const resultsWithReports = messages.filter(
    (m) => m.type === MessageType.AGENT_RESULT && m.report
  );

  // Return the ID of the last one
  if (resultsWithReports.length > 0) {
    return resultsWithReports[resultsWithReports.length - 1].id;
  }

  return null;
}

/**
 * MessageList component
 * Displays a list of messages with auto-scroll functionality and grouped streaming events
 */
const MessageList: React.FC<MessageListProps> = ({ messages, isStreaming = false }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  /**
   * Scroll to bottom of message list
   */
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  /**
   * Handle scroll event to detect if user scrolled up
   */
  const handleScroll = () => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

    setAutoScroll(isAtBottom);
    setShowScrollButton(!isAtBottom && messages.length > 0);
  };

  /**
   * Auto-scroll when new messages arrive
   */
  useEffect(() => {
    if (autoScroll) {
      scrollToBottom();
    }
  }, [messages, autoScroll]);

  const messageGroups = groupMessagesByCorrelation(messages);
  const activeAgent = getActiveAgentName(messages);
  const streamingText = activeAgent ? `${activeAgent} is working...` : 'Agent is working...';
  const lastResultId = getLastResultId(messages);

  return (
    <div
      ref={containerRef}
      className={styles.messageListContainer}
      onScroll={handleScroll}
    >
      {messageGroups.map((group, groupIndex) => {
        // Use first message ID in group as key for better stability
        const groupKey = group[0]?.id || `group-${groupIndex}`;
        return (
          <div key={groupKey} className={styles.messageGroup}>
            {group.map((message) => (
              <MessageBubble 
                key={message.id} 
                message={message}
                isLatestResult={message.id === lastResultId}
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

      {showScrollButton && (
        <button
          className={styles.scrollToBottomButton}
          onClick={() => scrollToBottom()}
          aria-label="Scroll to bottom"
        >
          ↓ New messages
        </button>
      )}

      <div ref={messagesEndRef} className={styles.scrollAnchor} />
    </div>
  );
};

export default MessageList;
