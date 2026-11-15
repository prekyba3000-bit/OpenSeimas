import { describe, expect, it } from 'vitest';
import type { MpSummary, VoteSummary } from '../services/api';
import { latestQuestions, sampleFaces, searchMembers, voteTime } from './frontPage';

const vote = (id: string, title: string, at: string | null, f: number | null = 10, a: number | null = 5, s: number | null = 1): VoteSummary => ({
  id, date: '2026-11-05', title, result: null,
  votes_for: f, votes_against: a, votes_abstained: s, voted_at: at,
});

const mp = (name: string, extra: Partial<MpSummary> = {}): MpSummary => ({
  id: name, name, normalized_name: name.toLowerCase(), party: null, is_active: true,
  photo_url: `https://x/${name}.jpg`, vote_count: 0, attendance: null, vote_mode: null, ...extra,
});

describe('latestQuestions', () => {
  it('takes the latest vote on each of the last three questions, not three votes on one bill', () => {
    const votes = [
      vote('1', 'Bill A', '2026-11-05T16:47:00Z'),
      vote('2', 'Bill A', '2026-11-05T16:45:00Z'),
      vote('3', 'Bill B', '2026-11-05T16:30:00Z'),
      vote('4', 'Bill C', '2026-11-05T15:00:00Z'),
      vote('5', 'Bill D', '2026-11-05T14:00:00Z'),
    ];
    expect(latestQuestions(votes).map((v) => v.id)).toEqual(['1', '3', '4']);
  });

  it('skips votes the source published no count for', () => {
    const votes = [
      vote('1', 'No count', '2026-11-05T17:00:00Z', null, null, null),
      vote('2', 'Counted', '2026-11-05T16:00:00Z'),
    ];
    expect(latestQuestions(votes).map((v) => v.id)).toEqual(['2']);
  });

  it('orders by the time of the vote, not by the order the API sent', () => {
    const votes = [vote('early', 'X', '2026-11-05T09:00:00Z'), vote('late', 'Y', '2026-11-05T18:00:00Z')];
    expect(latestQuestions(votes)[0].id).toBe('late');
  });
});

describe('searchMembers', () => {
  const mps = [
    mp('Agnė Jakavičiutė-Miliauskienė', { constituency_name: 'Telšių' }),
    mp('Jonas Jonaitis', { constituency_name: null }),
  ];

  it('finds a member by their constituency, accents ignored', () => {
    expect(searchMembers(mps, 'telsiu').map((m) => m.name)).toEqual(['Agnė Jakavičiutė-Miliauskienė']);
  });

  it('finds a member by part of the name', () => {
    expect(searchMembers(mps, 'jonai').map((m) => m.name)).toEqual(['Jonas Jonaitis']);
  });

  it('waits for two letters', () => {
    expect(searchMembers(mps, 'j')).toEqual([]);
  });
});

describe('sampleFaces', () => {
  it('returns only members with a photo, at most n', () => {
    const mps = [mp('A'), mp('B', { photo_url: null }), mp('C'), mp('D')];
    const faces = sampleFaces(mps, 2, () => 0.5);
    expect(faces).toHaveLength(2);
    expect(faces.every((m) => m.photo_url)).toBe(true);
  });
});

describe('voteTime', () => {
  it('shows Vilnius time', () => {
    expect(voteTime('2026-11-05T16:47:04+00:00')).toBe('18:47');
  });

  it('is null when the time is unrecorded', () => {
    expect(voteTime(null)).toBeNull();
  });
});
