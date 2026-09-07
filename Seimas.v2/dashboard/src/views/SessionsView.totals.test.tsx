import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { api } from '../services/api';
import type { SeimasSession } from '../services/api';
import SessionsView from './SessionsView';

vi.mock('../services/api', async () => {
  const actual = await vi.importActual<typeof import('../services/api')>('../services/api');
  return { ...actual, api: { ...actual.api, getVotes: vi.fn(), getSessions: vi.fn() } };
});

/**
 * The totals a reader sees are counted in SQL, not in this browser.
 *
 * This page used to fetch the 2,600 most recent votes and count them itself.
 * There are 5,286. Measured against production on 2026-09-07, that window
 * contained 1,812 of session 144's votes (all of them), 781 of session 141's
 * 1,554 — and none at all of sessions 140, 139 and 143, which hold 1,517, 391
 * and 5. So three sessions read „0 balsavimų" and „Balsavimų duomenų nerasta",
 * and a fourth published less than half its total, in the confident voice of a
 * finished number.
 */
const SESSIONS: SeimasSession[] = [
  { id: 144, number: 60, name: '4 eilinė', date_from: '2026-03-10', date_to: '2026-07-14',
    status: 'ended', vote_count: 1812, sitting_days: 29 },
  { id: 140, number: 58, name: '2 eilinė', date_from: '2025-03-10', date_to: '2025-06-30',
    status: 'ended', vote_count: 1517, sitting_days: 27 },
  { id: 145, number: 62, name: '5 eilinė', date_from: '2099-09-10', date_to: null,
    status: 'upcoming', vote_count: 0, sitting_days: 0 },
];

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SessionsView />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(api.getSessions).mockReset();
  vi.mocked(api.getVotes).mockReset();
});

describe('session totals', () => {
  it('shows the counted total, not the number of votes it happened to download', async () => {
    vi.mocked(api.getSessions).mockResolvedValue({ sessions: SESSIONS, source: 'p2b' });
    // A sample that reaches only the newest session — exactly the situation
    // that made the page publish zeroes.
    vi.mocked(api.getVotes).mockResolvedValue([
      { id: '1', date: '2026-07-14', title: 'Dėl ko nors', result: null },
    ] as never);

    renderView();
    // Rendered twice each — the headline figure and the timeline bar's label.
    // Both now read the counted total; the bar used to scale itself against
    // the sample's maximum as well.
    expect(await screen.findAllByText('1517')).not.toHaveLength(0);
    expect(screen.getAllByText('1812')).not.toHaveLength(0);
    expect(screen.getByText('27')).toBeInTheDocument();
  });

  it('asks for a bounded page of votes, not thousands', async () => {
    vi.mocked(api.getSessions).mockResolvedValue({ sessions: SESSIONS, source: 'p2b' });
    vi.mocked(api.getVotes).mockResolvedValue([] as never);
    renderView();
    await screen.findAllByText('1812');
    const [limit] = vi.mocked(api.getVotes).mock.calls[0];
    expect(limit).toBeLessThanOrEqual(500);
  });

  it('renders an unavailable count as unknown, never as zero', async () => {
    // `vote_count: null` means the votes table is absent. Zero would say the
    // session met and decided nothing.
    vi.mocked(api.getSessions).mockResolvedValue({
      sessions: [{ ...SESSIONS[0], vote_count: null, sitting_days: null }],
      source: 'p2b',
    });
    vi.mocked(api.getVotes).mockResolvedValue([] as never);
    renderView();
    const dashes = await screen.findAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('does not claim a session has no votes when the sample simply does not reach it', async () => {
    vi.mocked(api.getSessions).mockResolvedValue({ sessions: SESSIONS, source: 'p2b' });
    vi.mocked(api.getVotes).mockResolvedValue([] as never);
    renderView();

    const heading = await screen.findByText('2 eilinė');
    await userEvent.click(heading);
    expect(screen.queryByText(/Balsavimų duomenų nerasta/)).not.toBeInTheDocument();
    expect(screen.getByText(/rodomi tik naujausi balsavimai/i)).toBeInTheDocument();
  });

  it('still says a session that has not begun has not begun', async () => {
    vi.mocked(api.getSessions).mockResolvedValue({ sessions: SESSIONS, source: 'p2b' });
    vi.mocked(api.getVotes).mockResolvedValue([] as never);
    renderView();
    expect(await screen.findByText(/Sesija dar neprasidėjo/)).toBeInTheDocument();
  });
});
