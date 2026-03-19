import React from 'react';
import { render, screen } from '@testing-library/react';
import fc from 'fast-check';
import MessageBubble from '../MessageBubble';
import type { Message, ReportData } from '../../../types/core';
import { MessageType } from '../../../types/core';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-1',
    type: MessageType.AGENT_RESULT,
    content: 'result content',
    timestamp: new Date('2024-01-01T00:00:00Z'),
    agent: 'Test Agent',
    correlationId: 'corr-1',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Unit: renderReport spy is called with message.report
// ---------------------------------------------------------------------------

describe('MessageBubble — renderReport prop', () => {
  it('calls renderReport exactly once with message.report when provided', () => {
    const report: ReportData = { score: 42, status: 'ok' };
    const renderReport = jest.fn().mockReturnValue(<div>custom report</div>);
    const message = makeMessage({ report, type: MessageType.AGENT_RESULT });

    render(
      <MessageBubble message={message} isLatestResult renderReport={renderReport} />,
    );

    expect(renderReport).toHaveBeenCalledTimes(1);
    expect(renderReport).toHaveBeenCalledWith(report);
    expect(screen.getByText('custom report')).toBeInTheDocument();
  });

  it('renders GenericReportRenderer when renderReport is absent', () => {
    const report: ReportData = { my_field: 'hello' };
    const message = makeMessage({ report, type: MessageType.AGENT_RESULT });

    render(<MessageBubble message={message} isLatestResult />);

    // GenericReportRenderer formats snake_case keys as Title Case
    expect(screen.getByText('My Field')).toBeInTheDocument();
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('does not call renderReport when message has no report', () => {
    const renderReport = jest.fn();
    const message = makeMessage({ report: undefined, type: MessageType.AGENT_THINKING });

    render(<MessageBubble message={message} renderReport={renderReport} />);

    expect(renderReport).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Unit: message type rendering
// ---------------------------------------------------------------------------

describe('MessageBubble — message types', () => {
  it('renders user message content', () => {
    const message = makeMessage({ type: MessageType.USER, content: 'my question', agent: undefined });
    render(<MessageBubble message={message} />);
    expect(screen.getByText('my question')).toBeInTheDocument();
  });

  it('renders system complete message inline', () => {
    const message = makeMessage({
      type: MessageType.SYSTEM_COMPLETE,
      content: 'Review complete',
      report: undefined,
    });
    render(<MessageBubble message={message} />);
    expect(screen.getByText('Review complete')).toBeInTheDocument();
  });

  it('renders agent name in header', () => {
    const message = makeMessage({ type: MessageType.AGENT_THINKING, agent: 'Design Reviewer' });
    render(<MessageBubble message={message} />);
    expect(screen.getByText('Design Reviewer')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Property P4: renderReport called exactly once with message.report
// Feature: generic-chat-ui, Property 4: renderReport spy called once with report
// ---------------------------------------------------------------------------

describe('P4 — renderReport called with message.report', () => {
  it('spy is called exactly once with the report for any ReportData', () => {
    fc.assert(
      fc.property(
        fc.record({
          key: fc.string({ minLength: 1, maxLength: 20 }),
          value: fc.oneof(fc.string(), fc.integer(), fc.boolean()),
        }),
        (reportData) => {
          const renderReport = jest.fn().mockReturnValue(<span>ok</span>);
          const message = makeMessage({ report: reportData });

          const { unmount } = render(
            <MessageBubble message={message} isLatestResult renderReport={renderReport} />,
          );

          expect(renderReport).toHaveBeenCalledTimes(1);
          expect(renderReport).toHaveBeenCalledWith(reportData);
          unmount();
        },
      ),
      { numRuns: 50 },
    );
  });
});
