import { useState, useCallback } from 'react';
import { Message, MessageType } from '../../types';
import { generateCorrelationId, generateMessageId } from '../../utils';
import {
  submitReviewWithRetry,
  submitReviewWithFile,
  parseNDJSONStream,
  transformEventToMessage,
} from '../../services/api';
import type { FileAttachment } from '../FileUploader';

interface UseChatInterfaceReturn {
  messages: Message[];
  isStreaming: boolean;
  error: string | null;
  handleSubmit: (content: string, attachment?: FileAttachment) => void;
  clearError: () => void;
}

/**
 * Custom hook for managing chat interface state and logic
 */
export function useChatInterface(): UseChatInterfaceReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleSubmit = useCallback((content: string, attachment?: FileAttachment) => {
    const correlationId = generateCorrelationId();
    setError(null);

    // Build message content for display
    let messageContent = content;
    if (attachment) {
      messageContent = content
        ? `${content}\n\n📎 Attachment: ${attachment.name}`
        : `📎 Attachment: ${attachment.name}`;
    }

    // Add user message
    const userMessage: Message = {
      id: generateMessageId(),
      type: MessageType.USER,
      content: messageContent,
      timestamp: new Date(),
      correlationId,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);

    // Execute API call asynchronously
    (async () => {
      try {
        // Route to upload endpoint if file attached, otherwise use JSON endpoint
        const stream = attachment
          ? await submitReviewWithFile(attachment.file, content, {
              correlationId,
              timeout: 60000,
            })
          : await submitReviewWithRetry(content, {
              correlationId,
              timeout: 60000,
            });

        // Parse NDJSON stream
        await parseNDJSONStream(
          stream,
          // onEvent: Handle each event from the stream
          (event) => {
            const message = transformEventToMessage(event, correlationId);

            setMessages((prev) => {
              if (message.type === MessageType.AGENT_RESULT && message.agent) {
                let existingIndex = -1;
                for (let i = prev.length - 1; i >= 0; i--) {
                  if (
                    prev[i].correlationId === correlationId &&
                    prev[i].agent === message.agent &&
                    prev[i].type === MessageType.AGENT_THINKING
                  ) {
                    existingIndex = i;
                    break;
                  }
                }

                if (existingIndex !== -1) {
                  const updated = [...prev];
                  updated[existingIndex] = { ...message, id: prev[existingIndex].id };
                  return updated;
                }
              }
              return [...prev, message];
            });
          },
          // onError: Handle stream errors
          (streamError) => {
            console.error('Stream error:', streamError);
            setError(streamError.message || 'Failed to process stream');
            setIsStreaming(false);
          },
          // onComplete: Stream finished
          () => {
            setIsStreaming(false);
          }
        );
      } catch (err) {
        console.error('API error:', err);
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to submit review. Please try again.';
        setError(errorMessage);

        // Add error message to chat
        const errorMsg: Message = {
          id: generateMessageId(),
          type: MessageType.ERROR,
          content: errorMessage,
          timestamp: new Date(),
          correlationId,
        };
        setMessages((prev) => [...prev, errorMsg]);
        setIsStreaming(false);
      }
    })();
  }, []);

  return {
    messages,
    isStreaming,
    error,
    handleSubmit,
    clearError,
  };
}
