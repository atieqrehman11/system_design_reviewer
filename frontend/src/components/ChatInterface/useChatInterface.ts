import { useState, useCallback } from 'react';
import { Message, MessageType } from '../../types';
import { generateCorrelationId, generateMessageId } from '../../utils';
import {
  submitReviewWithRetry,
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
 * Read file content as text for text-based files
 */
async function readFileContent(file: File): Promise<string> {
  // For text files, read content directly
  if (file.type.includes('text') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
    return await file.text();
  }
  // For other files (PDF, DOC), we'll just send the filename
  // Backend should handle file processing
  return `[File: ${file.name}]`;
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
        // Prepare content for API
        let apiContent = content;
        if (attachment) {
          const fileContent = await readFileContent(attachment.file);
          apiContent = content
            ? `${content}\n\nFile: ${attachment.name}\n${fileContent}`
            : fileContent;
        }

        // Submit to API with retry logic
        const stream = await submitReviewWithRetry(apiContent, {
          correlationId,
          timeout: 60000, // 60 second timeout
        });

        // Parse NDJSON stream
        await parseNDJSONStream(
          stream,
          // onEvent: Handle each event from the stream
          (event) => {
            const message = transformEventToMessage(event, correlationId);
            console.log('Received message:', message.type, message.agent, 'has report:', !!message.report);
            
            setMessages((prev) => {
              // Check if we should update an existing message or add a new one
              // If this is a result, try to update the most recent thinking message from the same agent
              if (message.type === MessageType.AGENT_RESULT && message.agent) {
                // Find the last thinking message from this agent in this correlation
                let existingIndex = -1;
                for (let i = prev.length - 1; i >= 0; i--) {
                  if (
                    prev[i].correlationId === correlationId &&
                    prev[i].agent === message.agent &&
                    prev[i].type === MessageType.AGENT_THINKING
                  ) {
                    existingIndex = i;
                    console.log('Found matching thinking message at index:', i, 'for agent:', message.agent);
                    break;
                  }
                }

                if (existingIndex !== -1) {
                  // Update the existing thinking message to result
                  console.log('Updating thinking message to result');
                  const updated = [...prev];
                  updated[existingIndex] = {
                    ...message,
                    id: prev[existingIndex].id, // Keep the same ID for smooth transition
                  };
                  return updated;
                } else {
                  console.log('No matching thinking message found, adding as new');
                }
              }

              // Otherwise, add as new message
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
