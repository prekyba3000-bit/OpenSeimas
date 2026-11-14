import { describe, expect, it } from 'vitest';
import { getRouteTitle } from './routeTitles';

describe('getRouteTitle', () => {
  // Found by eye on production 2026-11-14: the Valdžia page had no entry and
  // fell through to the overview's title.
  it('names the Valdžia page rather than falling through to the overview', () => {
    expect(getRouteTitle('/dashboard/valdzia')).toBe('Valdžia · Atviras Seimas');
    expect(getRouteTitle('/dashboard')).toBe('Apžvalga · Atviras Seimas');
  });
});
