/**
 * Generate a unique message ID using the Web Crypto API.
 * crypto.randomUUID() is available in all modern browsers and Node 14.17+.
 */
export function generateMessageId(): string {
  return `msg_${crypto.randomUUID()}`;
}

/**
 * Generate a unique correlation ID using the Web Crypto API.
 */
export function generateCorrelationId(): string {
  return `corr_${crypto.randomUUID()}`;
}
