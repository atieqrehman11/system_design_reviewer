/**
 * Generic submit-stream hook.
 * Replaces useReviewStream in the core layer — accepts a StreamEventTransformer
 * so the core has no knowledge of domain-specific event shapes.
 */
import { useCallback } from 'react';
import type React from 'react';
import type { Message, StreamEventTransformer } from '../../types/core';
import { MessageType } from '../../types/core';
import { generateMessageId } from '../../utils/id';
import { submitReviewWithRetry } from '../../services/retry';
import { submitReviewWithFile } from '../../services/client';
import { parseNDJSONStream } from '../../services/stream';
import type { FileAttachment } from '../FileUploader/useFileUploader';
import type { ChatUIConfig } from '../../config/ChatUIConfig';
import { mergeAgentResult } from './chatStreamUtils';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface UseSubmitStreamDeps {
  config: ChatUIConfig;
  transformer: StreamEventTransformer<unknown>;
  mergeStrategy: 'replace' | 'append';
  activeCorrelationIdRef: React.MutableRefObject<string | null>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setIsStreaming: React.Dispatch<React.SetStateAction<boolean>>;
  setIsFollowUpMode: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

// ---------------------------------------------------------------------------
// Event handler factory — extracted to avoid deep nesting (SonarQube)
// ---------------------------------------------------------------------------

function makeSubmitEventHandler(
  serverCorrelationId: string,
  transformer: StreamEventTransformer<unknown>,
  mergeStrategy: 'replace' | 'append',
  activeCorrelationIdRef: React.MutableRefObject<string | null>,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  setIsFollowUpMode: React.Dispatch<React.SetStateAction<boolean>>,
): (event: unknown) => void {
  return (event: unknown): void => {
    const message = transformer.transform(event, serverCorrelationId);

    if (mergeStrategy === 'replace') {
      setMessages((prev) => mergeAgentResult(prev, message, serverCorrelationId));
    } else {
      setMessages((prev) => [...prev, message]);
    }

    if (transformer.isComplete(event)) {
      activeCorrelationIdRef.current = serverCorrelationId;
      setIsFollowUpMode(true);
    }
  };
}

// ---------------------------------------------------------------------------
// Async runner — extracted to keep useCallback body shallow
// ---------------------------------------------------------------------------

async function runSubmit(
  content: string,
  attachment: FileAttachment | undefined,
  localCorrelationId: string,
  deps: UseSubmitStreamDeps,
): Promise<void> {
  const {
    config,
    transformer,
    mergeStrategy,
    activeCorrelationIdRef,
    setMessages,
    setIsStreaming,
    setIsFollowUpMode,
    setError,
  } = deps;

  const submitUrl = `${config.apiBaseUrl}${config.submitEndpoint}`;
  const requestOptions = { timeout: 60000, correlationId: localCorrelationId };

  const result = attachment
    ? await submitReviewWithFile(
        attachment.file,
        content,
        `${submitUrl}/upload`,
        requestOptions,
      )
    : await submitReviewWithRetry(
        content,
        submitUrl,
        requestOptions,
        {},
        config.buildSubmitRequestBody,
      );

  const onEvent = makeSubmitEventHandler(
    localCorrelationId,
    transformer,
    mergeStrategy,
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

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useSubmitStream — generic submit-and-stream hook.
 * Delegates all event-to-message conversion to the injected StreamEventTransformer.
 * mergeStrategy controls whether AGENT_RESULT messages replace AGENT_THINKING
 * in-place ('replace') or are always appended ('append').
 */
export function useSubmitStream(deps: UseSubmitStreamDeps) {
  const { setMessages, setIsStreaming, setError } = deps;

  // Empty dep array is intentional: config/transformer are stable at mount;
  // all setters and refs are stable React guarantees — never change identity.
  const startSubmit = useCallback(
    (content: string, attachment: FileAttachment | undefined, localCorrelationId: string) => {
      runSubmit(content, attachment, localCorrelationId, deps).catch((err) => {
        console.error('Submit API error:', err);
        const msg = err instanceof Error ? err.message : 'Failed to submit. Please try again.';
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
    // Empty dep array is safe: config/transformer are stable at mount; setters/refs never change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return { startSubmit };
}
