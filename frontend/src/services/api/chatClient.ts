import { API_CONFIG } from '../../config/constants';
import { ApiError } from '../../types';
import type { ChatMessage } from '../../types';
import { createTimeoutSignal } from '../../utils/signal';
import { DEFAULT_TIMEOUT_MS } from './types';

interface ChatRequestOptions {
  signal?: AbortSignal;
  timeout?: number;
}

/**
 * Submit a follow-up chat message for a completed review session.
 * Returns a ReadableStream of NDJSON chunks: { chunk: string } | { status: "complete" | "error" }
 */
export async function submitChat(
  correlationId: string,
  messages: ChatMessage[],
  options: ChatRequestOptions = {},
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
      // FastAPI returns { detail: "..." } on HTTPException
      const message = errorData.detail || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
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
