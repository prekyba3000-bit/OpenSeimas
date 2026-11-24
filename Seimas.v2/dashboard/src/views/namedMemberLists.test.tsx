import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { api } from '../services/api';
import { trustApi } from '../services/trust';
import FactionsView from './FactionsView';
import SkaidrumasHubView from './SkaidrumasHubView';

vi.mock('../services/api', async () => {
  const actual = await vi.importActual<typeof import('../services/api')>('../services/api');
  return {
    ...actual,
    api: {
      ...actual.api,
      getMps: vi.fn(),
      getStats: vi.fn(),
      getVotes: vi.fn(),
      getLoyaltyGraph: vi.fn(),
    },
  };
});

/**
 * Evaluation CORF-01: the order of a list of named people is itself a claim.
 * The hub listed members under 60 % attendance lowest first, beneath
 * „Neįmanoma būti suktam.", and each faction's roster was ordered by
 * attendance with a vote-for / vote-against coloured grade. Attendance is
 * deliberately the reverse of the alphabet here, so any metric ordering shows.
 */
const ROSTER = [
  { id: 'z', name: 'Žygimantas Zarauskas', normalized_name: 'zygimantas zarauskas', party: 'TS-LKD frakcija', is_active: true, photo_url: '', vote_count: 10, attendance: 98, vote_mode: null },
  { id: 'm', name: 'Marius Mažeika', normalized_name: 'marius mazeika', party: 'TS-LKD frakcija', is_active: true, photo_url: '', vote_count: 10, attendance: 55, vote_mode: null },
  { id: 'a', name: 'Aistė Aleknienė', normalized_name: 'aiste alekniene', party: 'TS-LKD frakcija', is_active: true, photo_url: '', vote_count: 10, attendance: 12, vote_mode: null },
];
const NAMES_ALPHABETICAL = ['Aistė Aleknienė', 'Marius Mažeika', 'Žygimantas Zarauskas'];

function renderIn(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

const VERDICT_TOKENS = /--vote-for|--vote-against|--attention/;

beforeEach(() => {
  vi.mocked(api.getMps).mockResolvedValue(ROSTER as never);
  vi.mocked(api.getStats).mockResolvedValue({ historical_votes: 100, seats_total: 141, mps_active: 140 } as never);
  vi.mocked(api.getVotes).mockResolvedValue([] as never);
  vi.mocked(api.getLoyaltyGraph).mockResolvedValue({ alignment: [] } as never);
  vi.spyOn(trustApi, 'listCorrections').mockResolvedValue({ corrections: [] } as never);
});

describe('faction roster', () => {
  it('lists members by name, not by attendance', async () => {
    renderIn(<FactionsView />);
    await userEvent.click((await screen.findAllByRole('heading', { level: 3 }))[0]);
    const links = await screen.findAllByRole('link', { name: /Aleknienė|Mažeika|Zarauskas/ });
    expect(links.map((l) => NAMES_ALPHABETICAL.find((n) => l.textContent?.includes(n)))).toEqual(NAMES_ALPHABETICAL);
  });

  it('paints no member in vote-for / vote-against colours', async () => {
    const { container } = renderIn(<FactionsView />);
    await userEvent.click((await screen.findAllByRole('heading', { level: 3 }))[0]);
    await screen.findAllByRole('link', { name: /Aleknienė/ });
    const styled = Array.from(container.querySelectorAll<HTMLElement>('[style]'))
      .filter((el) => VERDICT_TOKENS.test(el.getAttribute('style') ?? ''));
    expect(styled.map((el) => el.textContent)).toEqual([]);
  });
});

describe('transparency hub', () => {
  it('names no member by attendance and carries no verdict headline', async () => {
    renderIn(<SkaidrumasHubView />);
    const main = await screen.findByRole('heading', { level: 1 });
    expect(main.textContent).not.toMatch(/sukt/i);
    expect(screen.queryByText(/žemiau 60/i)).toBeNull();
    for (const name of NAMES_ALPHABETICAL) {
      expect(screen.queryByText(name)).toBeNull();
    }
  });

  it('does not count members under a threshold in the ticker', async () => {
    renderIn(<SkaidrumasHubView />);
    await screen.findByRole('heading', { level: 1 });
    expect(within(document.body).queryAllByText(/Dalyvavimas žemiau/)).toEqual([]);
  });
});
