import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { GovernmentResponse } from '../services/api';
import { ValdziaTimeline } from './ValdziaTimeline';

const URL = 'https://www.lrp.lt/x.pdf';
const holder = (name: string, title: string, from_date: string | null = null) => ({
  name, title, from_date, basis: null, basis_url: null, source_url: URL, mp_id: null, mp_link_source_url: null,
});
const post = (ministry_key: string, name: string, title: string) => ({ ...holder(name, title), ministry_key, seq: 1 });
const gov = (number: number, numeral: string, mandate_from: string, resigned_on: string | null,
  pm: ReturnType<typeof holder>, posts: ReturnType<typeof post>[]) => ({
  number, numeral, mandate_from, started_work_on: null, resigned_on, mandate_basis: null, resign_basis: null,
  composition_basis: 'x', composition_url: URL, source_url: URL, prime_minister: pm, posts,
});

const DATA: GovernmentResponse = {
  available: true,
  president: null,
  ministries: [{ key: 'socialine', name: 'Socialinės apsaugos ir darbo ministerija', url: URL }],
  governments: [
    gov(19, 'XIX', '2024-12-12', '2025-08-04', holder('Pirmas Premjeras', 'Ministras Pirmininkas', '2024-11-21'),
      [post('socialine', 'Ona Grįžtanti', 'socialinės apsaugos ir darbo ministrė')]),
    gov(20, 'XX', '2025-09-25', null, holder('Ona Grįžtanti', 'Ministrė Pirmininkė', '2025-08-26'),
      [post('socialine', 'Jonas Kitas', 'socialinės apsaugos ir darbo ministras')]),
  ],
  presidential_acts: {
    since: '2024-11-04', through: '2026-11-09',
    veto: [{ decree_no: '1K-455', listed_on: '2025-10-03', title: 'DĖL ĮSTATYMO GRĄŽINIMO', url: URL }],
    bill: [], nomination: [],
    treaty: [{ decree_no: null, listed_on: '2025-01-06', title: 'DĖL TEIKIMO RATIFIKUOTI B', url: null }],
  },
  cabinet_decrees_after_register: [],
};

function Harness({ data = DATA }: { data?: GovernmentResponse }) {
  const [picked, setPicked] = useState<string | null>(null);
  return <ValdziaTimeline data={data} picked={picked} onPick={(n) => setPicked((p) => (p === n ? null : n))} today="2026-11-17" />;
}

describe('ValdziaTimeline', () => {
  it('draws one bar per person per post, each named with its dates; the current one runs to today', () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: 'Ona Grįžtanti, socialinės apsaugos ir darbo ministrė, XIX Vyriausybė, nuo 2024-12-12 iki 2025-08-04' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jonas Kitas, socialinės apsaugos ir darbo ministras, XX Vyriausybė, nuo 2025-09-25 iki šiol' })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(4);
  });

  it('pressing a bar picks the person: all their posts, in order, and only theirs', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /^Ona Grįžtanti, socialinės/ }));
    for (const b of screen.getAllByRole('button', { name: /^Ona Grįžtanti/ })) expect(b).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^Jonas Kitas/ })).toHaveAttribute('aria-pressed', 'false');
    // The connecting line, in words, once the pointer leaves.
    await userEvent.unhover(screen.getByRole('button', { name: /^Ona Grįžtanti, socialinės/ }));
    expect(screen.getByText(/socialinės apsaugos ir darbo ministrė \(XIX, nuo 2024-12-12 iki 2025-08-04\) → Ministrė Pirmininkė \(XX, nuo 2025-08-26 iki šiol\)/)).toBeInTheDocument();
  });

  it('puts each decree on its lane, linked where lrp.lt links a file', async () => {
    render(<Harness />);
    expect(screen.getByRole('link', { name: '2025-10-03 · Nr. 1K-455 · DĖL ĮSTATYMO GRĄŽINIMO' })).toHaveAttribute('href', URL);
    expect(screen.queryByRole('link', { name: /RATIFIKUOTI B/ })).not.toBeInTheDocument();
    expect(screen.getByText('Veto')).toBeInTheDocument();
    await userEvent.hover(screen.getByRole('link', { name: /1K-455/ }));
    expect(screen.getByText('DĖL ĮSTATYMO GRĄŽINIMO')).toBeInTheDocument();
  });

  it('says the decree register is unread rather than drawing empty lanes (§1.2)', () => {
    render(<Harness data={{ ...DATA, presidential_acts: null }} />);
    expect(screen.queryByText('Veto')).not.toBeInTheDocument();
    expect(screen.getByText(/dekretai dar neįkelti/)).toBeInTheDocument();
  });

  it('names how many posts it could not date instead of placing them (§1.1)', () => {
    const data = structuredClone(DATA);
    data.governments[1].mandate_from = null;
    render(<Harness data={data} />);
    expect(screen.queryByRole('button', { name: /^Jonas Kitas/ })).not.toBeInTheDocument();
    expect(screen.getByText(/1 pareigų įrašų be datos/)).toBeInTheDocument();
  });

  it('shows time only — no score, rank or duration on any bar (§1.3)', () => {
    render(<Harness />);
    for (const b of screen.getAllByRole('button')) expect(b.getAttribute('aria-label')).not.toMatch(/\d+\s*(d\.|dien|mėn|%)/);
  });
});
