import React from 'react';
import { UI_TEXT } from '../../config/constants';
import { useChatInterface } from './useChatInterface';
import MessageList from '../MessageList';
import InputArea from '../InputArea';
import type { FileAttachment } from '../FileUploader';
import styles from './ChatInterface.module.css';

const ChatInterface: React.FC = () => {
  const { messages, isStreaming, isFollowUpMode, error, handleSubmit, resetSession } =
    useChatInterface();

  const onSubmit = (content: string, attachment?: FileAttachment) => {
    handleSubmit(content, attachment);
  };

  return (
    <div className={styles.chatContainer}>
      <header className={styles.header}>
        <h1>{UI_TEXT.appTitle}</h1>
        <div className={styles.headerRight}>
          {isStreaming && (
            <div className={styles.streamingBadge}>
              <span className={styles.streamingPulse} />
              <span>{isFollowUpMode ? 'Thinking...' : 'Processing...'}</span>
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
            <p>{UI_TEXT.emptyStateMessage}</p>
            
          </div>
        ) : (
          <MessageList messages={messages} isStreaming={isStreaming} />
        )}
      </div>

      <InputArea
        onSubmit={onSubmit}
        disabled={isStreaming}
        placeholder={isFollowUpMode ? UI_TEXT.chatPlaceholder : UI_TEXT.inputPlaceholder}
        showFileUpload={!isFollowUpMode}
        onNewReview={isFollowUpMode ? resetSession : undefined}
      />
    </div>
  );
};

export default ChatInterface;
