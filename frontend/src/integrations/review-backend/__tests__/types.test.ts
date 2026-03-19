/**
 * Tests for review-backend integration types.
 * Feature: generic-chat-ui
 */
import type { ReviewFinding, ReviewReport, ReviewResponse } from '../types';

// ---------------------------------------------------------------------------
// ReviewFinding priority values
// ---------------------------------------------------------------------------

describe('ReviewFinding — priority values', () => {
  it.each([
    ['High'],
    ['Medium'],
    ['Low'],
  ] as const)('accepts priority "%s"', (priority) => {
    const finding: ReviewFinding = {
      priority,
      category: 'Architecture',
      finding: 'Some finding',
      impact: 'High impact',
      fix: 'Apply fix',
    };
    expect(finding.priority).toBe(priority);
  });
});

// ---------------------------------------------------------------------------
// ReviewReport index signature
// ---------------------------------------------------------------------------

describe('ReviewReport — index signature allows extra keys', () => {
  it('accepts arbitrary extra keys alongside required fields', () => {
    const report: ReviewReport = {
      data_available: true,
      generated_at: '2024-01-01T00:00:00Z',
      extra_agent_report: { score: 90 },
      another_key: 'value',
    };
    expect(report.data_available).toBe(true);
    expect(report['extra_agent_report']).toEqual({ score: 90 });
    expect(report['another_key']).toBe('value');
  });

  it('accepts optional scorecard and findings', () => {
    const report: ReviewReport = {
      data_available: true,
      generated_at: '2024-01-01T00:00:00Z',
      scorecard: {
        architecture_health: 'Good',
        primary_risks: 'None',
        primary_bottleneck: 'DB',
      },
      findings: [
        {
          priority: 'High',
          category: 'Security',
          finding: 'SQL injection',
          impact: 'Critical',
          fix: 'Use parameterised queries',
        },
      ],
    };
    expect(report.scorecard?.architecture_health).toBe('Good');
    expect(report.findings).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// ReviewResponse optional fields
// ---------------------------------------------------------------------------

describe('ReviewResponse — optional fields', () => {
  it('accepts a minimal event with no fields set', () => {
    const event: ReviewResponse = {};
    expect(event.agent).toBeUndefined();
    expect(event.status).toBeUndefined();
  });

  it('accepts a fully populated event', () => {
    const event: ReviewResponse = {
      agent: 'Design Reviewer',
      message_type: 'result',
      status: 'complete',
      message: 'Done',
      report: { data_available: true, generated_at: '2024-01-01T00:00:00Z' },
    };
    expect(event.agent).toBe('Design Reviewer');
    expect(event.report?.data_available).toBe(true);
  });
});
