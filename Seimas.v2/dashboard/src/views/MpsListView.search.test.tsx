import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { api } from '../services/api';
import MpsListView from './MpsListView';

vi.mock('../services/api', async () => {
  const actual = await vi.importActual<typeof import('../services/api')>('../services/api');
  return { ...actual, api: { ...actual.api, getMps: vi.fn(), searchMps: vi.fn() } };
});

/**
 * Evaluation CORA-01: typing in the search box replaced every matching
 * member's figures with 0 votes and „0 %" attendance, because the hits came
 * from a different endpoint and were mapped with hard-coded zeros. A faction
 * query, which the placeholder invites, returned nothing at all.
 */
const ROSTER = [
  { id: 'a', name: 'Agnė Bilotaitė', normalized_name: 'agne bilotaite', party: 'TS-LKD frakcija', is_active: true, photo_url: '', vote_count: 4210, attendance: 72.04, vote_mode: null },
  { id: 'b', name: 'Aidas Gedvilas', normalized_name: 'aidas gedvilas', party: '„Nemuno aušros“ frakcija', is_active: true, photo_url: '', vote_count: 3900, attendance: null, vote_mode: null },
  { id: 'c', name: 'Šarūnas Birutis', normalized_name: 'sarunas birutis', party: 'Demokratų frakcija „Vardan Lietuvos“', is_active: true, photo_url: '', vote_count: 3100, attendance: 88.5, vote_mode: null },
];

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <MpsListView />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const card = (name: string) => screen.getByRole('link', { name: new RegExp(name) });
// Wait past the old 300 ms debounce, so a server round-trip (if any) has landed.
const settle = () => new Promise((r) => setTimeout(r, 450));
const search = async (q: string) => {
  await userEvent.type(screen.getByPlaceholderText(/Ieškoti pagal vardą ar frakciją/), q);
  await settle();
};

beforeEach(() => {
  vi.mocked(api.getMps).mockReset();
  vi.mocked(api.getMps).mockResolvedValue(ROSTER as never);
  vi.mocked(api.searchMps).mockReset();
  // What the heroes search endpoint answers: profiles, not roster rows.
  vi.mocked(api.searchMps).mockImplementation(async (q: string) => ({
    results: ROSTER.filter((m) => m.normalized_name.includes(q.toLowerCase())).map((m) => ({
      mp: { id: m.id, name: m.name, party: m.party, active: true, photo: '' },
    })),
  }) as never);
});

describe('members list search', () => {
  it('shows a searched member with the figures the list shows', async () => {
    renderView();
    await screen.findByRole('link', { name: /Agnė Bilotaitė/ });
    const browsing = within(card('Agnė Bilotaitė')).getByText('72 %');

    await search('bilo');

    expect(within(card('Agnė Bilotaitė')).getByText('72 %').textContent).toBe(browsing.textContent);
    expect(within(card('Agnė Bilotaitė')).getByText('4210')).toBeInTheDocument();
    expect(screen.queryByText('0 %')).toBeNull();
    expect(api.searchMps).not.toHaveBeenCalled();
  });

  it('keeps an unknown attendance unknown while searching', async () => {
    renderView();
    await screen.findByRole('link', { name: /Aidas Gedvilas/ });
    await search('gedv');
    expect(within(card('Aidas Gedvilas')).queryByText(/\d+ %/)).toBeNull();
  });

  it('ignores accents, so „sarunas" finds Šarūnas', async () => {
    renderView();
    await screen.findByRole('link', { name: /Šarūnas Birutis/ });
    await search('sarunas');
    expect(card('Šarūnas Birutis')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Agnė Bilotaitė/ })).toBeNull();
  });

  it('finds a faction by name, as the placeholder invites', async () => {
    renderView();
    await screen.findByRole('link', { name: /Aidas Gedvilas/ });
    await search('nemuno');
    expect(card('Aidas Gedvilas')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Agnė Bilotaitė/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /Šarūnas Birutis/ })).toBeNull();
  });
});
