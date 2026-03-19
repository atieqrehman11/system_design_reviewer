import { generateMessageId, generateCorrelationId } from '../id';

// ---------------------------------------------------------------------------
// Parameterized: both generators produce non-empty strings and unique values
// ---------------------------------------------------------------------------

it.each([
  ['generateMessageId', generateMessageId],
  ['generateCorrelationId', generateCorrelationId],
])('%s — returns a non-empty string', (_label, generatorFn) => {
  const result = generatorFn();
  expect(typeof result).toBe('string');
  expect(result.length).toBeGreaterThan(0);
});

it.each([
  ['generateMessageId', generateMessageId],
  ['generateCorrelationId', generateCorrelationId],
])('%s — produces unique values across two calls', (_label, generatorFn) => {
  const first = generatorFn();
  const second = generatorFn();
  expect(first).not.toBe(second);
});

// ---------------------------------------------------------------------------
// Unit: prefix conventions
// ---------------------------------------------------------------------------

describe('generateMessageId', () => {
  it('starts with "msg_"', () => {
    expect(generateMessageId()).toMatch(/^msg_/);
  });

  it('contains a UUID segment after the prefix', () => {
    const id = generateMessageId();
    const uuid = id.replace('msg_', '');
    // UUID v4 pattern
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});

describe('generateCorrelationId', () => {
  it('starts with "corr_"', () => {
    expect(generateCorrelationId()).toMatch(/^corr_/);
  });

  it('contains a UUID segment after the prefix', () => {
    const id = generateCorrelationId();
    const uuid = id.replace('corr_', '');
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});
