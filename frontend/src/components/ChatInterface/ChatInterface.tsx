import React from 'react';
import { UI_TEXT } from '../../config/constants';
import { useChatInterface } from './useChatInterface';
import MessageList from '../MessageList';
import InputArea from '../InputArea';
import type { FileAttachment } from '../FileUploader';
import styles from './ChatInterface.module.css';

/**
 * Main chat interface component
 * Displays messages and handles user input with enhanced streaming feedback
 */
const ChatInterface: React.FC = () => {
  const { messages, isStreaming, error, handleSubmit } = useChatInterface();

  const onSubmit = (content: string, attachment?: FileAttachment) => {
    handleSubmit(content, attachment);
  };

  return (
    <div className={styles.chatContainer}>
      <header className={styles.header}>
        <h1>{UI_TEXT.appTitle}</h1>
        <p>{UI_TEXT.appSubtitle}</p>
        {isStreaming && (
          <div className={styles.streamingBadge}>
            <span className={styles.streamingPulse} />
            <span>Processing review...</span>
          </div>
        )}
      </header>

      {error && (
        <div className={styles.errorBanner}>
          <strong>⚠️ Error:</strong> {error}
        </div>
      )}

      <div className={styles.messageArea}>
        {messages.length === 0 ? (
          <div className={styles.placeholder}>
            <div className={styles.placeholderIcon}>💬</div>
            <p>{UI_TEXT.emptyStateMessage}</p>
            <p className={styles.placeholderHint}>
              Submit a design document to get started with your architectural review
            </p>
          </div>
        ) : (
          <MessageList messages={messages} isStreaming={isStreaming} />
        )}
      </div>

      <InputArea onSubmit={onSubmit} disabled={isStreaming} />
    </div>
  );
};

export default ChatInterface;
