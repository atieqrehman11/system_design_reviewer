import { useState, useRef, useCallback } from 'react';
import { FILE_UPLOAD_CONFIG, ERROR_MESSAGES } from '../../config/constants';

export interface FileAttachment {
  file: File;
  name: string;
  size: number;
  type: string;
}

/**
 * Validate file type
 */
function isValidFileType(filename: string): boolean {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return FILE_UPLOAD_CONFIG.acceptedFileTypes.includes(extension);
}

/**
 * Validate file size
 */
function isValidFileSize(size: number): boolean {
  return size <= FILE_UPLOAD_CONFIG.maxFileSizeBytes;
}

interface UseFileUploaderProps {
  onFileSelect: (attachment: FileAttachment) => void;
  disabled?: boolean;
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
 * Custom hook for file upload logic
 */
export function useFileUploader({
  onFileSelect,
  disabled = false,
}: UseFileUploaderProps): UseFileUploaderReturn {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = useCallback(
    (file: File) => {
      setError(null);

      // Validate file type
      if (!isValidFileType(file.name)) {
        setError(ERROR_MESSAGES.invalidFileType);
        return;
      }

      // Validate file size
      if (!isValidFileSize(file.size)) {
        setError(ERROR_MESSAGES.fileTooLarge);
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
    [onFileSelect]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
      // Reset input so same file can be selected again
      e.target.value = '';
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
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
    [disabled, handleFileSelect]
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
