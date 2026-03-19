import React from 'react';
import type { ReportData, StreamEventTransformer } from '../../types/core';
import type { ChatUIConfig } from '../../config/ChatUIConfig';
import { useChatInterface } from './useChatInterface';
import MessageList from '../MessageList';
import InputArea from '../InputArea';
import styles from './ChatInterface.module.css';

export interface ChatInterfaceProps {
  config: ChatUIConfig;
  transformer: StreamEventTransformer<unknown>;
  /** Optional domain-specific report renderer forwarded to each message bubble. */
  renderReport?: (report: ReportData) => React.ReactNode;
}

/**
 * ChatInterface — top-level chat UI component.
 * All app-specific strings and endpoints are read from the injected ChatUIConfig.
 * Domain-specific event handling is delegated to the injected StreamEventTransformer.
 */
const ChatInterface: React.FC<ChatInterfaceProps> = ({ config, transformer, renderReport }) => {
  const { messages, isStreaming, isFollowUpMode, error, handleSubmit, resetSession } =
    useChatInterface(config, transformer);

  const placeholder = isFollowUpMode ? config.chatPlaceholder : config.inputPlaceholder;
  const streamingLabel = isFollowUpMode ? config.assistantName + ' is thinking...' : 'Processing...';

  return (
    <div className={styles.chatContainer}>
      <header className={styles.header}>
        <h1>{config.appTitle}</h1>
        <div className={styles.headerRight}>
          {isStreaming && (
            <div className={styles.streamingBadge}>
              <span className={styles.streamingPulse} />
              <span>{streamingLabel}</span>
            </div>
          )}
        </div>
      </header>

      {error && (
        <div className={styles.errorBanner} role="alert">
          <strong>⚠️ Error:</strong> {error}
        </div>
      )}

      <div className={styles.messageArea}>
        {messages.length === 0 ? (
          <div className={styles.placeholder}>
            <div className={styles.placeholderIcon}>💬</div>
            <p>{config.emptyStateMessage}</p>
          </div>
        ) : (
          <MessageList
            messages={messages}
            isStreaming={isStreaming}
            assistantName={config.assistantName}
            renderReport={renderReport}
          />
        )}
      </div>

      <InputArea
        onSubmit={handleSubmit}
        config={config}
        disabled={isStreaming}
        placeholder={placeholder}
        showFileUpload={!isFollowUpMode}
        onNewReview={isFollowUpMode ? resetSession : undefined}
      />
    </div>
  );
};

export default ChatInterface;
