import React from 'react';
import { FILE_UPLOAD_CONFIG } from '../../config/constants';
import { useFileUploader } from './useFileUploader';
import type { FileAttachment } from './useFileUploader';
import styles from './FileUploader.module.css';

interface FileUploaderProps {
  onFileSelect: (attachment: FileAttachment) => void;
  disabled?: boolean;
  showDropZone?: boolean;
}

/**
 * FileUploader component
 * Handles file selection and validation
 */
const FileUploader: React.FC<FileUploaderProps> = ({
  onFileSelect,
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
  } = useFileUploader({ onFileSelect, disabled });

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
            Supported: {FILE_UPLOAD_CONFIG.acceptedFileTypes.join(', ')} (max{' '}
            {FILE_UPLOAD_CONFIG.maxFileSizeMB}MB)
          </p>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={FILE_UPLOAD_CONFIG.acceptedFileTypes.join(',')}
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
        title="Attach file (.txt, .md, .json)"
      >
        📎
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept={FILE_UPLOAD_CONFIG.acceptedFileTypes.join(',')}
        onChange={handleFileInputChange}
        disabled={disabled}
        className={styles.hiddenInput}
      />
      {error && <div className={styles.errorMessage}>{error}</div>}
    </div>
  );
};

export default FileUploader;


