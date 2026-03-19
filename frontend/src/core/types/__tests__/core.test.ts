import { ApiError, MessageType, Message, StreamEventTransformer } from '../core';

describe('ApiError', () => {
  it('sets name to ApiError', () => {
    const error = new ApiError('something went wrong');
    expect(error.name).toBe('ApiError');
  });

  it('sets message correctly', () => {
    const error = new ApiError('test error message');
    expect(error.message).toBe('test error message');
  });

  it('exposes statusCode and errorType', () => {
    const error = new ApiError('bad request', 400, 'validation_error');
    expect(error.statusCode).toBe(400);
    expect(error.errorType).toBe('validation_error');
  });

  it('instanceof ApiError works correctly (prototype chain)', () => {
    const error = new ApiError('test');
    expect(error instanceof ApiError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });

  it('works with only message (optional params absent)', () => {
    const error = new ApiError('minimal error');
    expect(error.message).toBe('minimal error');
    expect(error.statusCode).toBeUndefined();
    expect(error.errorType).toBeUndefined();
  });
});

describe('MessageType enum', () => {
  it('USER equals "user"', () => {
    expect(MessageType.USER).toBe('user');
  });

  it('AGENT_THINKING equals "agent_thinking"', () => {
    expect(MessageType.AGENT_THINKING).toBe('agent_thinking');
  });

  it('AGENT_RESULT equals "agent_result"', () => {
    expect(MessageType.AGENT_RESULT).toBe('agent_result');
  });

  it('SYSTEM_COMPLETE equals "system_complete"', () => {
    expect(MessageType.SYSTEM_COMPLETE).toBe('system_complete');
  });

  it('ERROR equals "error"', () => {
    expect(MessageType.ERROR).toBe('error');
  });
});

describe('StreamEventTransformer interface', () => {
  it('is structurally correct — mock transformer is callable and returns correct types', () => {
    interface TestEvent {
      type: string;
      payload: string;
    }

    const mockTransformer: StreamEventTransformer<TestEvent> = {
      transform(event: TestEvent, correlationId: string): Message {
        return {
          id: correlationId,
          type: MessageType.USER,
          content: event.payload,
          timestamp: new Date(),
        };
      },
      isComplete(event: TestEvent): boolean {
        return event.type === 'done';
      },
    };

    const testEvent: TestEvent = { type: 'message', payload: 'hello' };
    const correlationId: string = 'corr-123';

    const result: Message = mockTransformer.transform(testEvent, correlationId);
    expect(result.id).toBe(correlationId);
    expect(result.type).toBe(MessageType.USER);
    expect(result.content).toBe('hello');
    expect(result.timestamp).toBeInstanceOf(Date);

    const doneEvent: TestEvent = { type: 'done', payload: '' };
    const notDoneEvent: TestEvent = { type: 'message', payload: 'still going' };
    expect(mockTransformer.isComplete(doneEvent)).toBe(true);
    expect(mockTransformer.isComplete(notDoneEvent)).toBe(false);
  });
});
