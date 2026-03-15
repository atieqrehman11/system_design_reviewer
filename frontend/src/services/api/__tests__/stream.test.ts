import { parseNDJSONStream } from '../stream';
import { ReviewResponse } from '../../../types';

function createMockStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;

  return new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index]));
        index++;
      } else {
        controller.close();
      }
    },
  });
}

describe('parseNDJSONStream', () => {

  it('should parse valid NDJSON stream and call onEvent for each line', async () => {
    const events: ReviewResponse[] = [];
    const onEvent = jest.fn((event: ReviewResponse) => events.push(event));
    const onError = jest.fn();
    const onComplete = jest.fn();

    const stream = createMockStream([
      '{"message_type":"thinking","message":"Processing"}\n',
      '{"message_type":"result","message":"Done"}\n',
    ]);

    await parseNDJSONStream(stream, onEvent, onError, onComplete);

    expect(onEvent).toHaveBeenCalledTimes(2);
    expect(events).toHaveLength(2);
    expect(events[0].message_type).toBe('thinking');
    expect(events[1].message_type).toBe('result');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('should handle multi-line chunks correctly', async () => {
    const events: ReviewResponse[] = [];
    const onEvent = jest.fn((event: ReviewResponse) => events.push(event));
    const onError = jest.fn();
    const onComplete = jest.fn();

    const stream = createMockStream([
      '{"message":"line1"}\n{"message":"line2"}\n',
      '{"message":"line3"}\n',
    ]);

    await parseNDJSONStream(stream, onEvent, onError, onComplete);

    expect(onEvent).toHaveBeenCalledTimes(3);
    expect(events).toHaveLength(3);
  });

  it('should handle incomplete lines across chunks', async () => {
    const events: ReviewResponse[] = [];
    const onEvent = jest.fn((event: ReviewResponse) => events.push(event));
    const onError = jest.fn();
    const onComplete = jest.fn();

    const stream = createMockStream([
      '{"message":"par',
      't1"}\n{"message":"complete"}\n',
    ]);

    await parseNDJSONStream(stream, onEvent, onError, onComplete);

    expect(onEvent).toHaveBeenCalledTimes(2);
    expect(events[0].message).toBe('part1');
    expect(events[1].message).toBe('complete');
  });

  it('should skip empty lines', async () => {
    const onEvent = jest.fn();
    const onError = jest.fn();
    const onComplete = jest.fn();

    const stream = createMockStream([
      '{"message":"test"}\n\n\n{"message":"test2"}\n',
    ]);

    await parseNDJSONStream(stream, onEvent, onError, onComplete);

    expect(onEvent).toHaveBeenCalledTimes(2);
  });

  it('should continue processing after parse error', async () => {
    const events: ReviewResponse[] = [];
    const onEvent = jest.fn((event: ReviewResponse) => events.push(event));
    const onError = jest.fn();
    const onComplete = jest.fn();

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const stream = createMockStream([
      '{"message":"valid"}\n',
      'invalid json\n',
      '{"message":"also valid"}\n',
    ]);

    await parseNDJSONStream(stream, onEvent, onError, onComplete);

    expect(onEvent).toHaveBeenCalledTimes(2);
    expect(events).toHaveLength(2);
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
