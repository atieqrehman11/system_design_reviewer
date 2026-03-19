/**
 * Smoke tests for the review-backend integration barrel export.
 * Verifies every public export is defined (not undefined).
 * Feature: generic-chat-ui
 */
import * as integrationExports from '../index';

// ---------------------------------------------------------------------------
// All named exports must be defined
// ---------------------------------------------------------------------------

const EXPECTED_EXPORTS = [
  'ReviewStreamEventTransformer',
  'reviewChatUIConfig',
  'renderReviewReport',
  'ReportContent',
] as const;

describe('review-backend barrel — all public exports are defined', () => {
  it.each(EXPECTED_EXPORTS.map((name) => [name]))(
    'export "%s" is defined',
    (name) => {
      expect(integrationExports[name as keyof typeof integrationExports]).toBeDefined();
    },
  );
});
