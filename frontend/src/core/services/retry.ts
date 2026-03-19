import { ApiError } from '../types/core';
import type { StreamResult } from '../types/core';
import { submitReview } from './client';
import type { RequestOptions, RetryConfig } from './types';
import { DEFAULT_RETRY_CONFIG } from './types';

/**
 * Determine whether an error warrants a retry attempt.
 * Client errors (4xx) and aborted requests are not retried.
 */
function shouldRetryError(error: unknown): boolean {
  if (
    error instanceof ApiError &&
    error.statusCode !== undefined &&
    error.statusCode >= 400 &&
    error.statusCode < 500
  ) {
    return false;
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return false;
  }
  return true;
}

/**
 * Calculate retry delay using exponential backoff.
 */
function calculateRetryDelay(attempt: number, config: RetryConfig): number {
  return config.delayMs * Math.pow(config.backoffMultiplier, attempt - 1);
}

/**
 * Log a retry attempt in development mode only.
 */
function logRetryAttempt(attempt: number, delay: number): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`Retry attempt ${attempt} after ${delay}ms`);
  }
}

/**
 * Submit a review with exponential-backoff retry logic.
 * Delegates to submitReview for the actual HTTP call.
 */
export async function submitReviewWithRetry(
  content: string,
  apiUrl: string,
  options: RequestOptions = {},
  retryConfig: Partial<RetryConfig> = {},
  buildBody?: (content: string, correlationId: string) => Record<string, unknown>,
): Promise<StreamResult> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  let lastError: Error = new Error('An unexpected error occurred. Please try again.');

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await submitReview(content, apiUrl, options, buildBody);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('An unexpected error occurred. Please try again.');

      if (!shouldRetryError(error)) {
        throw error;
      }

      if (attempt === config.maxAttempts) {
        throw lastError;
      }

      const delay = calculateRetryDelay(attempt, config);
      logRetryAttempt(attempt, delay);
      await new Promise<void>((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
