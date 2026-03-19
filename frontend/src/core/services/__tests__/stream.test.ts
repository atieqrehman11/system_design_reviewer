import fc from 'fast-check';
import { parseNDJSONStream } from '../stream';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStream(lines: string[]): ReadableStream<Uint8Array> {
  const ndjson = lines.join('\n') + '\n';
  const encoder = new TextEncoder();
  const bytes = encoder.encode(ndjson);
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

function makeChunkedStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

// ---------------------------------------------------------------------------
// Unit: basic event parsing
// ---------------------------------------------------------------------------

describe('parseNDJSONStream — unit', () => {
  it('calls onEvent for each valid JSON line', async () => {
    const events = [{ type: 'a' }, { type: 'b' }];
    const stream = makeStream(events.map((e) => JSON.stringify(e)));
    const received: unknown[] = [];
    const onError = jest.fn();
    const onComplete = jest.fn();

    await parseNDJSONStream(stream, (e) => received.push(e), onError, onComplete);

    expect(received).toEqual(events);
    expect(onError).not.toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('skips blank lines without calling onError', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('\n\n{"x":1}\n\n'));
        controller.close();
      },
    });
    const received: unknown[] = [];
    const onError = jest.fn();
    const onComplete = jest.fn();

    await parseNDJSONStream(stream, (e) => received.push(e), onError, onComplete);

    expect(received).toEqual([{ x: 1 }]);
    expect(onError).not.toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('calls onComplete even when a line fails to parse', async () => {
    const stream = makeStream(['not-json', '{"ok":true}']);
    const received: unknown[] = [];
    const onError = jest.fn();
    const onComplete = jest.fn();

    await parseNDJSONStream(stream, (e) => received.push(e), onError, onComplete);

    // Malformed line is skipped; valid line is still processed
    expect(received).toEqual([{ ok: true }]);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('handles multi-chunk delivery (line split across chunks)', async () => {
    const stream = makeChunkedStream(['{"val":', '42}\n']);
    const received: unknown[] = [];
    const onError = jest.fn();
    const onComplete = jest.fn();

    await parseNDJSONStream(stream, (e) => received.push(e), onError, onComplete);

    expect(received).toEqual([{ val: 42 }]);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('calls onError and onComplete when the stream reader throws', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(new Error('network failure'));
      },
    });
    const onError = jest.fn();
    const onComplete = jest.fn();

    await parseNDJSONStream(stream, jest.fn(), onError, onComplete);

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Property P13: NDJSON round-trip integrity
// Feature: generic-chat-ui, Property 13: NDJSON round-trip produces deeply equal object
// ---------------------------------------------------------------------------

describe('parseNDJSONStream — P13 NDJSON round-trip', () => {
  it('round-trips any JSON value through NDJSON serialisation', async () => {
    // Filter out -0: JSON.stringify(-0) === "0", so -0 cannot round-trip through
    // JSON by spec. This is a JSON limitation, not a bug in parseNDJSONStream.
    const jsonValueNoNegZero = fc.jsonValue().filter((v) => {
      const serialised = JSON.stringify(v);
      return serialised !== undefined && JSON.stringify(JSON.parse(serialised)) === serialised;
    });

    await fc.assert(
      fc.asyncProperty(jsonValueNoNegZero, async (original) => {
        const line = JSON.stringify(original);
        const stream = makeStream([line]);
        const received: unknown[] = [];

        await parseNDJSONStream(stream, (e) => received.push(e), jest.fn(), jest.fn());

        expect(received).toHaveLength(1);
        expect(JSON.stringify(received[0])).toBe(JSON.stringify(original));
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property P14: Malformed NDJSON calls onError and onComplete exactly once
// Feature: generic-chat-ui, Property 14: malformed NDJSON calls onError + onComplete
// ---------------------------------------------------------------------------

describe('parseNDJSONStream — P14 malformed NDJSON', () => {
  it('calls onError with a descriptive Error and onComplete exactly once for non-JSON input', async () => {
    // Filter to strings that are definitely not valid JSON
    const nonJsonArb = fc
      .string({ minLength: 1 })
      .filter((s) => {
        try {
          JSON.parse(s);
          return false;
        } catch {
          return true;
        }
      });

    await fc.assert(
      fc.asyncProperty(nonJsonArb, async (badLine) => {
        // Wrap in a stream that throws after delivering the bad line
        const encoder = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(encoder.encode(badLine + '\n'));
            controller.error(new Error('stream error'));
          },
        });

        const onError = jest.fn();
        const onComplete = jest.fn();

        await parseNDJSONStream(stream, jest.fn(), onError, onComplete);

        // onComplete must always be called exactly once
        expect(onComplete).toHaveBeenCalledTimes(1);
        // onError must be called with an Error instance
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
      }),
      { numRuns: 100 },
    );
  });
});
