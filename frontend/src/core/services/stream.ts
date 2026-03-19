import type {
  StreamEventHandler,
  StreamErrorHandler,
  StreamCompleteHandler,
} from '../types/core';

/**
 * Process a single NDJSON line, invoking onEvent for valid JSON.
 * Silently skips blank lines; logs and skips malformed lines.
 */
function processNDJSONLine<TEvent>(
  line: string,
  onEvent: StreamEventHandler<TEvent>,
): void {
  const trimmedLine = line.trim();
  if (!trimmedLine) return;

  try {
    const event = JSON.parse(trimmedLine) as TEvent;
    onEvent(event);
  } catch (parseError) {
    console.error('Failed to parse NDJSON line:', trimmedLine, parseError);
    // Continue processing other lines even if one fails
  }
}

/**
 * Flush all complete lines from the buffer, returning the remaining partial line.
 */
function processBuffer<TEvent>(
  buffer: string,
  onEvent: StreamEventHandler<TEvent>,
): string {
  const lines = buffer.split('\n');
  const remainingBuffer = lines.pop() ?? '';
  lines.forEach((line) => processNDJSONLine(line, onEvent));
  return remainingBuffer;
}

/**
 * Parse an NDJSON stream and invoke handlers for each event.
 * onComplete is always called — even when onError fires — via the finally block.
 */
export async function parseNDJSONStream<TEvent>(
  stream: ReadableStream<Uint8Array>,
  onEvent: StreamEventHandler<TEvent>,
  onError: StreamErrorHandler,
  onComplete: StreamCompleteHandler,
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
    onError(error instanceof Error ? error : new Error('An unexpected stream error occurred'));
    onComplete();
  } finally {
    reader.releaseLock();
  }
}
