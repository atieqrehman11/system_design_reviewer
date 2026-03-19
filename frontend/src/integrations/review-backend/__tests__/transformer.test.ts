/**
 * Tests for ReviewStreamEventTransformer.
 * Feature: generic-chat-ui
 */
import * as fc from 'fast-check';
import { ReviewStreamEventTransformer } from '../transformer';
import { MessageType } from '../../../core/types/core';
import type { ReviewResponse } from '../types';

const transformer = new ReviewStreamEventTransformer();
const CORRELATION_ID = 'corr-test-1';

// ---------------------------------------------------------------------------
// transform — event type mapping
// ---------------------------------------------------------------------------

describe('ReviewStreamEventTransformer.transform — event type mapping', () => {
  it.each([
    [
      'thinking event → AGENT_THINKING',
      { message_type: 'thinking', agent: 'Design Reviewer', message: 'Analysing...' } as ReviewResponse,
      MessageType.AGENT_THINKING,
    ],
    [
      'result event → AGENT_RESULT',
      // Partial report fixture — cast via unknown to avoid requiring all ReviewReport fields in test data
      { message_type: 'result', agent: 'Security Reviewer', message: 'Done', report: { score: 80 } } as unknown as ReviewResponse,
      MessageType.AGENT_RESULT,
    ],
    [
      'complete status → SYSTEM_COMPLETE',
      { status: 'complete', message: 'Review complete' } as ReviewResponse,
      MessageType.SYSTEM_COMPLETE,
    ],
    [
      'completed status → SYSTEM_COMPLETE',
      { status: 'completed', message: 'All done' } as ReviewResponse,
      MessageType.SYSTEM_COMPLETE,
    ],
    [
      'unknown shape → ERROR',
      { message_type: 'unknown_type' } as ReviewResponse,
      MessageType.ERROR,
    ],
    [
      'empty event → ERROR',
      {} as ReviewResponse,
      MessageType.ERROR,
    ],
  ])('%s', (_label, event, expectedType) => {
    const message = transformer.transform(event, CORRELATION_ID);
    expect(message.type).toBe(expectedType);
    expect(message.correlationId).toBe(CORRELATION_ID);
    expect(message.id).toBeTruthy();
    expect(message.timestamp).toBeInstanceOf(Date);
  });

  it('result event carries report data', () => {
    // Partial report fixture — cast via unknown; transformer only reads the report as ReportData (Record<string, unknown>)
    const event = {
      message_type: 'result',
      agent: 'Arch Reviewer',
      report: { score: 90, status: 'ok' },
    } as unknown as ReviewResponse;
    const message = transformer.transform(event, CORRELATION_ID);
    expect(message.report).toEqual({ score: 90, status: 'ok' });
    expect(message.agent).toBe('Arch Reviewer');
  });

  it('result event with no message uses agent fallback content', () => {
    const event: ReviewResponse = { message_type: 'result', agent: 'Arch Reviewer' };
    const message = transformer.transform(event, CORRELATION_ID);
    expect(message.content).toBe('Arch Reviewer completed the analysis');
  });

  it('result event with no message and no agent uses generic fallback', () => {
    const event: ReviewResponse = { message_type: 'result' };
    const message = transformer.transform(event, CORRELATION_ID);
    expect(message.content).toBe('Analysis complete');
  });

  it('thinking event carries agent name', () => {
    const event: ReviewResponse = { message_type: 'thinking', agent: 'Design Reviewer', message: 'Thinking...' };
    const message = transformer.transform(event, CORRELATION_ID);
    expect(message.agent).toBe('Design Reviewer');
    expect(message.content).toBe('Thinking...');
  });
});

// ---------------------------------------------------------------------------
// isComplete — status mapping
// ---------------------------------------------------------------------------

describe('ReviewStreamEventTransformer.isComplete', () => {
  it.each([
    ['complete status → true', { status: 'complete' } as ReviewResponse, true],
    ['completed status → true', { status: 'completed' } as ReviewResponse, true],
    ['error status → false', { status: 'error' } as ReviewResponse, false],
    ['thinking message_type → false', { message_type: 'thinking' } as ReviewResponse, false],
    ['result message_type → false', { message_type: 'result' } as ReviewResponse, false],
    ['empty event → false', {} as ReviewResponse, false],
    ['undefined status → false', { status: undefined } as ReviewResponse, false],
  ])('%s', (_label, event, expected) => {
    expect(transformer.isComplete(event)).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// Property P3: thinking events always produce AGENT_THINKING
// Feature: generic-chat-ui, Property 3: thinking events → AGENT_THINKING
// ---------------------------------------------------------------------------

describe('P3 — thinking events always produce AGENT_THINKING', () => {
  it('any thinking event maps to AGENT_THINKING', () => {
    fc.assert(
      fc.property(
        fc.record({
          message_type: fc.constant('thinking'),
          agent: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
          message: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
        }),
        fc.string({ minLength: 1, maxLength: 36 }),
        (event, correlationId) => {
          const message = transformer.transform(event as ReviewResponse, correlationId);
          expect(message.type).toBe(MessageType.AGENT_THINKING);
          expect(message.correlationId).toBe(correlationId);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property P15: transform is pure — same event called twice produces equal output shape
// Feature: generic-chat-ui, Property 15: transform purity check
// ---------------------------------------------------------------------------

describe('P15 — transform purity: same event produces equal type, content, agent', () => {
  it('calling transform twice with the same event yields equal type/content/agent', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.record({ message_type: fc.constant('thinking'), agent: fc.string(), message: fc.string() }),
          fc.record({ message_type: fc.constant('result'), agent: fc.string(), message: fc.string() }),
          fc.record({ status: fc.constant('complete'), message: fc.string() }),
          fc.record({ status: fc.constant('completed'), message: fc.string() }),
          fc.record({ message_type: fc.string(), message: fc.string() }),
        ),
        fc.string({ minLength: 1, maxLength: 36 }),
        (event, correlationId) => {
          const m1 = transformer.transform(event as ReviewResponse, correlationId);
          const m2 = transformer.transform(event as ReviewResponse, correlationId);
          expect(m1.type).toBe(m2.type);
          expect(m1.content).toBe(m2.content);
          expect(m1.agent).toBe(m2.agent);
          expect(m1.correlationId).toBe(m2.correlationId);
        },
      ),
      { numRuns: 100 },
    );
  });
});
