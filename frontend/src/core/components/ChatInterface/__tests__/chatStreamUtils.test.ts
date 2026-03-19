/**
 * Tests for chatStreamUtils.ts — pure stream utility functions.
 * Feature: generic-chat-ui
 */
import * as fc from 'fast-check';
import { mergeAgentResult, findLastThinkingIndex } from '../chatStreamUtils';
import { MessageType } from '../../../types/core';
import type { Message } from '../../../types/core';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: crypto.randomUUID(),
    type: MessageType.USER,
    content: 'test',
    timestamp: new Date(),
    correlationId: 'corr-1',
    ...overrides,
  };
}

function makeThinking(agent: string, correlationId = 'corr-1'): Message {
  return makeMessage({ type: MessageType.AGENT_THINKING, agent, correlationId });
}

function makeResult(agent: string, correlationId = 'corr-1'): Message {
  return makeMessage({ type: MessageType.AGENT_RESULT, agent, correlationId });
}

// ---------------------------------------------------------------------------
// findLastThinkingIndex
// ---------------------------------------------------------------------------

describe('findLastThinkingIndex', () => {
  it('returns -1 for empty list', () => {
    expect(findLastThinkingIndex([], 'agent-a', 'corr-1')).toBe(-1);
  });

  it('returns -1 when no matching AGENT_THINKING exists', () => {
    const msgs = [makeMessage(), makeResult('agent-a')];
    expect(findLastThinkingIndex(msgs, 'agent-a', 'corr-1')).toBe(-1);
  });

  it('returns the index of the last matching AGENT_THINKING', () => {
    const first = makeThinking('agent-a');
    const second = makeThinking('agent-a');
    const msgs = [first, makeMessage(), second];
    expect(findLastThinkingIndex(msgs, 'agent-a', 'corr-1')).toBe(2);
  });

  it('does not match a different agent', () => {
    const msgs = [makeThinking('agent-b')];
    expect(findLastThinkingIndex(msgs, 'agent-a', 'corr-1')).toBe(-1);
  });

  it('does not match a different correlationId', () => {
    const msgs = [makeThinking('agent-a', 'corr-other')];
    expect(findLastThinkingIndex(msgs, 'agent-a', 'corr-1')).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// mergeAgentResult — parameterized unit tests
// ---------------------------------------------------------------------------

describe('mergeAgentResult', () => {
  it.each([
    [
      'non-AGENT_RESULT appends to list',
      [makeMessage()],
      makeMessage({ type: MessageType.USER }),
      2,
      false,
    ],
    [
      'AGENT_RESULT with no matching thinking appends',
      [makeMessage()],
      makeResult('agent-a'),
      2,
      false,
    ],
  ])('%s', (_label, inputList, incoming, expectedLength, _idPreserved) => {
    const result = mergeAgentResult(inputList, incoming, 'corr-1');
    expect(result).toHaveLength(expectedLength);
    expect(result[result.length - 1]).toEqual(incoming);
  });

  it('AGENT_RESULT with matching thinking replaces in-place and preserves original id', () => {
    const thinking = makeThinking('agent-a');
    const originalId = thinking.id;
    const result = makeResult('agent-a');
    const msgs = [makeMessage(), thinking, makeMessage()];

    const updated = mergeAgentResult(msgs, result, 'corr-1');

    expect(updated).toHaveLength(3);
    expect(updated[1].id).toBe(originalId);
    expect(updated[1].type).toBe(MessageType.AGENT_RESULT);
    expect(updated[1].content).toBe(result.content);
  });

  it('does not mutate the original array', () => {
    const msgs = [makeThinking('agent-a')];
    const frozen = [...msgs];
    mergeAgentResult(msgs, makeResult('agent-a'), 'corr-1');
    expect(msgs).toEqual(frozen);
  });
});

// ---------------------------------------------------------------------------
// Property P5: replace preserves list length and original id
// Feature: generic-chat-ui, Property 5: mergeAgentResult replace preserves length and id
// ---------------------------------------------------------------------------

describe('Property P5: replace preserves list length and original id', () => {
  it('when AGENT_RESULT matches a thinking message, length is unchanged and id is preserved', () => {
    const agentArb = fc.string({ minLength: 1, maxLength: 20 });
    const corrArb = fc.string({ minLength: 1, maxLength: 20 });

    fc.assert(
      fc.property(agentArb, corrArb, (agent, correlationId) => {
        const thinking = makeThinking(agent, correlationId);
        const originalId = thinking.id;
        const prefix = Array.from({ length: 3 }, () => makeMessage());
        const msgs = [...prefix, thinking];

        const incoming = makeResult(agent, correlationId);
        const result = mergeAgentResult(msgs, incoming, correlationId);

        expect(result).toHaveLength(msgs.length);
        const replaced = result.find((m) => m.id === originalId);
        expect(replaced).toBeDefined();
        expect(replaced?.type).toBe(MessageType.AGENT_RESULT);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property P6: append always increases length by exactly 1
// Feature: generic-chat-ui, Property 6: non-AGENT_RESULT always appends
// ---------------------------------------------------------------------------

describe('Property P6: any non-AGENT_RESULT message always appends (length + 1)', () => {
  it('appends for USER, AGENT_THINKING, SYSTEM_COMPLETE, ERROR types', () => {
    const nonResultTypes = [
      MessageType.USER,
      MessageType.AGENT_THINKING,
      MessageType.SYSTEM_COMPLETE,
      MessageType.ERROR,
    ] as const;

    const listArb = fc.array(
      fc.record({
        id: fc.string({ minLength: 1 }),
        type: fc.constantFrom(...nonResultTypes),
        content: fc.string(),
        timestamp: fc.constant(new Date()),
        correlationId: fc.constant('corr-1'),
      }),
    );

    const typeArb = fc.constantFrom(...nonResultTypes);

    fc.assert(
      fc.property(listArb, typeArb, (list, type) => {
        const incoming = makeMessage({ type });
        const result = mergeAgentResult(list as Message[], incoming, 'corr-1');
        expect(result).toHaveLength(list.length + 1);
      }),
      { numRuns: 100 },
    );
  });
});
