import React from 'react';
import type { ChatUIConfig } from '../../config/ChatUIConfig';
import { useFileUploader } from './useFileUploader';
import type { FileAttachment } from './useFileUploader';
import styles from './FileUploader.module.css';

interface FileUploaderProps {
  onFileSelect: (attachment: FileAttachment) => void;
  config: ChatUIConfig;
  disabled?: boolean;
  showDropZone?: boolean;
}

/**
 * FileUploader component — handles file selection and validation.
 * Reads accepted types and size limits from the injected ChatUIConfig.
 */
const FileUploader: React.FC<FileUploaderProps> = ({
  onFileSelect,
  config,
  disabled = false,
  showDropZone = false,
}) => {
  const {
    fileInputRef,
    error,
    isDragging,
    handleFileInputChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleButtonClick,
  } = useFileUploader({
    onFileSelect,
    disabled,
    fileUploadConfig: config.fileUpload,
    errorMessages: config.errorMessages,
  });

  const acceptAttr = config.fileUpload.acceptedFileTypes.join(',');

  if (showDropZone) {
    return (
      <div>
        <button
          type="button"
          className={`${styles.dropZone} ${isDragging ? styles.dropZoneActive : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleButtonClick}
          disabled={disabled}
        >
          <div className={styles.dropZoneIcon}>📁</div>
          <p className={styles.dropZoneText}>
            Drag and drop a file here, or click to select
          </p>
          <p className={styles.dropZoneText}>
            Supported: {config.fileUpload.acceptedFileTypes.join(', ')} (max{' '}
            {config.fileUpload.maxFileSizeMB}MB)
          </p>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptAttr}
          onChange={handleFileInputChange}
          disabled={disabled}
          className={styles.hiddenInput}
        />
        {error && <div className={styles.errorMessage}>{error}</div>}
      </div>
    );
  }

  return (
    <div className={styles.fileUploader}>
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={disabled}
        className={styles.uploadButton}
        aria-label="Attach file"
        title={`Attach file (${config.fileUpload.acceptedFileTypes.join(', ')})`}
      >
        📎
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptAttr}
        onChange={handleFileInputChange}
        disabled={disabled}
        className={styles.hiddenInput}
      />
      {error && <div className={styles.errorMessage}>{error}</div>}
    </div>
  );
};

export default FileUploader;
