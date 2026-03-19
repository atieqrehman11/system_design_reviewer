import { ApiError } from '../types/core';
import type { StreamResult } from '../types/core';
import { createTimeoutSignal } from '../utils/signal';
import type { RequestOptions } from './types';
import { DEFAULT_TIMEOUT_MS } from './types';

// --- Error handlers ---

function handleFetchError(error: unknown): never {
  if (error instanceof ApiError) throw error;
  if (error instanceof Error && error.name === 'AbortError') {
    throw new ApiError('Request was cancelled or timed out');
  }
  if (error instanceof TypeError && error.message.includes('fetch')) {
    throw new ApiError('Unable to connect to the server. Please check your connection.');
  }
  throw new ApiError(error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.');
}

async function handleResponseError(response: Response): Promise<never> {
  const errorData = await response.json().catch(() => ({})) as Record<string, string>;
  throw new ApiError(
    errorData['message'] || `HTTP ${response.status}: ${response.statusText}`,
    response.status,
    errorData['error_type'],
  );
}

// --- Shared fetch executor ---

async function executeRequest(
  url: string,
  init: RequestInit,
  options: RequestOptions,
): Promise<StreamResult> {
  const { signal: userSignal, timeout = DEFAULT_TIMEOUT_MS, correlationId = '' } = options;
  const { signal, cleanup } = createTimeoutSignal(userSignal, timeout);

  const headers = new Headers(init.headers as HeadersInit);
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

/**
 * Submit a design document as JSON text for review.
 * Uses config.apiBaseUrl + config.submitEndpoint as the target URL.
 * If config.buildSubmitRequestBody is provided it is called to build the body;
 * otherwise falls back to { design_doc: content }.
 */
export async function submitReview(
  content: string,
  apiUrl: string,
  options: RequestOptions = {},
  buildBody?: (content: string, correlationId: string) => Record<string, unknown>,
): Promise<StreamResult> {
  const correlationId = options.correlationId ?? '';
  const body = buildBody
    ? buildBody(content, correlationId)
    : { design_doc: content };

  return executeRequest(
    apiUrl,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    options,
  );
}

/**
 * Submit a design document file for review via multipart upload.
 */
export async function submitReviewWithFile(
  file: File,
  content: string,
  apiUrl: string,
  options: RequestOptions = {},
): Promise<StreamResult> {
  const { outputFormat = 'markdown' } = options;

  const formData = new FormData();
  formData.append('file', file);
  if (content) formData.append('design_doc', content);
  formData.append('output_format', outputFormat);

  // No Content-Type header — browser sets multipart boundary automatically
  return executeRequest(apiUrl, { method: 'POST', body: formData }, options);
}
