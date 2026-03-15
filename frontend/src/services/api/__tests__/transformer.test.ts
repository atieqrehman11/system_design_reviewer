import { transformEventToMessage } from '../transformer';
import { MessageType, ReviewResponse } from '../../../types';

describe('transformEventToMessage', () => {
  const correlationId = 'test-correlation-id';

  it('should transform thinking event to AGENT_THINKING message', () => {
    const event: ReviewResponse = {
      message_type: 'thinking',
      message: 'Analyzing design...',
      agent: 'Design Reviewer',
    };

    const result = transformEventToMessage(event, correlationId);

    expect(result.type).toBe(MessageType.AGENT_THINKING);
    expect(result.content).toBe('Analyzing design...');
    expect(result.agent).toBe('Design Reviewer');
    expect(result.correlationId).toBe(correlationId);
    expect(result.id).toBeDefined();
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it('should transform result event to AGENT_RESULT message', () => {
    const event: ReviewResponse = {
      message_type: 'result',
      message: 'Analysis complete',
      agent: 'Design Reviewer',
      report: { findings: ['issue1', 'issue2'] },
    };

    const result = transformEventToMessage(event, correlationId);

    expect(result.type).toBe(MessageType.AGENT_RESULT);
    expect(result.content).toBe('Analysis complete');
    expect(result.agent).toBe('Design Reviewer');
    expect(result.report).toEqual({ findings: ['issue1', 'issue2'] });
    expect(result.correlationId).toBe(correlationId);
  });

  it('should create friendly completion message when no message provided', () => {
    const event: ReviewResponse = {
      message_type: 'result',
      agent: 'Design Reviewer',
      report: { findings: ['issue1'] },
    };

    const result = transformEventToMessage(event, correlationId);

    expect(result.type).toBe(MessageType.AGENT_RESULT);
    expect(result.content).toBe('Design Reviewer completed the analysis');
    expect(result.agent).toBe('Design Reviewer');
  });

  it('should use generic message when no agent name provided', () => {
    const event: ReviewResponse = {
      message_type: 'result',
      report: { findings: ['issue1'] },
    };

    const result = transformEventToMessage(event, correlationId);

    expect(result.type).toBe(MessageType.AGENT_RESULT);
    expect(result.content).toBe('Analysis complete');
  });

  it('should transform complete status to SYSTEM_COMPLETE message', () => {
    const event: ReviewResponse = {
      status: 'complete',
      message: 'Review finished',
    };

    const result = transformEventToMessage(event, correlationId);

    expect(result.type).toBe(MessageType.SYSTEM_COMPLETE);
    expect(result.content).toBe('Review finished');
    expect(result.correlationId).toBe(correlationId);
  });

  it('should transform unknown event to ERROR message', () => {
    const event: ReviewResponse = {
      message: 'Unknown event',
    };

    const result = transformEventToMessage(event, correlationId);

    expect(result.type).toBe(MessageType.ERROR);
    expect(result.content).toBe('Unknown event');
  });

  it('should use default content when message is missing', () => {
    const event: ReviewResponse = {
      message_type: 'thinking',
      agent: 'Test Agent',
    };

    const result = transformEventToMessage(event, correlationId);

    expect(result.content).toBe('Thinking...');
  });
});
