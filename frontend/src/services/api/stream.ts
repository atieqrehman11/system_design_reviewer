import { ERROR_MESSAGES } from '../../config/constants';
import {
  ReviewResponse,
  StreamEventHandler,
  StreamErrorHandler,
  StreamCompleteHandler,
} from '../../types';

/**
 * Process a single NDJSON line
 */
function processNDJSONLine(line: string, onEvent: StreamEventHandler): void {
  const trimmedLine = line.trim();
  if (!trimmedLine) return;

  try {
    const event: ReviewResponse = JSON.parse(trimmedLine);
    onEvent(event);
  } catch (parseError) {
    console.error('Failed to parse NDJSON line:', trimmedLine, parseError);
    // Continue processing other lines even if one fails
  }
}

/**
 * Process buffer and extract complete lines
 */
function processBuffer(buffer: string, onEvent: StreamEventHandler): string {
  const lines = buffer.split('\n');
  const remainingBuffer = lines.pop() || '';

  lines.forEach((line) => processNDJSONLine(line, onEvent));

  return remainingBuffer;
}

/**
 * Parse NDJSON stream and invoke handlers for each event
 */
export async function parseNDJSONStream(
  stream: ReadableStream<Uint8Array>,
  onEvent: StreamEventHandler,
  onError: StreamErrorHandler,
  onComplete: StreamCompleteHandler
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        onComplete();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      buffer = processBuffer(buffer, onEvent);
    }
  } catch (error) {
    onError(error instanceof Error ? error : new Error(ERROR_MESSAGES.genericError));
  } finally {
    reader.releaseLock();
  }
}
