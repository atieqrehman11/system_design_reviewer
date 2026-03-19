/**
 * Tests for renderReviewReport.
 * Feature: generic-chat-ui
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderReviewReport } from '../renderReviewReport';
import type { ReportData } from '../../../core/types/core';

// ---------------------------------------------------------------------------
// Unit: renders ReportContent with the passed data
// ---------------------------------------------------------------------------

describe('renderReviewReport', () => {
  it('renders ReportContent when called with a ReportData object', () => {
    const report: ReportData = { my_field: 'hello world' };
    const node = renderReviewReport(report);
    const { container } = render(<>{node}</>);
    expect(container.firstChild).not.toBeNull();
  });

  it('rendered output contains expected field values from the passed data', () => {
    const report: ReportData = { status: 'ok', score: 95 };
    const node = renderReviewReport(report);
    render(<>{node}</>);
    // GenericReportRenderer / ReportContent renders string values as text
    expect(screen.getByText('ok')).toBeInTheDocument();
  });

  it('renders snake_case keys as human-readable labels', () => {
    const report: ReportData = { my_custom_field: 'value' };
    const node = renderReviewReport(report);
    render(<>{node}</>);
    // ReportContent uses labelFromKey which converts _ to space
    expect(screen.getByText('MY CUSTOM FIELD')).toBeInTheDocument();
  });

  it('returns a React element (not null or undefined)', () => {
    const report: ReportData = { key: 'val' };
    const node = renderReviewReport(report);
    expect(node).not.toBeNull();
    expect(node).not.toBeUndefined();
    expect(React.isValidElement(node)).toBe(true);
  });
});
