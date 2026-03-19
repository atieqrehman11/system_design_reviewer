/**
 * renderReviewReport — thin wrapper that renders a ReportData payload
 * using the domain-specific ReportContent component.
 *
 * Passed as the `renderReport` prop to ChatInterface so the core layer
 * never imports domain-specific rendering logic.
 */
import React from 'react';
import type { ReportData } from '../../core/types/core';
import { ReportContent } from './ReportContent';

/**
 * Render a review report as a rich structured UI.
 * Intended to be passed as `renderReport` to `<ChatInterface />`.
 *
 * @param report - Generic report payload from the core Message type.
 * @returns A React node rendered by ReportContent.
 */
export function renderReviewReport(report: ReportData): React.ReactNode {
  return <ReportContent report={report} />;
}
