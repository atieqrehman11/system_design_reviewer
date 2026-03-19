import React from 'react';
import { render, screen } from '@testing-library/react';
import fc from 'fast-check';
import GenericReportRenderer from '../GenericReportRenderer';

// ---------------------------------------------------------------------------
// Parameterized: value formatting
// ---------------------------------------------------------------------------

it.each([
  ['true boolean', { flag: true }, '✓ Yes'],
  ['false boolean', { flag: false }, '✗ No'],
  ['null value', { field: null }, 'None'],
  ['undefined value', { field: undefined }, 'Not set'],
  ['empty array', { items: [] }, 'Empty list'],
  ['zero number', { count: 0 }, '0'],
  ['large number', { count: 1000 }, (1000).toLocaleString()],
  ['string value', { name: 'hello' }, 'hello'],
])(
  'renders %s correctly',
  (_label, report, expectedText) => {
    render(<GenericReportRenderer report={report} />);
    expect(screen.getByText(expectedText)).toBeInTheDocument();
  },
);

// ---------------------------------------------------------------------------
// Parameterized: key display (snake_case → Title Case)
// ---------------------------------------------------------------------------

it.each([
  ['single word', { name: 'val' }, 'Name'],
  ['snake_case key', { first_name: 'val' }, 'First Name'],
  ['multi_word_key', { some_long_key: 'val' }, 'Some Long Key'],
  ['already_title', { my_field: 'val' }, 'My Field'],
])(
  'formats key %s as title case',
  (_label, report, expectedKey) => {
    render(<GenericReportRenderer report={report} />);
    expect(screen.getByText(expectedKey)).toBeInTheDocument();
  },
);

// ---------------------------------------------------------------------------
// Unit: nested object renders recursively
// ---------------------------------------------------------------------------

describe('GenericReportRenderer — nested objects', () => {
  it('renders nested object keys recursively', () => {
    render(
      <GenericReportRenderer
        report={{ outer: { inner_key: 'inner value' } }}
      />,
    );
    expect(screen.getByText('Inner Key')).toBeInTheDocument();
    expect(screen.getByText('inner value')).toBeInTheDocument();
  });

  it('renders array of primitives as individual items', () => {
    render(<GenericReportRenderer report={{ tags: ['alpha', 'beta'] }} />);
    expect(screen.getByText('alpha')).toBeInTheDocument();
    expect(screen.getByText('beta')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Property P11: boolean and empty-value formatting
// Feature: generic-chat-ui, Property 11: booleans render as ✓ Yes / ✗ No
// ---------------------------------------------------------------------------

describe('P11 — boolean formatting', () => {
  it('always renders true as "✓ Yes"', () => {
    fc.assert(
      fc.property(fc.boolean(), (value) => {
        const { unmount } = render(<GenericReportRenderer report={{ flag: value }} />);
        const expected = value ? '✓ Yes' : '✗ No';
        expect(screen.getByText(expected)).toBeInTheDocument();
        unmount();
      }),
      { numRuns: 20 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property P12: number formatting uses toLocaleString
// Feature: generic-chat-ui, Property 12: numbers rendered with toLocaleString
// ---------------------------------------------------------------------------

describe('P12 — number formatting', () => {
  it('renders integers with toLocaleString()', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1_000_000, max: 1_000_000 }),
        (value) => {
          const { unmount } = render(<GenericReportRenderer report={{ count: value }} />);
          expect(screen.getByText(value.toLocaleString())).toBeInTheDocument();
          unmount();
        },
      ),
      { numRuns: 50 },
    );
  });

  it('renders floats with toLocaleString()', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -1000, max: 1000, noNaN: true }),
        (value) => {
          const { unmount } = render(<GenericReportRenderer report={{ score: value }} />);
          expect(screen.getByText(value.toLocaleString())).toBeInTheDocument();
          unmount();
        },
      ),
      { numRuns: 50 },
    );
  });
});
