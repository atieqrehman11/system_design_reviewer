/**
 * Tests for useChatInterface — config validation, state management, transformer wiring.
 * Feature: generic-chat-ui
 */
import { renderHook, act } from '@testing-library/react';
import * as fc from 'fast-check';
import { useChatInterface } from '../useChatInterface';
import { MessageType } from '../../../types/core';
import type { Message, StreamEventTransformer } from '../../../types/core';
import type React from 'react';
import { createDefaultChatUIConfig } from '../../../config/ChatUIConfig';

// ---------------------------------------------------------------------------
// Mocks — both sub-hooks and validateChatUIConfig
// ---------------------------------------------------------------------------

// Captured setters so individual tests can drive state changes
let capturedSetIsFollowUpMode: React.Dispatch<React.SetStateAction<boolean>> | undefined;
let capturedSetMessages: React.Dispatch<React.SetStateAction<Message[]>> | undefined;
let capturedSetError: React.Dispatch<React.SetStateAction<string | null>> | undefined;
let capturedStartSubmit: jest.Mock = jest.fn();

jest.mock('../useSubmitStream', () => ({
  useSubmitStream: jest.fn(),
}));

jest.mock('../useChatStream', () => ({
  useChatStream: jest.fn(),
}));

jest.mock('../../../config/ChatUIConfig', () => {
  const actual = jest.requireActual('../../../config/ChatUIConfig');
  return { ...actual, validateChatUIConfig: jest.fn() };
});

import { useSubmitStream } from '../useSubmitStream';
import { useChatStream } from '../useChatStream';
import { validateChatUIConfig } from '../../../config/ChatUIConfig';

const mockUseSubmitStream = useSubmitStream as jest.MockedFunction<typeof useSubmitStream>;
const mockUseChatStream = useChatStream as jest.MockedFunction<typeof useChatStream>;
const mockValidateChatUIConfig = validateChatUIConfig as jest.MockedFunction<typeof validateChatUIConfig>;

