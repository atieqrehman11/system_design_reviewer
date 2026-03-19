/**
 * Tests for useChatStream — config-driven assistant name and URL construction.
 * Feature: generic-chat-ui
 */
import { renderHook, act } from '@testing-library/react';
import * as fc from 'fast-check';
import { useChatStream } from '../useChatStream';
import { MessageType } from '../../../types/core';
import type { Message, ChatMessage } from '../../../types/core';
import { createDefaultChatUIConfig } from '../../../config/ChatUIConfig';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../../../services/chatClient', () => ({
  submitChat: jest.fn(),
}));

jest.mock('../chatStreamUtils', () => ({
  drainChatStream: jest.fn(),
}));

import { submitChat } from '../../../services/chatClient';
import { drainChatStream } from '../chatStreamUtils';

const mockSubmitChat = submitChat as jest.MockedFunction<typeof submitChat>;
const mockDrainChatStream = drainChatStream as jest.MockedFunction<typeof drainChatStream>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<Parameters<typeof createDefaultChatUIConfig>[0]> = {}) {
  return createDefaultChatUIConfig({
    apiBaseUrl: 'http://api.test',
    chatEndpoint: '/chat',
    submitEndpoint: '/review',
    ...overrides,
  });
}

function makeDeps(configOverrides?: Parameters<typeof makeConfig>[0]) {
  const config = makeConfig(configOverrides);
  const chatHistoryRef = { current: [] as ChatMessage[] };
  const setMessages = jest.fn();
  const setIsStreaming = jest.fn();

  return { config, chatHistoryRef, setMessages, setIsStreaming };
}

// ---------------------------------------------------------------------------
// Assistant name — parameterized
// ---------------------------------------------------------------------------

describe('useChatStream — assistantName from config', () => {
  beforeEach(() => {
    mockSubmitChat.mockResolvedValue(new ReadableStream());
    mockDrainChatStream.mockResolvedValue(undefined);
  });

  afterEach(() => jest.clearAllMocks());

  it.each([
    ['Architect Assistant'],
    ['Design Bot'],
    ['My Custom AI'],
  ])('uses "%s" as the agent name on the thinking message', async (assistantName) => {
    const deps = makeDeps({ assistantName });
    const { result } = renderHook(() => useChatStream(deps));

    let addedMessage: Message | undefined;
    deps.setMessages.mockImplementation(
      (updater: (prev: Message[]) => Message[]) => {
        const next = updater([]);
        addedMessage = next[0];
      },
    );

    await act(async () => {
      result.current.startChat('hello', 'corr-1');
      // flush microtasks
      await Promise.resolve();
    });

    expect(addedMessage?.agent).toBe(assistantName);
    expect(addedMessage?.type).toBe(MessageType.AGENT_THINKING);
  });
});

// ---------------------------------------------------------------------------
// URL construction — submitChat called with correct URL
// ---------------------------------------------------------------------------

describe('useChatStream — URL construction', () => {
  beforeEach(() => {
    mockSubmitChat.mockResolvedValue(new ReadableStream());
    mockDrainChatStream.mockResolvedValue(undefined);
  });

  afterEach(() => jest.clearAllMocks());

  it.each([
    ['http://localhost:8000', '/api/v1/chat', 'http://localhost:8000/api/v1/chat'],
    ['https://prod.example.com', '/v2/chat', 'https://prod.example.com/v2/chat'],
  ])('calls submitChat with %s + %s = %s', async (apiBaseUrl, chatEndpoint, expectedUrl) => {
    const deps = makeDeps({ apiBaseUrl, chatEndpoint });
    const { result } = renderHook(() => useChatStream(deps));

    await act(async () => {
      result.current.startChat('hello', 'corr-1');
      await Promise.resolve();
    });

    expect(mockSubmitChat).toHaveBeenCalledWith(
      'corr-1',
      expect.any(Array),
      expectedUrl,
      expect.any(Object),
      undefined,
    );
  });

  it('passes buildChatRequestBody from config to submitChat', async () => {
    const buildChatRequestBody = jest.fn().mockReturnValue({ custom: true });
    const deps = makeDeps({ buildChatRequestBody });
    const { result } = renderHook(() => useChatStream(deps));

    await act(async () => {
      result.current.startChat('hello', 'corr-1');
      await Promise.resolve();
    });

    expect(mockSubmitChat).toHaveBeenCalledWith(
      'corr-1',
      expect.any(Array),
      expect.any(String),
      expect.any(Object),
      buildChatRequestBody,
    );
  });
});

// ---------------------------------------------------------------------------
// Chat history — user message appended before call
// ---------------------------------------------------------------------------

describe('useChatStream — chat history management', () => {
  beforeEach(() => {
    mockSubmitChat.mockResolvedValue(new ReadableStream());
    mockDrainChatStream.mockResolvedValue(undefined);
  });

  afterEach(() => jest.clearAllMocks());

  it('appends user message to chatHistoryRef before calling submitChat', async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useChatStream(deps));

    await act(async () => {
      result.current.startChat('my question', 'corr-1');
      await Promise.resolve();
    });

    expect(deps.chatHistoryRef.current).toContainEqual({ role: 'user', content: 'my question' });
  });
});

// ---------------------------------------------------------------------------
// Property test — assistantName always appears on the thinking message
// Feature: generic-chat-ui, Property 7: useChatStream uses config.assistantName
// ---------------------------------------------------------------------------

describe('Property P7: assistantName from config always used on thinking message', () => {
  beforeEach(() => {
    mockSubmitChat.mockResolvedValue(new ReadableStream());
    mockDrainChatStream.mockResolvedValue(undefined);
  });

  afterEach(() => jest.clearAllMocks());

  it('any non-empty assistantName is reflected in the AGENT_THINKING message', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (assistantName) => {
          const deps = makeDeps({ assistantName });
          const { result } = renderHook(() => useChatStream(deps));

          let addedMessage: Message | undefined;
          deps.setMessages.mockImplementation(
            (updater: (prev: Message[]) => Message[]) => {
              const next = updater([]);
              addedMessage = next[0];
            },
          );

          await act(async () => {
            result.current.startChat('test', 'corr-prop');
            await Promise.resolve();
          });

          expect(addedMessage?.agent).toBe(assistantName);
        },
      ),
      { numRuns: 20 },
    );
  });
});
