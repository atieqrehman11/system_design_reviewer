import { OutputFormat } from '../../types';

/**
 * Retry configuration interface
 */
export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
}

/**
 * Request options for API calls
 */
export interface RequestOptions {
  signal?: AbortSignal;
  timeout?: number;
  outputFormat?: OutputFormat;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
};

export const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Result returned by review submission functions, containing the
 * raw response stream and the server-assigned correlation ID.
 */
export interface ReviewStreamResult {
  stream: ReadableStream<Uint8Array>;
  correlationId: string;
}

// Constants for event types
export const EVENT_TYPES = {
  THINKING: 'thinking',
  RESULT: 'result',
} as const;

export const EVENT_STATUS = {
  COMPLETE: 'complete',
} as const;
