import { API_CONFIG, ERROR_MESSAGES } from '../../config/constants';
import { ApiError, OutputFormat } from '../../types';
import { createTimeoutSignal } from '../../utils/signal';
import { RequestOptions, DEFAULT_TIMEOUT_MS, ReviewStreamResult } from './types';

// --- Error handlers ---

function handleFetchError(error: unknown): never {
  if (error instanceof ApiError) throw error;
  if (error instanceof Error && error.name === 'AbortError') {
    throw new ApiError('Request was cancelled or timed out');
  }
  if (error instanceof TypeError && error.message.includes('fetch')) {
    throw new ApiError(ERROR_MESSAGES.networkError);
  }
  throw new ApiError(error instanceof Error ? error.message : ERROR_MESSAGES.genericError);
}

async function handleResponseError(response: Response): Promise<never> {
  const errorData = await response.json().catch(() => ({}));
  throw new ApiError(
    errorData.message || `HTTP ${response.status}: ${response.statusText}`,
    response.status,
    errorData.error_type,
  );
}

// --- Shared fetch executor ---

async function executeRequest(
  url: string,
  init: RequestInit,
  options: RequestOptions,
): Promise<ReviewStreamResult> {
  const { signal: userSignal, timeout = DEFAULT_TIMEOUT_MS, correlationId = '' } = options;
  const { signal, cleanup } = createTimeoutSignal(userSignal, timeout);

  const headers = new Headers(init.headers);
  if (correlationId) {
    headers.set('X-Correlation-ID', correlationId);
  }

  try {
    const response = await fetch(url, { ...init, headers, signal });
    cleanup();

    if (!response.ok) await handleResponseError(response);
    if (!response.body) throw new ApiError('No response body received from server');

    return { stream: response.body, correlationId };
  } catch (error) {
    cleanup();
    handleFetchError(error);
  }
}

// --- Public API ---

/**
 * Submit a design document as JSON text for review.
 */
export async function submitReview(
  designDoc: string,
  options: RequestOptions = {},
): Promise<ReviewStreamResult> {
  const { outputFormat = 'markdown' } = options;

  const body: { design_doc: string; output_format: OutputFormat } = {
    design_doc: designDoc,
    output_format: outputFormat,
  };

  return executeRequest(
    `${API_CONFIG.baseUrl}${API_CONFIG.reviewEndpoint}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    options,
  );
}

/**
 * Submit a design document file for review via multipart upload.
 */
export async function submitReviewWithFile(
  file: File,
  designDoc: string,
  options: RequestOptions = {},
): Promise<ReviewStreamResult> {
  const { outputFormat = 'markdown' } = options;

  const formData = new FormData();
  formData.append('file', file);
  if (designDoc) formData.append('design_doc', designDoc);
  formData.append('output_format', outputFormat);

  // No Content-Type header — browser sets multipart boundary automatically
  return executeRequest(
    `${API_CONFIG.baseUrl}${API_CONFIG.reviewEndpoint}/upload`,
    { method: 'POST', body: formData },
    options,
  );
}

