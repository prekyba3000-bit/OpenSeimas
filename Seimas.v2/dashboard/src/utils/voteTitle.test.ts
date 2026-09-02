import { describe, it, expect } from 'vitest';
import { isTruncatedTitle } from './voteTitle';

describe('isTruncatedTitle', () => {
  it('marks a title cut at the source cap', () => {
    expect(isTruncatedTitle('a'.repeat(200))).toBe(true);
  });

  it('marks one padded to the cap with trailing spaces', () => {
    // 154 titles are like this, cut mid-„(Nr. ". Measuring after trim() would
    // put them under the cap and call them complete.
    expect(isTruncatedTitle('a'.repeat(196) + '    ')).toBe(true);
    expect(isTruncatedTitle('Įstatymo projektas (Nr. ' + 'a'.repeat(176))).toBe(true);
  });

  it('leaves a complete title that merely ends at the cap', () => {
    // 13 titles are exactly 200 characters and complete; 4 more close the
    // bracket before trailing space.
    expect(isTruncatedTitle('a'.repeat(199) + ')')).toBe(false);
    expect(isTruncatedTitle('a'.repeat(196) + ')   ')).toBe(false);
  });

  it('leaves ordinary titles alone', () => {
    expect(isTruncatedTitle('Trumpas pavadinimas')).toBe(false);
    expect(isTruncatedTitle('')).toBe(false);
    expect(isTruncatedTitle(null)).toBe(false);
    expect(isTruncatedTitle(undefined)).toBe(false);
  });

  it('leaves a synthesised title longer than the cap', () => {
    // „Klausimų grupė" composites are ours, not source text, and exceed 200.
    expect(isTruncatedTitle('Klausimų grupė: ' + 'a'.repeat(300))).toBe(false);
  });
});
