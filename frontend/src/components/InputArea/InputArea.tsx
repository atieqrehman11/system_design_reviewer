import React from 'react';
import { UI_TEXT } from '../../config/constants';
import FileUploader, { type FileAttachment, formatFileSize } from '../FileUploader';
import { useInputArea, MAX_CHARS } from './useInputArea';
import styles from './InputArea.module.css';

export interface InputAreaProps {
  onSubmit: (content: string, attachment?: FileAttachment) => void;
  disabled?: boolean;
  placeholder?: string;
  showFileUpload?: boolean;
  onNewReview?: () => void;
}

/**
 * InputArea component
 * Handles text input and file attachments
 */
const InputArea: React.FC<InputAreaProps> = ({
  onSubmit,
  disabled = false,
  placeholder = UI_TEXT.inputPlaceholder,
  showFileUpload = true,
  onNewReview,
}) => {
  const {
    inputValue,
    attachment,
    textareaRef,
    charCount,
    isOverLimit,
    canSubmit,
    setInputValue,
    handleSubmit,
    handleKeyDown,
    handleFileSelect,
    handleRemoveAttachment,
  } = useInputArea({ onSubmit, disabled });

  return (
    <div className={styles.inputContainer}>
      {attachment && (
        <div className={styles.attachmentPreview}>
          <div className={styles.attachmentInfo}>
            <span className={styles.attachmentIcon}>📎</span>
            <div className={styles.attachmentDetails}>
              <div className={styles.attachmentName}>{attachment.name}</div>
              <div className={styles.attachmentSize}>{formatFileSize(attachment.size)}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemoveAttachment}
            className={styles.removeButton}
            disabled={disabled}
          >
            ✕
          </button>
        </div>
      )}

      <div className={styles.inputRow}>
        <div className={styles.textareaWrapper}>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            maxLength={MAX_CHARS + 100}
          />
          <div
            className={`${styles.charCount} ${isOverLimit ? styles.charCountWarning : ''}`}
          >
            {charCount} / {MAX_CHARS} characters
          </div>
        </div>

        <div className={styles.buttonGroup}>
          {onNewReview && (
            <button
              type="button"
              onClick={onNewReview}
              className={styles.newReviewButton}
              aria-label="Start a new review"
              title="New review"
            >
              ↺
            </button>
          )}
          {showFileUpload && (
            <FileUploader onFileSelect={handleFileSelect} disabled={disabled} />
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={styles.submitButton}
            aria-label="Send message"
          >
            {disabled ? '⏳' : '↑'}
          </button>
        </div>
      </div>

      <div className={styles.hint}>
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  );
};

export default InputArea;

