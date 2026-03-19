/**
 * App integration smoke tests.
 * Asserts that the wired ChatInterface renders config-driven strings.
 * Feature: generic-chat-ui
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';
import { reviewChatUIConfig } from './integrations/review-backend';
import type { ChatInterfaceProps } from './core';

// ---------------------------------------------------------------------------
// Mock ChatInterface at the component level — avoids fighting barrel resolution.
// The mock renders config-driven strings so we can assert on them.
// ---------------------------------------------------------------------------

jest.mock('./core/components/ChatInterface/ChatInterface', () => ({
  __esModule: true,
  default: ({ config }: ChatInterfaceProps) => (
    <div data-testid="chat-interface">
      <h1>{config.appTitle}</h1>
      <p>{config.emptyStateMessage}</p>
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Config-driven string rendering — parameterized
// ---------------------------------------------------------------------------

describe('App — renders config-driven strings from reviewChatUIConfig', () => {
  it.each([
    ['appTitle', reviewChatUIConfig.appTitle],
    ['emptyStateMessage', reviewChatUIConfig.emptyStateMessage],
  ])('renders %s', (_field, expectedText) => {
    render(<App />);
    expect(screen.getByText(expectedText)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Wiring smoke test
// ---------------------------------------------------------------------------

describe('App — wiring', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(<App />);
    expect(getByTestId('chat-interface')).not.toBeNull();
  });
});
