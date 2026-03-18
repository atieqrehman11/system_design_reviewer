import { useState, useCallback, useRef } from 'react';
import type React from 'react';
import { Message, MessageType, ChatMessage, ReviewResponse } from '../../types';
import { generateCorrelationId, generateMessageId } from '../../utils';
import {
  submitReviewWithRetry,
  submitReviewWithFile,
  parseNDJSONStream,
  transformEventToMessage,
  submitChat,
} from '../../services/api';
import type { ReviewStreamResult } from '../../services/api';
import type { FileAttachment } from '../FileUploader';

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
// Pure helpers — module-level to avoid deep nesting inside callbacks
// ---------------------------------------------------------------------------

function buildDisplayContent(content: string, attachment?: FileAttachment): string {
  if (!attachment) return content;
  return content
    ? `${content}\n\n📎 Attachment: ${attachment.name}`
    : `📎 Attachment: ${attachment.name}`;
}

function extractErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
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

function mergeAgentResult(
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

function isReviewComplete(event: ReviewResponse): boolean {
  return event.status === 'complete' || event.status === 'completed';
}

function applyChunkToMessage(
  prev: Message[],
  msgId: string,
  snapshot: string,
): Message[] {
  return prev.map((m): Message =>
    m.id === msgId ? { ...m, type: MessageType.AGENT_RESULT, content: snapshot } : m,
  );
}

function applyErrorToMessage(
  prev: Message[],
  msgId: string,
  errorText: string,
): Message[] {
  return prev.map((m): Message =>
    m.id === msgId ? { ...m, type: MessageType.ERROR, content: errorText } : m,
  );
}

interface ChatStreamCallbacks {
  onChunk: (snapshot: string) => void;
  onHistoryUpdate: (reply: string) => void;
}

async function drainChatStream(
  stream: ReadableStream<Uint8Array>,
  callbacks: ChatStreamCallbacks,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let assistantReply = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      assistantReply = processLines(lines, assistantReply, callbacks.onChunk);
    }
  } finally {
    reader.releaseLock();
  }

  if (assistantReply) {
    callbacks.onHistoryUpdate(assistantReply);
  }
}

function processLines(
  lines: string[],
  currentReply: string,
  onChunk: (snapshot: string) => void,
): string {
  let reply = currentReply;
  for (const line of lines) {
    reply = processSingleLine(line, reply, onChunk);
  }
  return reply;
}

function processSingleLine(
  line: string,
  currentReply: string,
  onChunk: (snapshot: string) => void,
): string {
  const trimmed = line.trim();
  if (!trimmed) return currentReply;
  try {
    const parsed: { chunk?: string; status?: string; message?: string } = JSON.parse(trimmed);
    if (parsed.status === 'error') throw new Error(parsed.message ?? 'Chat error');
    if (parsed.chunk) {
      const updated = currentReply + parsed.chunk;
      onChunk(updated);
      return updated;
    }
  } catch (parseErr) {
    console.error('Failed to parse chat chunk:', trimmed, parseErr);
  }
  return currentReply;
}

// Builds the onEvent handler for parseNDJSONStream — extracted to reduce nesting depth
function makeReviewEventHandler(
  correlationId: string,
  activeCorrelationIdRef: React.MutableRefObject<string | null>,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  setIsFollowUpMode: React.Dispatch<React.SetStateAction<boolean>>,
) {
  return (event: ReviewResponse) => {
    const message = transformEventToMessage(event, correlationId);
    setMessages((prev) => mergeAgentResult(prev, message, correlationId));
    if (isReviewComplete(event)) {
      activeCorrelationIdRef.current = correlationId;
      setIsFollowUpMode(true);
    }
  };
}

// Builds the ChatStreamCallbacks for drainChatStream — extracted to reduce nesting depth
function makeChatStreamCallbacks(
  assistantMsgId: string,
  chatHistoryRef: React.MutableRefObject<ChatMessage[]>,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
): ChatStreamCallbacks {
  return {
    onChunk: (snapshot) => {
      setMessages((prev) => applyChunkToMessage(prev, assistantMsgId, snapshot));
    },
    onHistoryUpdate: (reply) => {
      chatHistoryRef.current = [...chatHistoryRef.current, { role: 'assistant', content: reply }];
    },
  };
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

  const clearError = useCallback(() => setError(null), []);

  const resetSession = useCallback(() => {
    activeCorrelationIdRef.current = null;
    chatHistoryRef.current = [];
    setIsFollowUpMode(false);
    setMessages([]);
    setError(null);
  }, []);

  // --- Review stream ---
  const handleReviewSubmit = useCallback(
    (content: string, attachment: FileAttachment | undefined, localCorrelationId: string) => {
      (async () => {
        try {
          const result: ReviewStreamResult = attachment
            ? await submitReviewWithFile(attachment.file, content, { timeout: 60000 })
            : await submitReviewWithRetry(content, { timeout: 60000 });

          // Use the server-assigned correlation_id from X-Task-ID header — this is
          // what was saved to SQLite, so follow-up chat must use the same value.
          const serverCorrelationId = result.correlationId || localCorrelationId;

          const onEvent = makeReviewEventHandler(
            serverCorrelationId,
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
        } catch (err) {
          console.error('Review API error:', err);
          const msg = extractErrorMessage(err, 'Failed to submit review. Please try again.');
          setError(msg);
          setMessages((prev) => [
            ...prev,
            { id: generateMessageId(), type: MessageType.ERROR, content: msg, timestamp: new Date(), correlationId: localCorrelationId },
          ]);
          setIsStreaming(false);
        }
      })();
    },
    [],
  );

  // --- Chat stream ---
  const handleChatSubmit = useCallback(
    (content: string, correlationId: string) => {
      chatHistoryRef.current = [...chatHistoryRef.current, { role: 'user', content }];

      const assistantMsgId = generateMessageId();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          type: MessageType.AGENT_THINKING,
          content: '',
          agent: 'Architect Assistant',
          timestamp: new Date(),
          correlationId,
        },
      ]);

      (async () => {
        try {
          const stream = await submitChat(correlationId, chatHistoryRef.current, { timeout: 30000 });
          const callbacks = makeChatStreamCallbacks(assistantMsgId, chatHistoryRef, setMessages);
          await drainChatStream(stream, callbacks);
          setIsStreaming(false);
        } catch (err) {
          console.error('Chat error:', err);
          const msg = extractErrorMessage(err, 'Failed to get a response. Please try again.');
          // Show error inline in the message bubble only — no redundant banner
          setMessages((prev) => applyErrorToMessage(prev, assistantMsgId, msg));
          setIsStreaming(false);
        }
      })();
    },
    [],
  );

  // --- Unified submit ---
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
        handleReviewSubmit(content, attachment, correlationId);
      } else {
        handleChatSubmit(content, correlationId);
      }
    },
    [handleReviewSubmit, handleChatSubmit],
  );

  return { messages, isStreaming, isFollowUpMode, error, handleSubmit, clearError, resetSession };
}
