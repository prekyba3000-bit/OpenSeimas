import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../services/api';
import type { GovernmentResponse } from '../services/api';
import { ValdziaView } from './ValdziaView';

vi.mock('../services/api', async () => {
  const actual = await vi.importActual<typeof import('../services/api')>('../services/api');
  return { ...actual, api: { ...actual.api, getGovernment: vi.fn() } };
});

const DECREE = 'https://www.lrp.lt/data/public/uploads/x.pdf';
const holder = (name: string, mp_id: string | null = null) => ({
  name, title: 'ministras', from_date: null, basis: 'Dekretas Nr. 1K-1', basis_url: DECREE, source_url: DECREE,
  mp_id, mp_link_source_url: mp_id ? 'https://x.lrv.lt/cv' : null,
});
const post = (ministry_key: string, name: string, seq = 1, mp_id: string | null = null, from_date: string | null = null) =>
  ({ ...holder(name, mp_id), ministry_key, seq, from_date });
const gov = (number: number, numeral: string, pm: string, posts: ReturnType<typeof post>[]) => ({
  number, numeral, mandate_from: '2025-09-25', mandate_basis: null, started_work_on: null, resigned_on: null,
  resign_basis: null, composition_basis: 'Dekretas Nr. 1K-1', composition_url: DECREE, source_url: 'https://lrv.lt/',
  prime_minister: holder(pm), posts,
});

const DATA: GovernmentResponse = {
  available: true,
  president: holder('Prezidentė Pavyzdė'),
  ministries: [
    { key: 'uzsienis', name: 'Užsienio reikalų ministerija', url: 'https://www.urm.lt/' },
    { key: 'gynyba', name: 'Krašto apsaugos ministerija', url: 'https://kam.lt/' },
    { key: 'finansai', name: 'Finansų ministerija', url: 'https://finmin.lrv.lt/lt/' },
  ],
  governments: [
    gov(20, 'XX', 'Ona Pirmoji', [
      post('uzsienis', 'Jonas Pastovus'),
      post('gynyba', 'Rasa Pakeista'), post('gynyba', 'Petras Naujas', 2, null, '2025-11-11'),
      post('finansai', 'Ona Antroji'),
    ]),
    gov(21, 'XXI', 'Ona Antroji', [
      post('uzsienis', 'Jonas Pastovus'),
      post('gynyba', 'Petras Naujas', 1, 'mp-uuid'),
      // finansai: no row on purpose
    ]),
  ],
};

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><ValdziaView /></MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(api.getGovernment).mockReset();
  vi.mocked(api.getGovernment).mockResolvedValue(DATA);
});

describe('ValdziaView', () => {
  it('puts the President in the foreign and security row only, beside those two ministries', async () => {
    renderView();
    expect(await screen.findByText('Prezidentė Pavyzdė')).toBeInTheDocument();
    expect(screen.getAllByText('Prezidentė Pavyzdė')).toHaveLength(1);
    // Two tiles carry the marker; the finance tile does not.
    expect(screen.getAllByText('dirba kartu su Prezidentu')).toHaveLength(2);
  });

  it('shows the minister of the current Government, with the decree behind the name', async () => {
    renderView();
    const map = (await screen.findByRole('heading', { name: 'Kas už ką atsako šiandien' })).closest('section')!;
    expect(within(map).getByText('Petras Naujas')).toBeInTheDocument();
    expect(within(map).queryByText('Rasa Pakeista')).not.toBeInTheDocument();
    expect(within(map).getAllByRole('link', { name: /Dekretas Nr\. 1K-1/ })[0]).toHaveAttribute('href', DECREE);
  });

  it('links a minister to a Seimas profile only where the register confirms it (§1.1)', async () => {
    renderView();
    const map = (await screen.findByRole('heading', { name: 'Kas už ką atsako šiandien' })).closest('section')!;
    expect(within(map).getByRole('link', { name: 'Petras Naujas' })).toHaveAttribute('href', '/dashboard/mps/mp-uuid');
    expect(within(map).queryByRole('link', { name: 'Jonas Pastovus' })).not.toBeInTheDocument();
    expect(within(map).getAllByText('ir Seimo narys')).toHaveLength(1);
  });

  it('follows the gender of the decree title in the member mark', async () => {
    const data = structuredClone(DATA);
    data.governments[1].posts[1].title = 'krašto apsaugos ministrė';
    vi.mocked(api.getGovernment).mockResolvedValue(data);
    renderView();
    expect(await screen.findByText('ir Seimo narė')).toBeInTheDocument();
    expect(screen.queryByText('ir Seimo narys')).not.toBeInTheDocument();
  });

  it('says it has no record for a ministry without a row instead of leaving a blank (§1.1)', async () => {
    renderView();
    const map = (await screen.findByRole('heading', { name: 'Kas už ką atsako šiandien' })).closest('section')!;
    expect(within(map).getByText('Ministro įrašo neturime')).toBeInTheDocument();
  });

  it('highlights every office of a person when their name is pressed', async () => {
    renderView();
    const table = await screen.findByRole('table');
    const buttons = within(table).getAllByRole('button', { name: 'Ona Antroji' });
    expect(buttons).toHaveLength(2); // finance minister in XX, Prime Minister in XXI
    await userEvent.click(buttons[0]);
    for (const b of within(table).getAllByRole('button', { name: 'Ona Antroji' })) {
      expect(b).toHaveAttribute('aria-pressed', 'true');
    }
    expect(within(table).getAllByRole('button', { name: 'Jonas Pastovus' })[0]).toHaveAttribute('aria-pressed', 'false');
  });

  it('marks a kept post for screen readers, and shows the date of a replacement', async () => {
    renderView();
    const table = await screen.findByRole('table');
    expect(within(table).getAllByText('Liko tose pačiose pareigose:', { exact: false })).toHaveLength(2);
    expect(within(table).getByText('nuo 2025-11-11:', { exact: false })).toBeInTheDocument();
  });

  it('renders no cabinet when the register is absent', async () => {
    vi.mocked(api.getGovernment).mockResolvedValue({ available: false, president: null, ministries: [], governments: [] });
    renderView();
    expect(await screen.findByText('Vyriausybės ir Prezidento duomenų šiuo metu neturime.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
