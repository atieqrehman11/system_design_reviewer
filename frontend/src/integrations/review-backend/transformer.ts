/**
 * ReviewStreamEventTransformer — maps raw review-backend NDJSON events
 * to generic core Messages.
 *
 * Both methods are pure functions: no state mutation, no side effects.
 * Implements StreamEventTransformer<ReviewResponse> from src/core.
 */
import type { Message, StreamEventTransformer } from '../../core/types/core';
import { MessageType } from '../../core/types/core';
import { generateMessageId } from '../../core/utils/id';
import type { ReviewResponse } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EVENT_TYPE_THINKING = 'thinking';
const EVENT_TYPE_RESULT = 'result';
const STATUS_COMPLETE = 'complete';
const STATUS_COMPLETED = 'completed';

// ---------------------------------------------------------------------------
// Private message builders — each ≤ 10 lines, single responsibility
// ---------------------------------------------------------------------------

function buildBaseMessage(
  correlationId: string,
  agent?: string,
): Pick<Message, 'id' | 'timestamp' | 'correlationId' | 'agent'> {
  return {
    id: generateMessageId(),
    timestamp: new Date(),
    correlationId,
    agent,
  };
}

function buildThinkingMessage(event: ReviewResponse, correlationId: string): Message {
  return {
    ...buildBaseMessage(correlationId, event.agent),
    type: MessageType.AGENT_THINKING,
    content: event.message ?? '',
  };
}

function buildResultMessage(event: ReviewResponse, correlationId: string): Message {
  const content = event.message ?? (event.agent ? `${event.agent} completed the analysis` : 'Analysis complete');
  return {
    ...buildBaseMessage(correlationId, event.agent),
    type: MessageType.AGENT_RESULT,
    content,
    report: event.report,
  };
}

function buildCompleteMessage(event: ReviewResponse, correlationId: string): Message {
  return {
    ...buildBaseMessage(correlationId),
    type: MessageType.SYSTEM_COMPLETE,
    content: event.message ?? 'Review complete',
  };
}

function buildErrorMessage(event: ReviewResponse, correlationId: string): Message {
  return {
    ...buildBaseMessage(correlationId),
    type: MessageType.ERROR,
    content: event.message ?? 'Unknown event type',
  };
}

// ---------------------------------------------------------------------------
// Transformer class
// ---------------------------------------------------------------------------

/**
 * Maps raw ReviewResponse events from the review-backend NDJSON stream
 * to generic core Message objects.
 *
 * Both `transform` and `isComplete` are pure — they read only their arguments
 * and produce no side effects.
 */
export class ReviewStreamEventTransformer
  implements StreamEventTransformer<ReviewResponse>
{
  /**
   * Convert a raw ReviewResponse event to a generic Message.
   * Pure function — no state mutation, no side effects.
   */
  transform(event: ReviewResponse, correlationId: string): Message {
    if (event.message_type === EVENT_TYPE_THINKING) {
      return buildThinkingMessage(event, correlationId);
    }
    if (event.message_type === EVENT_TYPE_RESULT) {
      return buildResultMessage(event, correlationId);
    }
    if (event.status === STATUS_COMPLETE || event.status === STATUS_COMPLETED) {
      return buildCompleteMessage(event, correlationId);
    }
    return buildErrorMessage(event, correlationId);
  }

  /**
   * Return true when this event signals the end of the stream.
   * Pure function — no state mutation, no side effects.
   */
  isComplete(event: ReviewResponse): boolean {
    return event.status === STATUS_COMPLETE || event.status === STATUS_COMPLETED;
  }
}
