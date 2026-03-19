/**
 * Public API for the review-backend integration.
 * Only import from this file when consuming the integration from outside src/integrations/.
 */

// Transformer
export { ReviewStreamEventTransformer } from './transformer';

// Config
export { reviewChatUIConfig } from './constants';

// Report renderer
export { renderReviewReport } from './renderReviewReport';

// Domain types
export type {
  ReviewResponse,
  ReviewReport,
  ReviewScorecard,
  ReviewFinding,
} from './types';

// ReportContent component (for direct use if needed)
export { ReportContent } from './ReportContent';
export type { ReportContentProps } from './ReportContent';
