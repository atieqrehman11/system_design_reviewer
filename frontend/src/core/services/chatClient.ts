import { ApiError } from '../types/core';
import type { ChatMessage } from '../types/core';
import { createTimeoutSignal } from '../utils/signal';
import type { RequestOptions } from './types';
import { DEFAULT_TIMEOUT_MS } from './types';

/**
 * Submit a follow-up chat message and return the response stream.
 * Uses the provided chatApiUrl (apiBaseUrl + chatEndpoint from ChatUIConfig).
 * If buildBody is provided it is called to construct the request body;
 * otherwise falls back to { correlation_id, messages }.
 */
export async function submitChat(
  correlationId: string,
  messages: ChatMessage[],
  chatApiUrl: string,
  options: RequestOptions = {},
  buildBody?: (correlationId: string, messages: ChatMessage[]) => Record<string, unknown>,
): Promise<ReadableStream<Uint8Array>> {
  const { signal: userSignal, timeout = DEFAULT_TIMEOUT_MS } = options;
  const { signal, cleanup } = createTimeoutSignal(userSignal, timeout);

  const body = buildBody
    ? buildBody(correlationId, messages)
    : { correlation_id: correlationId, messages };

  try {
    const response = await fetch(chatApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });

    cleanup();

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as Record<string, string>;
      const message = errorData['message'] || `HTTP ${response.status}: ${response.statusText}`;
      throw new ApiError(message, response.status);
    }

    if (!response.body) {
      throw new ApiError('No response body received from server');
    }

    return response.body;
  } catch (error) {
    cleanup();
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('Request was cancelled or timed out');
    }
    throw new ApiError(error instanceof Error ? error.message : 'Failed to send chat message');
  }
}
