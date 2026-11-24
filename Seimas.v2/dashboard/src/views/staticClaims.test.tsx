import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { api } from '../services/api';
import type { SeimasSession } from '../services/api';
import FactionsView from './FactionsView';
import SessionsView from './SessionsView';
import { StatTrio } from '../components/StatTrio';

vi.mock('../services/api', async () => {
  const actual = await vi.importActual<typeof import('../services/api')>('../services/api');
  return { ...actual, api: { ...actual.api, getMps: vi.fn(), getVotes: vi.fn(), getSessions: vi.fn() } };
});

/**
 * Evaluation CORF-05 and CORF-06: precise-looking statements no data backs.
 */
function renderIn(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(api.getVotes).mockResolvedValue([] as never);
});

describe('a faction with no publishable attendance', () => {
  it('draws no bar beside „—"', async () => {
    vi.mocked(api.getMps).mockResolvedValue([
      { id: 'n', name: 'Naujas Narys', normalized_name: 'naujas narys', party: 'Trumpoji frakcija',
        is_active: true, photo_url: '', vote_count: 0, attendance: null, vote_mode: null },
    ] as never);
    const { container } = renderIn(<FactionsView />);
    await screen.findAllByRole('heading', { level: 3 });
    const bars = Array.from(container.querySelectorAll<HTMLElement>('.h-1\\.5 > div'));
    expect(bars).toHaveLength(0);
  });
});

describe('the chamber statistics', () => {
  it('does not divide the roll-call count by members', () => {
    render(
      <MemoryRouter>
        <StatTrio stats={{ seats_total: 141, mps_active: 140, historical_votes: "5300", sitting_days: 130 } as never} />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/vienam nariui/)).toBeNull();
  });
});

describe('the sessions timeline', () => {
  it('labels its ends from the sessions it draws', async () => {
    const sessions: SeimasSession[] = [
      { id: 146, number: 63, name: '5 eilinė', date_from: '2026-09-10', date_to: null, status: 'sitting', vote_count: 40, sitting_days: 3 },
      { id: 136, number: 55, name: '1 eilinė', date_from: '2024-11-14', date_to: '2024-12-23', status: 'ended', vote_count: 300, sitting_days: 10 },
    ];
    vi.mocked(api.getSessions).mockResolvedValue({ sessions, source: 'lrs', votes_unassigned: 0 } as never);
    renderIn(<SessionsView />);
    expect(await screen.findByText('2024 m. lapkritis')).toBeInTheDocument();
    expect(screen.getByText('2026 m. rugsėjis →')).toBeInTheDocument();
    expect(screen.queryByText('2026 m. kovas →')).toBeNull();
  });
});
