/**
 * Handles review submission and NDJSON stream processing.
 * Owns no message state — receives setters from the composing hook.
 */
import { useCallback } from 'react';
import type React from 'react';
import { Message, MessageType, ReviewResponse } from '../../types';
import { generateMessageId } from '../../utils';
import {
  submitReviewWithRetry,
  submitReviewWithFile,
  parseNDJSONStream,
  transformEventToMessage,
} from '../../services/api';
import type { FileAttachment } from '../FileUploader';

function isReviewComplete(event: ReviewResponse): boolean {
  return event.status === 'complete' || event.status === 'completed';
}

function findLastThinkingIndex(
  prev: Message[],
  agent: string,
  correlationId: string,
): number {
  for (let i = prev.length - 1; i >= 0; i--) {
    const m = prev[i];
    if (
      m.correlationId === correlationId &&
      m.agent === agent &&
      m.type === MessageType.AGENT_THINKING
    ) {
      return i;
    }
  }
  return -1;
}

export function mergeAgentResult(
  prev: Message[],
  message: Message,
  correlationId: string,
): Message[] {
  if (message.type !== MessageType.AGENT_RESULT || !message.agent) {
    return [...prev, message];
  }
  const idx = findLastThinkingIndex(prev, message.agent, correlationId);
  if (idx === -1) return [...prev, message];
  const updated = [...prev];
  updated[idx] = { ...message, id: prev[idx].id };
  return updated;
}

export interface UseReviewStreamDeps {
  activeCorrelationIdRef: React.MutableRefObject<string | null>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setIsStreaming: React.Dispatch<React.SetStateAction<boolean>>;
  setIsFollowUpMode: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

// Extracted to avoid deep nesting inside useCallback > run > onEvent
function makeReviewEventHandler(
  serverCorrelationId: string,
  activeCorrelationIdRef: React.MutableRefObject<string | null>,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  setIsFollowUpMode: React.Dispatch<React.SetStateAction<boolean>>,
): (event: ReviewResponse) => void {
  return (event: ReviewResponse): void => {
    const message = transformEventToMessage(event, serverCorrelationId);
    setMessages((prev) => mergeAgentResult(prev, message, serverCorrelationId));
    if (isReviewComplete(event)) {
      activeCorrelationIdRef.current = serverCorrelationId;
      setIsFollowUpMode(true);
    }
  };
}

async function runReview(
  content: string,
  attachment: FileAttachment | undefined,
  localCorrelationId: string,
  deps: UseReviewStreamDeps,
): Promise<void> {
  const { activeCorrelationIdRef, setMessages, setIsStreaming, setIsFollowUpMode, setError } = deps;

  const result = attachment
    ? await submitReviewWithFile(attachment.file, content, { timeout: 60000, correlationId: localCorrelationId })
    : await submitReviewWithRetry(content, { timeout: 60000, correlationId: localCorrelationId });

  const onEvent = makeReviewEventHandler(
    localCorrelationId,
    activeCorrelationIdRef,
    setMessages,
    setIsFollowUpMode,
  );

  await parseNDJSONStream(
    result.stream,
    onEvent,
    (streamError) => {
      console.error('Stream error:', streamError);
      setError(streamError.message || 'Failed to process stream');
      setIsStreaming(false);
    },
    () => setIsStreaming(false),
  );
}

export function useReviewStream(deps: UseReviewStreamDeps) {
  const { setMessages, setIsStreaming, setError } = deps;

  // Empty dep array is intentional: all deps are stable state setters or refs.
  const startReview = useCallback(
    (content: string, attachment: FileAttachment | undefined, localCorrelationId: string) => {
      runReview(content, attachment, localCorrelationId, deps).catch((err) => {
        console.error('Review API error:', err);
        const msg = err instanceof Error ? err.message : 'Failed to submit review. Please try again.';
        setError(msg);
        setMessages((prev) => [
          ...prev,
          {
            id: generateMessageId(),
            type: MessageType.ERROR,
            content: msg,
            timestamp: new Date(),
            correlationId: localCorrelationId,
          },
        ]);
        setIsStreaming(false);
      });
    },
    [],
  );

  return { startReview };
}
