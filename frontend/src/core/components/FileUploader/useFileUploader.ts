import { useState, useRef, useCallback } from 'react';
import type { FileUploadConfig, ErrorMessages } from '../../config/ChatUIConfig';

export interface FileAttachment {
  file: File;
  name: string;
  size: number;
  type: string;
}

/**
 * Validate file type by extracting the extension robustly.
 * Handles files with no extension and dotfiles (e.g. .gitignore).
 */
function isValidFileType(filename: string, acceptedFileTypes: string[]): boolean {
  const lastDot = filename.lastIndexOf('.');
  // No dot, or dot is the first character (dotfile with no real extension)
  if (lastDot <= 0) return false;
  const extension = filename.slice(lastDot).toLowerCase();
  return acceptedFileTypes.includes(extension);
}

/**
 * Validate file size against the configured maximum.
 */
function isValidFileSize(size: number, maxFileSizeBytes: number): boolean {
  return size <= maxFileSizeBytes;
}

interface UseFileUploaderProps {
  onFileSelect: (attachment: FileAttachment) => void;
  disabled?: boolean;
  fileUploadConfig: FileUploadConfig;
  errorMessages: Pick<ErrorMessages, 'fileTooLarge' | 'invalidFileType'>;
}

interface UseFileUploaderReturn {
  fileInputRef: React.RefObject<HTMLInputElement>;
  error: string | null;
  isDragging: boolean;
  handleFileSelect: (file: File) => void;
  handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: () => void;
  handleDrop: (e: React.DragEvent) => void;
  handleButtonClick: () => void;
}

/**
 * Custom hook for file upload logic.
 * Reads validation constraints from the injected config rather than global constants.
 */
export function useFileUploader({
  onFileSelect,
  disabled = false,
  fileUploadConfig,
  errorMessages,
}: UseFileUploaderProps): UseFileUploaderReturn {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = useCallback(
    (file: File) => {
      setError(null);

      if (!isValidFileType(file.name, fileUploadConfig.acceptedFileTypes)) {
        setError(errorMessages.invalidFileType);
        return;
      }

      if (!isValidFileSize(file.size, fileUploadConfig.maxFileSizeBytes)) {
        setError(errorMessages.fileTooLarge);
        return;
      }

      const attachment: FileAttachment = {
        file,
        name: file.name,
        size: file.size,
        type: file.type,
      };

      onFileSelect(attachment);
    },
    [onFileSelect, fileUploadConfig, errorMessages],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
      // Reset input so the same file can be selected again
      e.target.value = '';
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled],
  );

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [disabled, handleFileSelect],
  );

  const handleButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return {
    fileInputRef,
    error,
    isDragging,
    handleFileSelect,
    handleFileInputChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleButtonClick,
  };
}
