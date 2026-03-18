/**
 * Thin composing hook — owns shared state and delegates stream logic
 * to useReviewStream and useChatStream.
 */
import { useState, useCallback, useRef } from 'react';
import { Message, MessageType, ChatMessage } from '../../types';
import { generateCorrelationId, generateMessageId } from '../../utils';
import type { FileAttachment } from '../FileUploader';
import { useReviewStream } from './useReviewStream';
import { useChatStream } from './useChatStream';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface UseChatInterfaceReturn {
  messages: Message[];
  isStreaming: boolean;
  isFollowUpMode: boolean;
  error: string | null;
  handleSubmit: (content: string, attachment?: FileAttachment) => void;
  clearError: () => void;
  resetSession: () => void;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function buildDisplayContent(content: string, attachment?: FileAttachment): string {
  if (!attachment) return content;
  return content
    ? `${content}\n\n📎 Attachment: ${attachment.name}`
    : `📎 Attachment: ${attachment.name}`;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useChatInterface(): UseChatInterfaceReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isFollowUpMode, setIsFollowUpMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // null = review mode; set to correlationId once a review completes
  const activeCorrelationIdRef = useRef<string | null>(null);
  // Conversation history forwarded to the LLM on each follow-up turn
  const chatHistoryRef = useRef<ChatMessage[]>([]);

  const { startReview } = useReviewStream({
    activeCorrelationIdRef,
    setMessages,
    setIsStreaming,
    setIsFollowUpMode,
    setError,
  });

  const { startChat } = useChatStream({
    chatHistoryRef,
    setMessages,
    setIsStreaming,
  });

  const clearError = useCallback(() => setError(null), []);

  const resetSession = useCallback(() => {
    activeCorrelationIdRef.current = null;
    chatHistoryRef.current = [];
    setIsFollowUpMode(false);
    setMessages([]);
    setError(null);
  }, []);

  const handleSubmit = useCallback(
    (content: string, attachment?: FileAttachment) => {
      setError(null);
      setIsStreaming(true);

      const correlationId = activeCorrelationIdRef.current ?? generateCorrelationId();

      setMessages((prev) => [
        ...prev,
        {
          id: generateMessageId(),
          type: MessageType.USER,
          content: buildDisplayContent(content, attachment),
          timestamp: new Date(),
          correlationId,
        },
      ]);

      if (activeCorrelationIdRef.current === null) {
        startReview(content, attachment, correlationId);
      } else {
        startChat(content, correlationId);
      }
    },
    [startReview, startChat],
  );

  return { messages, isStreaming, isFollowUpMode, error, handleSubmit, clearError, resetSession };
}
