import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import listed from '../data/portraits.json';
import { portraitThumb } from './portraitThumb';

const vrk = (id: string) =>
  `https://www.vrk.lt/statiniai/puslapiai/rinkimai/1544/rnk1870/kandidatai/kandImg/photo_${id}.jpeg`;

describe('portraitThumb', () => {
  it('serves our copy of a listed VRK portrait', () => {
    expect(portraitThumb(vrk(listed[0]))).toBe(`/portraits/photo_${listed[0]}.jpg`);
  });

  it('keeps the original when we have no copy', () => {
    expect(portraitThumb(vrk('1'))).toBe(vrk('1'));
  });

  it('leaves other sources alone', () => {
    const commons = 'https://commons.wikimedia.org/wiki/Special:FilePath/X.jpg?width=600';
    expect(portraitThumb(commons)).toBe(commons);
  });

  it('is undefined without a photo', () => {
    expect(portraitThumb(null)).toBeUndefined();
    expect(portraitThumb('')).toBeUndefined();
  });

  it('lists exactly the files that exist, so no listed copy is a broken image', () => {
    const files = readdirSync(resolve(process.cwd(), 'public/portraits'))
      .map((f) => f.replace(/^photo_(\d+)\.jpg$/, '$1'))
      .sort();
    expect(files).toEqual([...listed].sort());
  });
});
