import { describe, expect, it } from 'vitest';
import { AREAS, WITH_PRESIDENT, holdersOf, keptPost, lastHolder } from './valdzia';
import { governmentResponseSchema, type Government } from '../services/api';

const post = (ministry_key: string, name: string, seq = 1, mp_id: string | null = null) => ({
  ministry_key, seq, name, title: 'ministras', from_date: null, basis: null, basis_url: null,
  source_url: 'https://www.lrp.lt/x.pdf', mp_id, mp_link_source_url: mp_id ? 'https://x.lrv.lt/cv' : null,
});
const gov = (number: number, posts: ReturnType<typeof post>[]): Government => ({
  number, numeral: String(number), mandate_from: null, mandate_basis: null, started_work_on: null,
  resigned_on: null, resign_basis: null, composition_basis: 'Dekretas', composition_url: 'https://www.lrp.lt/x.pdf',
  source_url: 'https://lrv.lt/', prime_minister: null, posts,
});

/** The fourteen keys of migration 050. */
const REGISTER = ['aplinka', 'ekonomika', 'energetika', 'finansai', 'gynyba', 'kultura', 'socialine',
  'susisiekimas', 'sveikata', 'svietimas', 'teisingumas', 'uzsienis', 'vidus', 'zemes_ukis'];

describe('AREAS', () => {
  it('places every ministry of the register on the map exactly once', () => {
    const placed = AREAS.flatMap((a) => a.ministries);
    expect([...placed].sort()).toEqual([...REGISTER].sort());
    expect(new Set(placed).size).toBe(placed.length);
  });

  it('keeps the ministries the President works with in the first row', () => {
    for (const key of WITH_PRESIDENT) expect(AREAS[0].ministries).toContain(key);
  });
});

describe('holders', () => {
  const xx = gov(20, [post('gynyba', 'A'), post('gynyba', 'B', 2), post('uzsienis', 'C')]);
  const xxi = gov(21, [post('gynyba', 'B'), post('uzsienis', 'C'), post('vidus', 'D')]);

  it('lists a replaced minister before the replacement', () => {
    expect(holdersOf(xx, 'gynyba').map((p) => p.name)).toEqual(['A', 'B']);
    expect(lastHolder(xx, 'gynyba')?.name).toBe('B');
  });

  it('says nothing for a ministry the register has no row for', () => {
    expect(lastHolder(xx, 'vidus')).toBeNull();
    expect(keptPost(xx, xxi, 'vidus')).toBe(false);
  });

  it('compares with whoever held the post last, not first', () => {
    expect(keptPost(xx, xxi, 'gynyba')).toBe(true);
    expect(keptPost(xx, xxi, 'uzsienis')).toBe(true);
    expect(keptPost(undefined, xx, 'uzsienis')).toBe(false);
  });
});

describe('wire contract', () => {
  it('keeps the member link and its source through parse', () => {
    const parsed = governmentResponseSchema.parse({
      available: true,
      president: { ...post('x', 'P'), ministry_key: undefined, seq: undefined },
      ministries: [{ key: 'gynyba', name: 'Krašto apsaugos ministerija', url: 'https://kam.lt/' }],
      governments: [gov(21, [post('gynyba', 'B', 1, 'uuid-1')])],
      presidential_acts: null,
      cabinet_decrees_after_register: [],
    });
    expect(parsed.governments[0].posts[0].mp_id).toBe('uuid-1');
    expect(parsed.governments[0].posts[0].mp_link_source_url).toBe('https://x.lrv.lt/cv');
  });

  it('accepts the absent-table shape', () => {
    const parsed = governmentResponseSchema.parse({ available: false, president: null, ministries: [], governments: [], presidential_acts: null, cabinet_decrees_after_register: [] });
    expect(parsed.available).toBe(false);
  });
});
