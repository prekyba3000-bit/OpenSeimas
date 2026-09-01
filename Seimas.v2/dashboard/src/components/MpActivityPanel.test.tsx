import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MpActivityPanel } from './MpActivityPanel';
import { mpActivitySchema } from '../services/api';

const trip = {
  date_from: '2026-03-24',
  date_to: '2026-04-04',
  title: 'Dėl Emanuelio Zingerio dalyvavimo profesinių mainų programoje',
  title_truncated: false,
};

describe('MpActivityPanel', () => {
  it('distinguishes "we cannot tell" from "there were none"', () => {
    const { unmount } = render(
      <MpActivityPanel data={{ travel: null, press_releases: [], travel_has_more: null, press_has_more: false, staff: [] }} />,
    );
    expect(screen.getByText('Duomenų nėra.')).toBeInTheDocument();
    expect(screen.queryByText('Komandiruočių neužfiksuota.')).not.toBeInTheDocument();
    unmount();

    render(<MpActivityPanel data={{ travel: [], press_releases: [], travel_has_more: false, press_has_more: false, staff: [] }} />);
    expect(screen.getByText('Komandiruočių neužfiksuota.')).toBeInTheDocument();
    expect(screen.queryByText('Duomenų nėra.')).not.toBeInTheDocument();
  });

  it('renders a trip with its date range', () => {
    render(<MpActivityPanel data={{ travel: [trip], press_releases: [], travel_has_more: false, press_has_more: false, staff: [] }} />);
    expect(screen.getByText(/profesinių mainų/)).toBeInTheDocument();
    // The year must be present: these lists span 2024-2026, so a bare
    // "kovo 24 d." would not say which March.
    expect(screen.getByText(/2026 m\..*kovo.*24.*2026 m\..*balandžio.*4/)).toBeInTheDocument();
  });

  it('marks a title the source clipped, rather than presenting it as whole', () => {
    render(
      <MpActivityPanel
        data={{ travel: [{ ...trip, title_truncated: true }], press_releases: [], travel_has_more: false, press_has_more: false, staff: [] }}
      />,
    );
    expect(screen.getByText('(pavadinimas šaltinyje nukirptas)')).toBeInTheDocument();
  });

  it('does not mark an intact title', () => {
    render(<MpActivityPanel data={{ travel: [trip], press_releases: [], travel_has_more: false, press_has_more: false, staff: [] }} />);
    expect(screen.queryByText('(pavadinimas šaltinyje nukirptas)')).not.toBeInTheDocument();
  });

  it('links a press release to its source when there is a url', () => {
    render(
      <MpActivityPanel
        data={{
          travel: [],
          press_releases: [
            { date: '2026-08-24', title: 'Pranešimas apie posėdį', url: 'https://lrs.lt/x' },
          ], travel_has_more: false, press_has_more: false, staff: [] }}
      />,
    );
    const link = screen.getByRole('link', { name: 'Pranešimas apie posėdį' });
    expect(link).toHaveAttribute('href', 'https://lrs.lt/x');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('renders a press release without a url as plain text, not a dead link', () => {
    render(
      <MpActivityPanel
        data={{ travel: [], press_releases: [{ date: '2026-08-24', title: 'Be nuorodos', url: null }], travel_has_more: false, press_has_more: false, staff: [] }}
      />,
    );
    expect(screen.getByText('Be nuorodos')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Be nuorodos' })).not.toBeInTheDocument();
  });

  it('says so when a list was cut, rather than showing it as complete', () => {
    render(
      <MpActivityPanel
        data={{ travel: [trip], press_releases: [], travel_has_more: true, press_has_more: false, staff: [] }}
      />,
    );
    expect(screen.getByText('Rodomi naujausi įrašai. Sąrašas nėra visas.')).toBeInTheDocument();
  });

  it('stays silent when the list is complete', () => {
    render(
      <MpActivityPanel
        data={{ travel: [trip], press_releases: [], travel_has_more: false, press_has_more: false, staff: [] }}
      />,
    );
    expect(screen.queryByText(/Sąrašas nėra visas/)).not.toBeInTheDocument();
  });

  it('publishes no count of either list', () => {
    // The standing rule from the diary design note: trip and release frequency
    // track office, so a number beside a name reads as diligence. Three trips
    // must not produce a "3" anywhere.
    const { container } = render(
      <MpActivityPanel
        data={{
          travel: [trip, { ...trip, date_from: '2026-05-01' }, { ...trip, date_from: '2026-06-01' }],
          press_releases: [{ date: '2026-08-24', title: 'A', url: null }],
          travel_has_more: false, press_has_more: false, staff: [],
        }}
      />,
    );
    const headings = Array.from(container.querySelectorAll('h3')).map((h) => h.textContent ?? '');
    for (const heading of headings) {
      expect(heading).not.toMatch(/\d/);
    }
  });
});

describe('mpActivitySchema is the wire contract', () => {
  it('keeps every field the API sends', () => {
    // Through parse, not around it. Hand-built fixtures are exactly how a
    // stripped key once emptied metrics_provenance without a test noticing.
    const parsed = mpActivitySchema.parse({
      travel: [trip],
      press_releases: [{ date: '2026-08-24', title: 'A', url: 'https://x' }],
      travel_has_more: false,
      press_has_more: false,
      staff: [],
    });
    expect(parsed.travel?.[0].title_truncated).toBe(false);
    expect(parsed.travel?.[0].date_to).toBe('2026-04-04');
    expect(parsed.press_releases[0].url).toBe('https://x');
  });

  it('preserves null travel rather than coercing it to an empty list', () => {
    expect(mpActivitySchema.parse({ travel: null, press_releases: [], travel_has_more: null, press_has_more: false, staff: [] }).travel).toBeNull();
  });

  it('accepts an open-ended trip', () => {
    expect(
      mpActivitySchema.parse({ travel: [{ ...trip, date_to: null }], press_releases: [], travel_has_more: false, press_has_more: false, staff: [] })
        .travel?.[0].date_to,
    ).toBeNull();
  });

  it('never renders a contact detail, because none is fetched', () => {
    // The privacy line is structural: mp_assistants has no contact column and
    // the parser drops the feed's phone numbers. This asserts the surface end
    // of that, so a future field cannot quietly start rendering.
    const { container } = render(
      <MpActivityPanel
        data={{
          travel: [], press_releases: [], travel_has_more: false, press_has_more: false,
          staff: [
            { first_name: 'Arvydas', last_name: 'Domanskis', in_constituency: false },
            { first_name: 'Gintarė', last_name: 'Kačinskienė', in_constituency: true },
          ],
        }}
      />,
    );
    expect(screen.getByText('Arvydas Domanskis')).toBeInTheDocument();
    expect(container.textContent ?? '').not.toMatch(/@|\d{5,}/);
  });

  it('labels a constituency post only when the source said so', () => {
    render(
      <MpActivityPanel
        data={{
          travel: [], press_releases: [], travel_has_more: false, press_has_more: false,
          staff: [
            { first_name: 'A', last_name: 'B', in_constituency: null },
            { first_name: 'C', last_name: 'D', in_constituency: true },
          ],
        }}
      />,
    );
    // null is "the source did not say", not "no".
    expect(screen.getAllByText('apygardoje')).toHaveLength(1);
  });

  it('separates unknown staff from none recorded', () => {
    const { unmount } = render(
      <MpActivityPanel
        data={{ travel: [], press_releases: [], travel_has_more: false, press_has_more: false, staff: null }}
      />,
    );
    expect(screen.getAllByText('Duomenų nėra.').length).toBeGreaterThan(0);
    unmount();
    render(
      <MpActivityPanel
        data={{ travel: [], press_releases: [], travel_has_more: false, press_has_more: false, staff: [] }}
      />,
    );
    expect(screen.getByText('Padėjėjų neužfiksuota.')).toBeInTheDocument();
  });
});
