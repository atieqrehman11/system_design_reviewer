import * as fc from 'fast-check';
import { createDefaultChatUIConfig, validateChatUIConfig, ChatUIConfig } from '../ChatUIConfig';

const REQUIRED_FIELDS = [
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

// Parameterized: required field validation
it.each(REQUIRED_FIELDS)(
  'validateChatUIConfig throws when %s is empty string',
  (field) => {
    const config = createDefaultChatUIConfig({ [field]: '' } as Partial<ChatUIConfig>);
    expect(() => validateChatUIConfig(config)).toThrow(`required field '${field}'`);
  },
);

// Parameterized: override behaviour
it.each([
  ['appTitle', 'My Custom App'],
  ['assistantName', 'My Bot'],
  ['submitEndpoint', '/custom/submit'],
])(
  'createDefaultChatUIConfig overrides %s correctly',
  (field, value) => {
    const config = createDefaultChatUIConfig({ [field]: value } as Partial<ChatUIConfig>);
    expect((config as unknown as Record<string, unknown>)[field]).toBe(value);
  },
);

// Unit: default config passes validation
it('createDefaultChatUIConfig() with no args returns a config that passes validateChatUIConfig', () => {
  const config = createDefaultChatUIConfig();
  expect(() => validateChatUIConfig(config)).not.toThrow();
});

// Unit: maxFileSizeBytes is derived
it('createDefaultChatUIConfig() fileUpload.maxFileSizeBytes equals maxFileSizeMB * 1024 * 1024', () => {
  const config = createDefaultChatUIConfig();
  expect(config.fileUpload.maxFileSizeBytes).toBe(config.fileUpload.maxFileSizeMB * 1024 * 1024);
});

// Unit: partial override retains other defaults
it('createDefaultChatUIConfig({ appTitle: "X" }) sets appTitle to "X" and retains default appSubtitle', () => {
  const defaults = createDefaultChatUIConfig();
  const config = createDefaultChatUIConfig({ appTitle: 'X' });
  expect(config.appTitle).toBe('X');
  expect(config.appSubtitle).toBe(defaults.appSubtitle);
});

// Property P2: validateChatUIConfig throws with field name in message for any empty required field
// Feature: generic-chat-ui, Property 2: Missing required config field throws descriptive Error
it('P2: validateChatUIConfig throws with field name in message for any empty required field', () => {
  fc.assert(
    fc.property(fc.constantFrom(...REQUIRED_FIELDS), (field) => {
      const config = createDefaultChatUIConfig({ [field]: '' } as Partial<ChatUIConfig>);
      expect(() => validateChatUIConfig(config)).toThrow(field);
    }),
    { numRuns: 100 },
  );
});
