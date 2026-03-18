/**
 * Pure stream utilities for chat NDJSON processing.
 * No React dependencies — fully testable in isolation.
 */
import { ChatChunkResponse } from '../../types';

export interface ChatStreamCallbacks {
  onChunk: (snapshot: string) => void;
  onHistoryUpdate: (reply: string) => void;
}

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
    // Re-throw real errors (e.g. status=error); only swallow JSON parse failures
    if (parseErr instanceof Error && parseErr.message !== 'Chat error') {
      console.error('Failed to parse chat chunk:', trimmed, parseErr);
    } else {
      throw parseErr;
    }
  }
  return currentReply;
}

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
