/**
 * Pure stream utilities for chat NDJSON processing.
 * No React dependencies — fully testable in isolation.
 */
import type { ChatChunkResponse, Message } from '../../types/core';
import { MessageType } from '../../types/core';

export interface ChatStreamCallbacks {
  onChunk: (snapshot: string) => void;
  onHistoryUpdate: (reply: string) => void;
}

/**
 * Process a single NDJSON line from the chat stream.
 * Returns the updated reply snapshot after appending any new chunk.
 * Throws on status=error events; silently skips blank/malformed lines.
 */
export function processSingleLine(
  line: string,
  currentReply: string,
  onChunk: (snapshot: string) => void,
): string {
  const trimmed = line.trim();
  if (!trimmed) return currentReply;
  try {
    const parsed: ChatChunkResponse = JSON.parse(trimmed);
    if (parsed.status === 'error') throw new Error(parsed.message ?? 'Chat error');
    if (parsed.chunk) {
      const updated = currentReply + parsed.chunk;
      onChunk(updated);
      return updated;
    }
  } catch (parseErr) {
    // Re-throw real domain errors (status=error); swallow JSON parse failures only
    if (parseErr instanceof Error && parseErr.message !== 'Chat error') {
      console.error('Failed to parse chat chunk:', trimmed, parseErr);
    } else {
      throw parseErr;
    }
  }
  return currentReply;
}

/**
 * Process an array of NDJSON lines, accumulating the reply snapshot.
 */
export function processLines(
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

/**
 * Drain a chat response stream, invoking callbacks for each chunk and on completion.
 */
export async function drainChatStream(
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

/**
 * Find the index of the last AGENT_THINKING message for a given agent and correlationId.
 * Returns -1 if no match is found.
 */
export function findLastThinkingIndex(
  messages: Message[],
  agent: string,
  correlationId: string,
): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
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

/**
 * Merge an incoming AGENT_RESULT message into the message list.
 * - If the message is AGENT_RESULT and a matching AGENT_THINKING exists,
 *   replaces it in-place (preserving the original id).
 * - Otherwise appends the message.
 */
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
