import { describe, it, expect } from 'vitest';
import { factionLabel, hasFaction, NO_FACTION_LT } from './faction';

describe('factionLabel', () => {
  it('passes a real faction through unchanged', () => {
    expect(factionLabel('„Nemuno aušros“ frakcija')).toBe('„Nemuno aušros“ frakcija');
  });

  it('names the absence rather than inventing a party', () => {
    // Migration 039: current_party is NULL when the member sits in no faction.
    // Before it, this position silently showed the NOMINATING party, so a
    // reader could not tell which fact they were looking at.
    expect(factionLabel(null)).toBe(NO_FACTION_LT);
    expect(factionLabel(undefined)).toBe(NO_FACTION_LT);
    expect(factionLabel('   ')).toBe(NO_FACTION_LT);
  });

  it('treats the old English placeholder as absence', () => {
    // 'Unknown' was rendered verbatim on a Lithuanian surface.
    expect(factionLabel('Unknown')).toBe(NO_FACTION_LT);
  });

  it('does not claim the member left a faction', () => {
    // „nepriklauso frakcijai" asserts non-membership. True of the Speaker,
    // an over-claim the first time resolution fails for another reason.
    expect(NO_FACTION_LT.toLowerCase()).not.toContain('nepriklauso');
  });
});

describe('hasFaction', () => {
  it('separates a real faction from every flavour of absence', () => {
    expect(hasFaction('Mišri Seimo narių grupė')).toBe(true);
    expect(hasFaction(null)).toBe(false);
    expect(hasFaction('')).toBe(false);
    expect(hasFaction('Unknown')).toBe(false);
  });
});

describe('the no-faction key as it arrives on the wire', () => {
  it('treats the stringified null key as absence', () => {
    // /api/votes/{id} returns party_stats keyed by faction name. A JSON object
    // key cannot be null, so Python's None key stringifies to "null" and the
    // vote page rendered a faction row labelled „null".
    expect(factionLabel('null')).toBe(NO_FACTION_LT);
    expect(hasFaction('null')).toBe(false);
  });

  it('does not mistake a real faction containing those letters', () => {
    expect(factionLabel('Nemuno aušros frakcija')).toBe('Nemuno aušros frakcija');
  });
});
