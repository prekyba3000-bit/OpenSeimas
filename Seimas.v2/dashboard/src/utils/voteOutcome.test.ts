import { describe, expect, it } from 'vitest';
import { toOutcome } from './voteOutcome';

/**
 * The whole point is the ordering.
 *
 * `"nepriimta".includes("priimta")` is true, and so is
 * `"nepritarta".includes("pritarta")`. Three views had each written their own
 * mapping testing the positive first, which shows a rejected vote as passed —
 * a factual error about what parliament decided, on three public pages. It has
 * never been visible only because `votes.result_type` is NULL on all 5,286
 * rows; it would have appeared in full the day that column was populated.
 */
describe('toOutcome', () => {
  it.each(['Nepriimta', 'nepriimta', 'NEPRIIMTA', 'Nepritarta', 'Atmesta'])(
    'reads %s as rejected, not passed',
    (result) => {
      expect(toOutcome(result)).toBe('FAILED');
    },
  );

  it.each(['Priimta', 'priimta', 'Pritarta'])('reads %s as passed', (result) => {
    expect(toOutcome(result)).toBe('PASSED');
  });

  it('says nothing when the source said nothing', () => {
    // Currently every row. A default outcome here would assert a decision
    // parliament has not been recorded as making.
    expect(toOutcome(null)).toBeNull();
    expect(toOutcome(undefined)).toBeNull();
    expect(toOutcome('')).toBeNull();
  });

  it('says nothing for a value it does not recognise', () => {
    expect(toOutcome('Atidėta svarstyti')).toBeNull();
  });
});