// Default mock implementations — reset before each test
function resetMocks(): void {
  capturedSetIsFollowUpMode = undefined;
  capturedSetMessages = undefined;
  capturedSetError = undefined;
  capturedStartSubmit = jest.fn();

  mockUseSubmitStream.mockImplementation((deps) => {
    capturedSetIsFollowUpMode = deps.setIsFollowUpMode;
    capturedSetMessages = deps.setMessages;
    capturedSetError = deps.setError;
    capturedStartSubmit = jest.fn();
    return { startSubmit: capturedStartSubmit };
  });

  mockUseChatStream.mockImplementation(() => ({ startChat: jest.fn() }));
  mockValidateChatUIConfig.mockImplementation(() => undefined);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTransformer(): StreamEventTransformer<unknown> {
  return {
    transform: jest.fn((_event, correlationId): Message => ({
      id: crypto.randomUUID(),
      type: MessageType.AGENT_RESULT,
      content: 'result',
      timestamp: new Date(),
      correlationId,
    })),
    isComplete: jest.fn(() => false),
  };
}

function makeConfig(overrides?: Partial<ReturnType<typeof createDefaultChatUIConfig>>) {
  return createDefaultChatUIConfig({
    apiBaseUrl: 'http://api.test',
    submitEndpoint: '/review',
    chatEndpoint: '/chat',
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// validateChatUIConfig called on mount
// ---------------------------------------------------------------------------

describe('useChatInterface — config validation on mount', () => {
  beforeEach(resetMocks);

  it('calls validateChatUIConfig exactly once on mount', () => {
    const config = makeConfig();
    renderHook(() => useChatInterface(config, makeTransformer()));
    expect(mockValidateChatUIConfig).toHaveBeenCalledTimes(1);
    expect(mockValidateChatUIConfig).toHaveBeenCalledWith(config);
  });

  it('throws when validateChatUIConfig throws (missing required field)', () => {
    mockValidateChatUIConfig.mockImplementationOnce(() => {
      throw new Error("ChatUIConfig: required field 'appTitle' is missing or empty");
    });
    expect(() => renderHook(() => useChatInterface(makeConfig(), makeTransformer()))).toThrow(
      "ChatUIConfig: required field 'appTitle' is missing or empty",
    );
  });
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe('useChatInterface — initial state', () => {
  beforeEach(resetMocks);

  it('starts with empty messages, not streaming, not follow-up, no error', () => {
    const { result } = renderHook(() => useChatInterface(makeConfig(), makeTransformer()));
    expect(result.current.messages).toEqual([]);
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.isFollowUpMode).toBe(false);
    expect(result.current.error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// resetSession — parameterized state assertions
// ---------------------------------------------------------------------------

describe('useChatInterface — resetSession', () => {
  beforeEach(resetMocks);

  it.each([
    ['messages', (r: ReturnType<typeof useChatInterface>) => r.messages, [] as Message[]],
    ['isFollowUpMode', (r: ReturnType<typeof useChatInterface>) => r.isFollowUpMode, false],
    ['error', (r: ReturnType<typeof useChatInterface>) => r.error, null],
  ])('resets %s to expected value', (_field, selector, expected) => {
    const { result } = renderHook(() => useChatInterface(makeConfig(), makeTransformer()));

    // Drive some state before reset
    act(() => {
      capturedSetIsFollowUpMode?.(true);
    });

    act(() => {
      result.current.resetSession();
    });

    expect(selector(result.current)).toEqual(expected);
  });
});

// ---------------------------------------------------------------------------
// clearError
// ---------------------------------------------------------------------------

describe('useChatInterface — clearError', () => {
  beforeEach(resetMocks);

  it('clears error state after it has been set', () => {
    const { result } = renderHook(() => useChatInterface(makeConfig(), makeTransformer()));

    // Set an error via the captured setter (outside render)
    act(() => {
      capturedSetError?.('something went wrong');
    });

    expect(result.current.error).toBe('something went wrong');

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isFollowUpMode — set when setIsFollowUpMode(true) is called
// ---------------------------------------------------------------------------

describe('useChatInterface — isFollowUpMode via transformer', () => {
  beforeEach(resetMocks);

  it('isFollowUpMode becomes true when setIsFollowUpMode is called by useSubmitStream', () => {
    const { result } = renderHook(() => useChatInterface(makeConfig(), makeTransformer()));

    expect(result.current.isFollowUpMode).toBe(false);

    act(() => {
      capturedSetIsFollowUpMode?.(true);
    });

    expect(result.current.isFollowUpMode).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Property P9: isFollowUpMode reflects setIsFollowUpMode(true) call
// Feature: generic-chat-ui, Property 9: isFollowUpMode state driven by transformer completion
// ---------------------------------------------------------------------------

describe('Property P9: isFollowUpMode driven by transformer isComplete', () => {
  beforeEach(resetMocks);

  it('isFollowUpMode is true after setIsFollowUpMode(true) regardless of prior state', () => {
    fc.assert(
      fc.property(fc.boolean(), (initialFollowUp) => {
        resetMocks();
        const { result } = renderHook(() => useChatInterface(makeConfig(), makeTransformer()));

        if (initialFollowUp) {
          act(() => { capturedSetIsFollowUpMode?.(true); });
        }

        act(() => { capturedSetIsFollowUpMode?.(true); });

        expect(result.current.isFollowUpMode).toBe(true);
      }),
      { numRuns: 20 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property P10: resetSession always produces empty state
// Feature: generic-chat-ui, Property 10: resetSession always clears all state
// ---------------------------------------------------------------------------

describe('Property P10: resetSession always produces empty state', () => {
  beforeEach(resetMocks);

  it('regardless of prior messages, resetSession empties all state', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1 }), { minLength: 0, maxLength: 5 }),
        (contents) => {
          resetMocks();
          const { result } = renderHook(() => useChatInterface(makeConfig(), makeTransformer()));

          // Populate state via captured setters
          act(() => {
            contents.forEach((content) => {
              capturedSetMessages?.((prev) => [
                ...prev,
                {
                  id: crypto.randomUUID(),
                  type: MessageType.USER,
                  content,
                  timestamp: new Date(),
                },
              ]);
            });
            capturedSetIsFollowUpMode?.(true);
          });

          act(() => { result.current.resetSession(); });

          expect(result.current.messages).toEqual([]);
          expect(result.current.isFollowUpMode).toBe(false);
          expect(result.current.error).toBeNull();
        },
      ),
      { numRuns: 20 },
    );
  });
});
