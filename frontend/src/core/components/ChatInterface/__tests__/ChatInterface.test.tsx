/**
 * Tests for ChatInterface component — config-driven rendering.
 * Feature: generic-chat-ui
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import ChatInterface from '../ChatInterface';
import { createDefaultChatUIConfig } from '../../../config/ChatUIConfig';
import type { StreamEventTransformer, Message } from '../../../types/core';
import { MessageType } from '../../../types/core';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../useChatInterface', () => ({
  useChatInterface: jest.fn(),
}));

jest.mock('../../MessageList', () => ({
  __esModule: true,
  default: () => <div data-testid="message-list" />,
}));

jest.mock('../../InputArea', () => ({
  __esModule: true,
  default: ({ placeholder }: { placeholder: string }) => (
    <div data-testid="input-area" data-placeholder={placeholder} />
  ),
}));

import { useChatInterface } from '../useChatInterface';

const mockUseChatInterface = useChatInterface as jest.MockedFunction<typeof useChatInterface>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTransformer(): StreamEventTransformer<unknown> {
  return {
    transform: jest.fn((_e, correlationId): Message => ({
      id: crypto.randomUUID(),
      type: MessageType.AGENT_RESULT,
      content: '',
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
    appTitle: 'Test App',
    appSubtitle: 'Test Subtitle',
    emptyStateMessage: 'No messages yet',
    submitButtonText: 'Submit',
    inputPlaceholder: 'Enter text...',
    chatPlaceholder: 'Ask a question...',
    assistantName: 'Test Assistant',
    ...overrides,
  });
}

function makeHookReturn(
  overrides?: Partial<ReturnType<typeof useChatInterface>>,
): ReturnType<typeof useChatInterface> {
  return {
    messages: [],
    isStreaming: false,
    isFollowUpMode: false,
    error: null,
    handleSubmit: jest.fn(),
    clearError: jest.fn(),
    resetSession: jest.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Config string rendering — parameterized
// ---------------------------------------------------------------------------

describe('ChatInterface — config string rendering', () => {
  beforeEach(() => {
    mockUseChatInterface.mockReturnValue(makeHookReturn());
  });

  afterEach(() => jest.clearAllMocks());

  it.each([
    ['appTitle', 'My Custom Title', (c: ReturnType<typeof makeConfig>) => ({ ...c, appTitle: 'My Custom Title' }), 'My Custom Title'],
    ['emptyStateMessage', 'Nothing here yet', (c: ReturnType<typeof makeConfig>) => ({ ...c, emptyStateMessage: 'Nothing here yet' }), 'Nothing here yet'],
    ['assistantName in streaming label', 'Design Bot', (c: ReturnType<typeof makeConfig>) => ({ ...c, assistantName: 'Design Bot' }), 'Design Bot is thinking...'],
  ])('renders %s from config', (_field, _value, configMutator, expectedText) => {
    const config = configMutator(makeConfig());
    const isStreaming = expectedText.includes('thinking');
    mockUseChatInterface.mockReturnValue(makeHookReturn({ isStreaming, isFollowUpMode: isStreaming }));

    render(<ChatInterface config={config} transformer={makeTransformer()} />);

    expect(screen.getByText(expectedText)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Empty state vs message list
// ---------------------------------------------------------------------------

describe('ChatInterface — empty state vs message list', () => {
  afterEach(() => jest.clearAllMocks());

  it('shows empty state message when messages is empty', () => {
    mockUseChatInterface.mockReturnValue(makeHookReturn({ messages: [] }));
    const config = makeConfig();
    render(<ChatInterface config={config} transformer={makeTransformer()} />);
    expect(screen.getByText(config.emptyStateMessage)).toBeInTheDocument();
    expect(screen.queryByTestId('message-list')).not.toBeInTheDocument();
  });

  it('shows MessageList when messages exist', () => {
    const messages: Message[] = [{
      id: crypto.randomUUID(),
      type: MessageType.USER,
      content: 'hello',
      timestamp: new Date(),
    }];
    mockUseChatInterface.mockReturnValue(makeHookReturn({ messages }));
    render(<ChatInterface config={makeConfig()} transformer={makeTransformer()} />);
    expect(screen.getByTestId('message-list')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Error banner
// ---------------------------------------------------------------------------

describe('ChatInterface — error banner', () => {
  afterEach(() => jest.clearAllMocks());

  it('shows error banner when error is set', () => {
    mockUseChatInterface.mockReturnValue(makeHookReturn({ error: 'Something failed' }));
    render(<ChatInterface config={makeConfig()} transformer={makeTransformer()} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Something failed/)).toBeInTheDocument();
  });

  it('hides error banner when error is null', () => {
    mockUseChatInterface.mockReturnValue(makeHookReturn({ error: null }));
    render(<ChatInterface config={makeConfig()} transformer={makeTransformer()} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// transformer prop forwarded to useChatInterface
// ---------------------------------------------------------------------------

describe('ChatInterface — transformer forwarded to hook', () => {
  afterEach(() => jest.clearAllMocks());

  it('passes transformer to useChatInterface', () => {
    mockUseChatInterface.mockReturnValue(makeHookReturn());
    const transformer = makeTransformer();
    const config = makeConfig();
    render(<ChatInterface config={config} transformer={transformer} />);
    expect(mockUseChatInterface).toHaveBeenCalledWith(config, transformer);
  });
});

// ---------------------------------------------------------------------------
// Property P1: any non-empty appTitle is rendered in the DOM
// Feature: generic-chat-ui, Property 1: config.appTitle always rendered
// ---------------------------------------------------------------------------

describe('Property P1: config.appTitle always rendered in DOM', () => {
  afterEach(() => jest.clearAllMocks());

  it('any non-empty appTitle string appears in the rendered output', () => {
    // Filter: non-blank, no leading/trailing whitespace (avoids DOM text normalisation edge cases)
    const nonBlankString = fc
      .string({ minLength: 1, maxLength: 80 })
      .filter((s) => s.trim() === s && s.trim().length > 0);

    fc.assert(
      fc.property(nonBlankString, (appTitle) => {
        mockUseChatInterface.mockReturnValue(makeHookReturn());
        const config = makeConfig({ appTitle });
        const { unmount } = render(
          <ChatInterface config={config} transformer={makeTransformer()} />,
        );
        // Use heading role + textContent to avoid whitespace normalisation issues
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading.textContent?.trim()).toBe(appTitle.trim());
        unmount();
      }),
      { numRuns: 20 },
    );
  });
});
