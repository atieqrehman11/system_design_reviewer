/**
 * Tests for reviewChatUIConfig.
 * Feature: generic-chat-ui
 */
import * as fc from 'fast-check';
import { reviewChatUIConfig } from '../constants';
import { validateChatUIConfig } from '../../../core/config/ChatUIConfig';
import type { ChatUIConfig } from '../../../core/config/ChatUIConfig';

// ---------------------------------------------------------------------------
// Required string fields — all must be non-empty
// ---------------------------------------------------------------------------

const REQUIRED_STRING_FIELDS: ReadonlyArray<keyof ChatUIConfig> = [
  'appTitle',
  'appSubtitle',
  'inputPlaceholder',
  'chatPlaceholder',
  'submitButtonText',
  'emptyStateMessage',
  'assistantName',
  'apiBaseUrl',
  'submitEndpoint',
  'chatEndpoint',
];

describe('reviewChatUIConfig — required string fields', () => {
  it.each(REQUIRED_STRING_FIELDS.map((f) => [f]))(
    'field "%s" is present and non-empty',
    (field) => {
      const value = reviewChatUIConfig[field];
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    },
  );
});

// ---------------------------------------------------------------------------
// maxFileSizeBytes is derived, not hardcoded
// ---------------------------------------------------------------------------

describe('reviewChatUIConfig — fileUpload derivation', () => {
  it('maxFileSizeBytes equals maxFileSizeMB * 1024 * 1024', () => {
    const { maxFileSizeMB, maxFileSizeBytes } = reviewChatUIConfig.fileUpload;
    expect(maxFileSizeBytes).toBe(maxFileSizeMB * 1024 * 1024);
  });
});

// ---------------------------------------------------------------------------
// validateChatUIConfig passes without throwing
// ---------------------------------------------------------------------------

describe('reviewChatUIConfig — validation', () => {
  it('validateChatUIConfig does not throw', () => {
    expect(() => validateChatUIConfig(reviewChatUIConfig)).not.toThrow();
  });

  it('assistantName is "Architect Assistant"', () => {
    expect(reviewChatUIConfig.assistantName).toBe('Architect Assistant');
  });
});

// ---------------------------------------------------------------------------
// Property P2: overriding any required field to '' throws with field name
// Feature: generic-chat-ui, Property 2: validateChatUIConfig rejects empty required fields
// ---------------------------------------------------------------------------

describe('P2 — validateChatUIConfig rejects empty required string fields', () => {
  it('setting any required field to empty string throws with field name in message', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...REQUIRED_STRING_FIELDS),
        (field) => {
          const broken = { ...reviewChatUIConfig, [field]: '' };
          expect(() => validateChatUIConfig(broken as ChatUIConfig)).toThrow(field);
        },
      ),
      { numRuns: REQUIRED_STRING_FIELDS.length },
    );
  });
});
