import fc from 'fast-check';
import { submitReview, submitReviewWithFile } from '../client';
import { submitChat } from '../chatClient';
import { ApiError } from '../../types/core';
import type { ChatMessage } from '../../types/core';

// ---------------------------------------------------------------------------
// Fetch mock helpers
// ---------------------------------------------------------------------------

function mockFetchOk(body = ''): void {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(body));
      controller.close();
    },
  });
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    body: stream,
    status: 200,
    statusText: 'OK',
  });
}

function mockFetchError(status: number, message: string): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status,
    statusText: 'Error',
    json: jest.fn().mockResolvedValue({ message }),
    body: null,
  });
}

// ---------------------------------------------------------------------------
// Parameterized: URL construction — submitReview uses the provided apiUrl
// ---------------------------------------------------------------------------

it.each([
  ['root path', 'http://localhost:8000', '/api/v1/review', 'http://localhost:8000/api/v1/review'],
  ['trailing slash base', 'http://example.com/', '/review', 'http://example.com//review'],
  ['custom domain', 'https://api.myapp.io', '/v2/submit', 'https://api.myapp.io/v2/submit'],
])(
  'submitReview — URL construction: %s',
  async (_label, baseUrl, endpoint, expectedUrl) => {
    mockFetchOk();
    await submitReview('content', `${baseUrl}${endpoint}`);
    expect(global.fetch).toHaveBeenCalledWith(
      expectedUrl,
      expect.objectContaining({ method: 'POST' }),
    );
  },
);

it.each([
  ['root path', 'http://localhost:8000', '/api/v1/chat', 'http://localhost:8000/api/v1/chat'],
  ['custom domain', 'https://api.myapp.io', '/v2/chat', 'https://api.myapp.io/v2/chat'],
])(
  'submitChat — URL construction: %s',
  async (_label, baseUrl, endpoint, expectedUrl) => {
    mockFetchOk();
    await submitChat('corr-1', [], `${baseUrl}${endpoint}`);
    expect(global.fetch).toHaveBeenCalledWith(
      expectedUrl,
      expect.objectContaining({ method: 'POST' }),
    );
  },
);

// ---------------------------------------------------------------------------
// Parameterized: default body builders
// ---------------------------------------------------------------------------

it.each([
  ['submit default — design_doc key', 'my design doc', 'corr-abc', { design_doc: 'my design doc' }],
  ['submit default — empty content', '', 'corr-xyz', { design_doc: '' }],
])(
  'submitReview — %s',
  async (_label, content, correlationId, expectedBody) => {
    mockFetchOk();
    await submitReview(content, '/api/v1/review', { correlationId });
    const call = (global.fetch as jest.Mock).mock.calls[0];
    const sentBody = JSON.parse(call[1].body as string);
    expect(sentBody).toEqual(expectedBody);
  },
);

it.each([
  [
    'chat default — correlation_id and messages',
    'corr-123',
    [{ role: 'user' as const, content: 'hello' }],
    { correlation_id: 'corr-123', messages: [{ role: 'user', content: 'hello' }] },
  ],
  [
    'chat default — empty messages',
    'corr-456',
    [] as ChatMessage[],
    { correlation_id: 'corr-456', messages: [] },
  ],
])(
  'submitChat — %s',
  async (_label, correlationId, messages, expectedBody) => {
    mockFetchOk();
    await submitChat(correlationId, messages, '/api/v1/chat');
    const call = (global.fetch as jest.Mock).mock.calls[0];
    const sentBody = JSON.parse(call[1].body as string);
    expect(sentBody).toEqual(expectedBody);
  },
);

// ---------------------------------------------------------------------------
// Unit: custom body builder for submitReview
// ---------------------------------------------------------------------------

describe('submitReview — custom buildBody', () => {
  it('calls buildBody with content and correlationId, uses its output as request body', async () => {
    mockFetchOk();
    const buildBody = jest.fn().mockReturnValue({ custom: 'payload', version: 2 });

    await submitReview('my doc', '/api/v1/review', { correlationId: 'corr-1' }, buildBody);

    expect(buildBody).toHaveBeenCalledWith('my doc', 'corr-1');
    const call = (global.fetch as jest.Mock).mock.calls[0];
    expect(JSON.parse(call[1].body as string)).toEqual({ custom: 'payload', version: 2 });
  });

  it('uses default body when buildBody is not provided', async () => {
    mockFetchOk();
    await submitReview('doc content', '/api/v1/review', { correlationId: 'corr-2' });
    const call = (global.fetch as jest.Mock).mock.calls[0];
    expect(JSON.parse(call[1].body as string)).toEqual({ design_doc: 'doc content' });
  });
});

// ---------------------------------------------------------------------------
// Unit: custom body builder for submitChat
// ---------------------------------------------------------------------------

