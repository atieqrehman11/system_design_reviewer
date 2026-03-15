/**
 * API Service - Public exports
 * 
 * This module provides the main API for interacting with the backend review service.
 * It handles HTTP requests, stream processing, and event transformation.
 */

// Export main API functions
export { submitReview } from './client';
export { parseNDJSONStream } from './stream';
export { transformEventToMessage } from './transformer';
export { submitReviewWithRetry } from './retry';

// Export types
export type { RetryConfig, RequestOptions } from './types';
export { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_MS } from './types';
