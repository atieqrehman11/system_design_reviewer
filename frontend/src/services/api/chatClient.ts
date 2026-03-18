import { API_CONFIG } from '../../config/constants';
import { ApiError } from '../../types';
import type { ChatMessage } from '../../types';
import { createTimeoutSignal } from '../../utils/signal';
// F3: Use RequestOptions from types instead of a local duplicate interface
import { RequestOptions, DEFAULT_TIMEOUT_MS } from './types';

export async function submitChat(
  correlationId: string,
  messages: ChatMessage[],
  options: RequestOptions = {},
): Promise<ReadableStream<Uint8Array>> {
  const { signal: userSignal, timeout = DEFAULT_TIMEOUT_MS } = options;
  const { signal, cleanup } = createTimeoutSignal(userSignal, timeout);

  try {
    const response = await fetch(
      `${API_CONFIG.baseUrl}${API_CONFIG.chatEndpoint}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correlation_id: correlationId, messages }),
        signal,
      },
    );

    cleanup();

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
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
