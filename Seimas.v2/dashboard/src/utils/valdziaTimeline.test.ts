import { describe, expect, it } from 'vitest';
import type { GovernmentResponse } from '../services/api';
import { buildTimeline, position, quarterTicks } from './valdziaTimeline';

const URL = 'https://www.lrp.lt/x.pdf';
const holder = (name: string, from_date: string | null = null) => ({
  name, title: 'ministras', from_date, basis: null, basis_url: null, source_url: URL, mp_id: null, mp_link_source_url: null,
});
const post = (ministry_key: string, name: string, seq = 1, from_date: string | null = null) =>
  ({ ...holder(name, from_date), ministry_key, seq });
const gov = (number: number, numeral: string, dates: { mandate_from?: string | null; started_work_on?: string | null; resigned_on?: string | null },
  pm: ReturnType<typeof holder> | null, posts: ReturnType<typeof post>[]) => ({
  number, numeral, mandate_from: null, started_work_on: null, resigned_on: null, ...dates,
  mandate_basis: null, resign_basis: null, composition_basis: 'x', composition_url: URL, source_url: URL,
  prime_minister: pm, posts,
});

const DATA: GovernmentResponse = {
  available: true,
  president: null,
  ministries: [
    { key: 'gynyba', name: 'Krašto apsaugos ministerija', url: URL },
    { key: 'uzsienis', name: 'Užsienio reikalų ministerija', url: URL },
  ],
  governments: [
    gov(19, 'XIX', { mandate_from: '2024-12-12', resigned_on: '2025-08-04' }, holder('Pirmas Premjeras', '2024-11-21'), [
      post('uzsienis', 'Jonas Pastovus'),
      post('gynyba', 'Rasa Pakeista'),
    ]),
    gov(20, 'XX', { mandate_from: '2025-09-25', resigned_on: '2026-06-23' }, holder('Rasa Pakeista', '2025-08-26'), [
      post('uzsienis', 'Jonas Pastovus'),
      post('gynyba', 'Ona Trumpoji'), post('gynyba', 'Petras Naujas', 2, '2025-11-11'),
    ]),
    gov(21, 'XXI', { started_work_on: '2026-07-14' }, holder('Trečias Premjeras', '2026-06-30'), [
      post('uzsienis', 'Jonas Pastovus'),
      post('gynyba', 'Petras Naujas'),
    ]),
  ],
  presidential_acts: {
    since: '2024-11-04', through: '2026-11-09',
    veto: [{ decree_no: '1K-455', listed_on: '2025-10-03', title: 'VETO', url: URL }],
    bill: [], treaty: [{ decree_no: null, listed_on: '2024-11-04', title: 'SUTARTIS', url: null }], nomination: [],
  },
  cabinet_decrees_after_register: [],
};

const seg = (t: ReturnType<typeof buildTimeline>, row: string, name: string) =>
  t.segments.filter((s) => s.row === row && s.holder.name === name);

describe('buildTimeline', () => {
  const t = buildTimeline(DATA, '2026-11-17');

  it('ends a minister where the replacement starts, and starts the replacement on their own date', () => {
    expect(seg(t, 'gynyba', 'Ona Trumpoji')).toEqual([expect.objectContaining({ from: '2025-09-25', to: '2025-11-11', open: false })]);
    expect(seg(t, 'gynyba', 'Petras Naujas')[0]).toMatchObject({ government: 'XX', from: '2025-11-11', to: '2026-06-23' });
  });

  it('ends at the resignation and leaves the gap to the next Government empty (§1.1)', () => {
    const [xix, xx] = seg(t, 'uzsienis', 'Jonas Pastovus');
    expect(xix).toMatchObject({ from: '2024-12-12', to: '2025-08-04' });
    expect(xx).toMatchObject({ from: '2025-09-25', kept: true });
  });

  it('runs the current Government open to today; a start of work stands in for an unknown mandate', () => {
    expect(seg(t, 'uzsienis', 'Jonas Pastovus')[2]).toMatchObject({ government: 'XXI', from: '2026-07-14', to: '2026-11-17', open: true });
    expect(t.governments.map((g) => [g.numeral, g.from, g.to, g.open])).toEqual([
      ['XIX', '2024-12-12', '2025-08-04', false],
      ['XX', '2025-09-25', '2026-06-23', false],
      ['XXI', '2026-07-14', '2026-11-17', true],
    ]);
  });

  it('starts a Prime Minister on the appointment, and follows one person across rows', () => {
    expect(seg(t, 'pm', 'Rasa Pakeista')[0]).toMatchObject({ from: '2025-08-26', to: '2026-06-23', kept: false });
    expect(t.segments.filter((s) => s.holder.name === 'Rasa Pakeista').map((s) => s.row)).toEqual(['gynyba', 'pm']);
  });

  it('marks a kept post only for the first holder of the same person in the same row', () => {
    expect(seg(t, 'gynyba', 'Petras Naujas')[1]).toMatchObject({ government: 'XXI', kept: true });
    expect(seg(t, 'gynyba', 'Ona Trumpoji')[0].kept).toBe(false);
  });

  it('counts a post without a date instead of drawing it at a made-up one (§1.1)', () => {
    const data = structuredClone(DATA);
    data.governments[1].posts[2].from_date = null; // replacement with no date: neither half can be placed
    const u = buildTimeline(data, '2026-11-17');
    expect(u.undated).toBe(2);
    expect(seg(u, 'gynyba', 'Ona Trumpoji')).toEqual([]);

    data.governments[0].mandate_from = null;
    expect(buildTimeline(data, '2026-11-17').governments.map((g) => g.numeral)).toEqual(['XX', 'XXI']);
  });

  it('spans whole months from the earliest date to past today, and puts every decree on it', () => {
    expect([t.start, t.end]).toEqual(['2024-11-01', '2026-12-01']);
    expect(t.decrees.map((d) => [d.kind, d.decree.listed_on])).toEqual([['treaty', '2024-11-04'], ['veto', '2025-10-03']]);
  });

  it('has no decrees when the register is unread — and does not invent any (§1.2)', () => {
    expect(buildTimeline({ ...DATA, presidential_acts: null }, '2026-11-17').decrees).toEqual([]);
  });
});

describe('axis', () => {
  const t = { start: '2024-11-01', end: '2026-12-01' };

  it('maps the ends to 0 and 100', () => {
    expect(position(t, '2024-11-01')).toBe(0);
    expect(position(t, '2026-12-01')).toBe(100);
  });

  it('ticks quarter starts, with the year on January', () => {
    expect(quarterTicks(t).map((q) => q.label)).toEqual(['2025', 'bal', 'liep', 'spal', '2026', 'bal', 'liep', 'spal']);
  });
});
