/**
 * Retry configuration for API calls.
 */
export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
}

/**
 * Request options shared across API call functions.
 */
export interface RequestOptions {
  signal?: AbortSignal;
  timeout?: number;
  outputFormat?: 'markdown' | 'plain' | 'json';
  correlationId?: string;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
};

export const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
