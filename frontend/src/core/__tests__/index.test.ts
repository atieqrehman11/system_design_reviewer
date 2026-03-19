/**
 * Smoke tests for the core barrel export.
 * Verifies every public export is defined (not undefined).
 * Feature: generic-chat-ui
 */
import * as coreExports from '../index';

// ---------------------------------------------------------------------------
// All named exports must be defined
// ---------------------------------------------------------------------------

const EXPECTED_EXPORTS = [
  'MessageType',
  'ApiError',
  'createDefaultChatUIConfig',
  'validateChatUIConfig',
  'ChatInterface',
  'MessageBubble',
  'useChatInterface',
  'generateMessageId',
  'generateCorrelationId',
  'mergeAgentResult',
  'findLastThinkingIndex',
] as const;

describe('core barrel — all public exports are defined', () => {
  it.each(EXPECTED_EXPORTS.map((name) => [name]))(
    'export "%s" is defined',
    (name) => {
      expect(coreExports[name as keyof typeof coreExports]).toBeDefined();
    },
  );
});