describe('submitChat — custom buildBody', () => {
  it('calls buildBody with correlationId and messages, uses its output as request body', async () => {
    mockFetchOk();
    const messages: ChatMessage[] = [{ role: 'user', content: 'hi' }];
    const buildBody = jest.fn().mockReturnValue({ custom: true });

    await submitChat('corr-1', messages, '/api/v1/chat', {}, buildBody);

    expect(buildBody).toHaveBeenCalledWith('corr-1', messages);
    const call = (global.fetch as jest.Mock).mock.calls[0];
    expect(JSON.parse(call[1].body as string)).toEqual({ custom: true });
  });
});

// ---------------------------------------------------------------------------
// Unit: error handling
// ---------------------------------------------------------------------------

describe('submitReview — error handling', () => {
  it('throws ApiError with status code on HTTP error response', async () => {
    mockFetchError(422, 'Validation failed');
    await expect(submitReview('doc', '/api/v1/review')).rejects.toThrow(ApiError);
    await expect(submitReview('doc', '/api/v1/review')).rejects.toMatchObject({
      statusCode: 422,
    });
  });

  it('throws ApiError on network failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('fetch failed'));
    await expect(submitReview('doc', '/api/v1/review')).rejects.toThrow(ApiError);
  });
});

describe('submitChat — error handling', () => {
  it('throws ApiError with status code on HTTP error response', async () => {
    mockFetchError(500, 'Internal server error');
    await expect(submitChat('corr', [], '/api/v1/chat')).rejects.toThrow(ApiError);
  });
});

// ---------------------------------------------------------------------------
// Unit: X-Correlation-ID header is set when correlationId is provided
// ---------------------------------------------------------------------------

describe('submitReview — X-Correlation-ID header', () => {
  it('sets X-Correlation-ID header when correlationId is provided', async () => {
    mockFetchOk();
    await submitReview('doc', '/api/v1/review', { correlationId: 'test-corr-id' });
    const call = (global.fetch as jest.Mock).mock.calls[0];
    const headers: Headers = call[1].headers;
    expect(headers.get('X-Correlation-ID')).toBe('test-corr-id');
  });

  it('does not set X-Correlation-ID header when correlationId is absent', async () => {
    mockFetchOk();
    await submitReview('doc', '/api/v1/review');
    const call = (global.fetch as jest.Mock).mock.calls[0];
    const headers: Headers = call[1].headers;
    expect(headers.get('X-Correlation-ID')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Property P7: API client uses configured endpoints
// Feature: generic-chat-ui, Property 7: fetch URL equals apiBaseUrl + endpoint
// ---------------------------------------------------------------------------

describe('P7 — submitReview uses configured URL', () => {
  it('fetch URL always equals the provided apiUrl argument', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.webUrl(),
        fc.stringMatching(/^\/[a-z0-9/_-]{1,30}$/),
        async (baseUrl, path) => {
          mockFetchOk();
          const fullUrl = `${baseUrl}${path}`;
          await submitReview('content', fullUrl).catch(() => {
            // URL may be invalid for fetch — we only care the call was made with it
          });
          const calls = (global.fetch as jest.Mock).mock.calls;
          if (calls.length > 0) {
            expect(calls[0][0]).toBe(fullUrl);
          }
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property P8: Custom body builders are invoked and their output is used
// Feature: generic-chat-ui, Property 8: custom buildBody output is the request body
// ---------------------------------------------------------------------------

describe('P8 — custom buildBody output is the request body', () => {
  it('submitReview: any object returned by buildBody becomes the JSON body', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          key: fc.string({ minLength: 1, maxLength: 20 }),
          value: fc.oneof(fc.string(), fc.integer(), fc.boolean()),
        }),
        async (customPayload) => {
          mockFetchOk();
          const buildBody = jest.fn().mockReturnValue(customPayload);
          await submitReview('doc', '/api/v1/review', {}, buildBody);
          const call = (global.fetch as jest.Mock).mock.calls[0];
          expect(JSON.parse(call[1].body as string)).toEqual(customPayload);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('submitChat: any object returned by buildBody becomes the JSON body', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          key: fc.string({ minLength: 1, maxLength: 20 }),
          value: fc.oneof(fc.string(), fc.integer(), fc.boolean()),
        }),
        async (customPayload) => {
          mockFetchOk();
          const buildBody = jest.fn().mockReturnValue(customPayload);
          await submitChat('corr', [], '/api/v1/chat', {}, buildBody);
          const call = (global.fetch as jest.Mock).mock.calls[0];
          expect(JSON.parse(call[1].body as string)).toEqual(customPayload);
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ---------------------------------------------------------------------------
// Unit: submitReviewWithFile sends multipart form data
// ---------------------------------------------------------------------------

describe('submitReviewWithFile', () => {
  it('sends a POST with FormData (no Content-Type header override)', async () => {
    mockFetchOk();
    const file = new File(['content'], 'design.md', { type: 'text/markdown' });
    await submitReviewWithFile(file, 'extra text', '/api/v1/review/upload');
    const call = (global.fetch as jest.Mock).mock.calls[0];
    expect(call[0]).toBe('/api/v1/review/upload');
    expect(call[1].body).toBeInstanceOf(FormData);
    // Content-Type must NOT be set manually — browser sets multipart boundary
    const headers: Headers = call[1].headers;
    expect(headers.get('Content-Type')).toBeNull();
  });
});
