import { useState, useRef, useCallback } from 'react';
import type { FileAttachment } from '../FileUploader/useFileUploader';

export const MAX_CHARS = 10000;

interface UseInputAreaProps {
  onSubmit: (content: string, attachment?: FileAttachment) => void;
  disabled?: boolean;
}

interface UseInputAreaReturn {
  inputValue: string;
  attachment: FileAttachment | null;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  charCount: number;
  isOverLimit: boolean;
  canSubmit: boolean;
  setInputValue: (value: string) => void;
  handleSubmit: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleFileSelect: (file: FileAttachment) => void;
  handleRemoveAttachment: () => void;
}

/**
 * Custom hook for input area logic.
 * Owns text input state, attachment state, and submit/keyboard handlers.
 */
export function useInputArea({
  onSubmit,
  disabled = false,
}: UseInputAreaProps): UseInputAreaReturn {
  const [inputValue, setInputValue] = useState('');
  const [attachment, setAttachment] = useState<FileAttachment | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmedValue = inputValue.trim();
    if ((trimmedValue || attachment) && !disabled) {
      onSubmit(trimmedValue, attachment ?? undefined);
      setInputValue('');
      setAttachment(null);
      textareaRef.current?.focus();
    }
  }, [inputValue, attachment, disabled, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleFileSelect = useCallback((file: FileAttachment) => {
    setAttachment(file);
    textareaRef.current?.focus();
  }, []);

  const handleRemoveAttachment = useCallback(() => {
    setAttachment(null);
  }, []);

  const charCount = inputValue.length;
  const isOverLimit = charCount > MAX_CHARS;
  const canSubmit =
    (inputValue.trim().length > 0 || Boolean(attachment)) && !isOverLimit && !disabled;

  return {
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
  };
}
