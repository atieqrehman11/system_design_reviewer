import { ReviewResponse, Message, MessageType } from '../../types';
import { generateMessageId } from '../../utils/id';
import { EVENT_TYPES, EVENT_STATUS } from './types';

/**
 * Create base message properties
 */
function createBaseMessage(
  correlationId: string
): Pick<Message, 'id' | 'timestamp' | 'correlationId'> {
  return {
    id: generateMessageId(),
    timestamp: new Date(),
    correlationId,
  };
}

/**
 * Create thinking message
 */
function createThinkingMessage(event: ReviewResponse, correlationId: string): Message {
  return {
    ...createBaseMessage(correlationId),
    type: MessageType.AGENT_THINKING,
    content: event.message || 'Thinking...',
    agent: event.agent,
  };
}

/**
 * Create result message
 */
function createResultMessage(event: ReviewResponse, correlationId: string): Message {
  // Create a more intuitive completion message
  let content = event.message;
  
  if (!content) {
    // If no message provided, create a friendly completion message
    if (event.agent) {
      content = `${event.agent} completed the analysis`;
    } else {
      content = 'Analysis complete';
    }
  }

  return {
    ...createBaseMessage(correlationId),
    type: MessageType.AGENT_RESULT,
    content,
    agent: event.agent,
    report: event.report,
  };
}

/**
 * Create completion message
 */
function createCompletionMessage(event: ReviewResponse, correlationId: string): Message {
  return {
    ...createBaseMessage(correlationId),
    type: MessageType.SYSTEM_COMPLETE,
    content: event.message || 'Review complete',
  };
}

/**
 * Create error message
 */
function createErrorMessage(event: ReviewResponse, correlationId: string): Message {
  return {
    ...createBaseMessage(correlationId),
    type: MessageType.ERROR,
    content: event.message || 'Unknown event type',
  };
}

/**
 * Transform a ReviewResponse event into a Message object
 */
export function transformEventToMessage(
  event: ReviewResponse,
  correlationId: string
): Message {
  if (event.message_type === EVENT_TYPES.THINKING) {
    return createThinkingMessage(event, correlationId);
  }

  if (event.message_type === EVENT_TYPES.RESULT) {
    return createResultMessage(event, correlationId);
  }

  if (event.status === EVENT_STATUS.COMPLETE) {
    return createCompletionMessage(event, correlationId);
  }

  return createErrorMessage(event, correlationId);
}
