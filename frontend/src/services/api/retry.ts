import { ERROR_MESSAGES } from '../../config/constants';
import { ApiError } from '../../types';
import { submitReview } from './client';
import { RequestOptions, RetryConfig, DEFAULT_RETRY_CONFIG, ReviewStreamResult } from './types';

/**
 * Check if error should be retried
 */
function shouldRetryError(error: unknown): boolean {
  // Don't retry on client errors (4xx)
  if (
    error instanceof ApiError &&
    error.statusCode &&
    error.statusCode >= 400 &&
    error.statusCode < 500
  ) {
    return false;
  }

  // Don't retry if request was aborted
  if (error instanceof Error && error.name === 'AbortError') {
    return false;
  }

  return true;
}

/**
 * Calculate retry delay with exponential backoff
 */
function calculateRetryDelay(attempt: number, config: RetryConfig): number {
  return config.delayMs * Math.pow(config.backoffMultiplier, attempt - 1);
}

/**
 * Log retry attempt in development mode
 */
function logRetryAttempt(attempt: number, delay: number): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`Retry attempt ${attempt} after ${delay}ms`);
  }
}

/**
 * Submit review with retry logic
 */
export async function submitReviewWithRetry(
  designDoc: string,
  options: RequestOptions = {},
  retryConfig: Partial<RetryConfig> = {}
): Promise<ReviewStreamResult> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  let lastError: Error = new Error(ERROR_MESSAGES.genericError);

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await submitReview(designDoc, options);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(ERROR_MESSAGES.genericError);

      if (!shouldRetryError(error)) {
        throw error;
      }

      if (attempt === config.maxAttempts) {
        throw lastError;
      }

      const delay = calculateRetryDelay(attempt, config);
      logRetryAttempt(attempt, delay);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
