import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { MpDiaryTimeline } from './MpDiaryTimeline';
import { api, mpDiarySchema } from '../services/api';

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, networkMode: 'always' } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const event = {
  starts_at: '2026-09-10 13:00',
  ends_at: '2026-09-10 15:00',
  location: null as string | null,
  title: 'Seimo rytinis posėdis',
};

beforeEach(() => vi.restoreAllMocks());

describe('MpDiaryTimeline', () => {
  it('publishes no count of the calendar', async () => {
    // The standing rule: diary length tracks office, not effort. Three events
    // must not produce a "3" in the heading.
    vi.spyOn(api, 'getMpDiary').mockResolvedValue({
      events: [
        event,
        { ...event, starts_at: '2026-09-09 13:00', title: 'Komiteto posėdis' },
        { ...event, starts_at: '2026-09-08 13:00', title: 'Frakcijos pasitarimas' },
      ],
      has_more: false,
    });
    const { container } = wrap(<MpDiaryTimeline mpId="x" />);
    await waitFor(() => expect(screen.getByText('Komiteto posėdis')).toBeInTheDocument());
    for (const h of Array.from(container.querySelectorAll('h3'))) {
      expect(h.textContent ?? '').not.toMatch(/\d/);
    }
  });

  it('distinguishes "cannot tell" from "genuinely empty"', async () => {
    vi.spyOn(api, 'getMpDiary').mockResolvedValue({ events: null, has_more: null });
    const { unmount } = wrap(<MpDiaryTimeline mpId="x" />);
    await waitFor(() => expect(screen.getByText('Duomenų nėra.')).toBeInTheDocument());
    unmount();

    vi.spyOn(api, 'getMpDiary').mockResolvedValue({ events: [], has_more: false });
    wrap(<MpDiaryTimeline mpId="y" />);
    await waitFor(() =>
      expect(screen.getByText('Darbotvarkės įrašų neužfiksuota.')).toBeInTheDocument(),
    );
  });

  it('omits a blank location rather than implying there was none', async () => {
    vi.spyOn(api, 'getMpDiary').mockResolvedValue({ events: [event], has_more: false });
    wrap(<MpDiaryTimeline mpId="x" />);
    await waitFor(() => expect(screen.getByText('Seimo rytinis posėdis')).toBeInTheDocument());
    // 89% of events have no location at source; nothing may be invented for them.
    expect(screen.queryByText(/·\s*$/)).not.toBeInTheDocument();
  });

  it('shows a location when the source gave one', async () => {
    vi.spyOn(api, 'getMpDiary').mockResolvedValue({
      events: [{ ...event, location: 'Konstitucijos salė' }],
      has_more: false,
    });
    wrap(<MpDiaryTimeline mpId="x" />);
    await waitFor(() => expect(screen.getByText(/Konstitucijos salė/)).toBeInTheDocument());
  });

  it('offers paging only when another page exists', async () => {
    vi.spyOn(api, 'getMpDiary').mockResolvedValue({ events: [event], has_more: false });
    const { unmount } = wrap(<MpDiaryTimeline mpId="x" />);
    await waitFor(() => expect(screen.getByText('Seimo rytinis posėdis')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Vėlesni' })).not.toBeInTheDocument();
    unmount();

    vi.spyOn(api, 'getMpDiary').mockResolvedValue({ events: [event], has_more: true });
    wrap(<MpDiaryTimeline mpId="y" />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Vėlesni' })).toBeEnabled(),
    );
  });
});

describe('mpDiarySchema', () => {
  it('keeps every field and preserves null events', () => {
    const parsed = mpDiarySchema.parse({ events: [event], has_more: true });
    expect(parsed.events?.[0].location).toBeNull();
    expect(parsed.events?.[0].ends_at).toBe('2026-09-10 15:00');
    expect(parsed.has_more).toBe(true);
    expect(mpDiarySchema.parse({ events: null, has_more: null }).events).toBeNull();
  });

  it('exposes no total, so no surface can render one', () => {
    const parsed = mpDiarySchema.parse({ events: [event], has_more: true, total: 4024 });
    expect('total' in parsed).toBe(false);
  });
});
