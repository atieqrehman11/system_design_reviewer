import { API_CONFIG, ERROR_MESSAGES } from '../../config/constants';
import { ApiError, OutputFormat } from '../../types';
import { createTimeoutSignal } from '../../utils/signal';
import { RequestOptions, DEFAULT_TIMEOUT_MS } from './types';

/**
 * Create request body for review submission
 */
function createRequestBody(designDoc: string, correlationId?: string, outputFormat: OutputFormat = 'markdown') {
  const body: { design_doc: string; correlation_id?: string; output_format: OutputFormat } = {
    design_doc: designDoc,
    output_format: outputFormat,
  };

  if (correlationId) {
    body.correlation_id = correlationId;
  }

  return body;
}

/**
 * Handle fetch errors and convert to ApiError
 */
function handleFetchError(error: unknown): never {
  if (error instanceof ApiError) {
    throw error;
  }

  if (error instanceof Error && error.name === 'AbortError') {
    throw new ApiError('Request was cancelled or timed out');
  }

  if (error instanceof TypeError && error.message.includes('fetch')) {
    throw new ApiError(ERROR_MESSAGES.networkError);
  }

  throw new ApiError(
    error instanceof Error ? error.message : ERROR_MESSAGES.genericError
  );
}

/**
 * Handle HTTP response errors
 */
async function handleResponseError(response: Response): Promise<never> {
  const errorData = await response.json().catch(() => ({}));
  throw new ApiError(
    errorData.message || `HTTP ${response.status}: ${response.statusText}`,
    response.status,
    errorData.error_type
  );
}

/**
 * Submit a design document for review and return the NDJSON stream
 */
export async function submitReview(
  designDoc: string,
  options: RequestOptions = {}
): Promise<ReadableStream<Uint8Array>> {
  const url = `${API_CONFIG.baseUrl}${API_CONFIG.reviewEndpoint}`;
  const { signal: userSignal, timeout = DEFAULT_TIMEOUT_MS, correlationId, outputFormat = 'markdown' } = options;

  const { signal, cleanup } = createTimeoutSignal(userSignal, timeout);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createRequestBody(designDoc, correlationId, outputFormat)),
      signal,
    });

    cleanup();

    if (!response.ok) {
      await handleResponseError(response);
    }

    if (!response.body) {
      throw new ApiError('No response body received from server');
    }

    return response.body;
  } catch (error) {
    cleanup();
    handleFetchError(error);
  }
}
