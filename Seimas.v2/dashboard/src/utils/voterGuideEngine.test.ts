import { describe, it, expect } from 'vitest';
import { evaluateMpAlignmentClient, VoteItem } from './voterGuideEngine';
import sharedCases from '../../../tests/fixtures/voter_guide_cases.json';

describe('voterGuideEngine (Client-side engine)', () => {
  it('distinguishes directional votes from abstentions and absences', () => {
    const sampleVotes: VoteItem[] = [
      { vote_id: '1', seimas_vote_id: 101, sitting_date: '2026-07-01', title: 'Įstatymas A', vote_choice: 'Už', topic: 'pajamos' },
      { vote_id: '2', seimas_vote_id: 102, sitting_date: '2026-07-02', title: 'Įstatymas B', vote_choice: 'Prieš', topic: 'pajamos' },
      { vote_id: '3', seimas_vote_id: 103, sitting_date: '2026-07-03', title: 'Įstatymas C', vote_choice: 'Susilaikė', topic: 'pajamos' },
      { vote_id: '4', seimas_vote_id: 104, sitting_date: '2026-07-04', title: 'Įstatymas D', vote_choice: null, topic: 'pajamos' },
    ];

    const result = evaluateMpAlignmentClient(10, 'Test MP', 'Test Faction', sampleVotes, { pajamos: 'for' });

    expect(result.vote_breakdown).toEqual({
      aligned: 1,
      opposed: 1,
      abstained: 1,
      absent: 1,
      unverified: 0,
      total_eligible: 4,
    });

    expect(result.evidence_coverage.directional_classifiable_votes).toBe(2);
    expect(result.evidence_coverage.recorded_status_votes).toBe(3);
    expect(result.evidence_coverage.directional_coverage_pct).toBe(50.0);
    expect(result.evidence_coverage.recorded_status_coverage_pct).toBe(75.0);
    expect(result.bullet_reasons[0]).toContain('http');
    expect(result.disclaimer_lt).toContain('balsavimo rekomendacija');
    expect(result.methodology_note_lt).toContain('vote_topics');
  });

  it('evaluates shared language-neutral fixture cases correctly', () => {
    for (const testCase of sharedCases) {
      const mandateStart = (testCase as any).mandate_start as string | null | undefined;
      const result = evaluateMpAlignmentClient(
        testCase.mp_id,
        testCase.mp_name,
        testCase.party,
        testCase.votes as VoteItem[],
        testCase.preferred_stances as Record<string, 'for' | 'against'>,
        mandateStart
      );

      expect(result.category, `[${testCase.id}] category`).toBe(testCase.expected.category);
      expect(result.alignment_pct, `[${testCase.id}] alignment_pct`).toBe(testCase.expected.alignment_pct);
      expect(result.vote_breakdown, `[${testCase.id}] vote_breakdown`).toEqual(testCase.expected.vote_breakdown);
      expect(result.evidence_coverage, `[${testCase.id}] evidence_coverage`).toEqual(testCase.expected.evidence_coverage);
      expect(result.headline_lt, `[${testCase.id}] headline_lt`).toContain(testCase.expected.headline_contains);

      // Task 2: Verify balanced evidence selection on symmetrical ties
      const bulletBalance = (testCase.expected as any).bullet_balance;
      if (bulletBalance) {
        const alignedBulletCount = result.bullet_reasons.filter((b) => b.includes('balsavo „Už“')).length;
        const opposedBulletCount = result.bullet_reasons.filter((b) => b.includes('balsavo „Prieš“')).length;
        const neutralBulletCount = result.bullet_reasons.filter((b) => b.includes('Susilaikė') || b.includes('nedalyvavo')).length;
        expect(alignedBulletCount, `[${testCase.id}] min aligned bullets`).toBeGreaterThanOrEqual(bulletBalance.min_aligned);
        expect(opposedBulletCount, `[${testCase.id}] min opposed bullets`).toBeGreaterThanOrEqual(bulletBalance.min_opposed);
        expect(neutralBulletCount, `[${testCase.id}] min neutral bullets`).toBeGreaterThanOrEqual(bulletBalance.min_neutral);
      }
    }
  });

  it('mandate_start excludes pre-mandate votes from eligibility', () => {
    const votes: VoteItem[] = [
      { vote_id: 'pre1', seimas_vote_id: 9001, sitting_date: '2026-01-10', title: 'Pre-mandate vote', vote_choice: 'Už', topic: 'pajamos' },
      { vote_id: 'v1', seimas_vote_id: 9002, sitting_date: '2026-03-01', title: 'Post-mandate vote', vote_choice: 'Už', topic: 'pajamos' },
    ];

    // Without mandate_start: both votes count
    const withoutMandate = evaluateMpAlignmentClient(99, 'Test', 'Party', votes, { pajamos: 'for' });
    expect(withoutMandate.vote_breakdown.total_eligible).toBe(2);

    // With mandate_start: pre-mandate vote excluded
    const withMandate = evaluateMpAlignmentClient(99, 'Test', 'Party', votes, { pajamos: 'for' }, '2026-02-01');
    expect(withMandate.vote_breakdown.total_eligible).toBe(1);
    expect(withMandate.vote_breakdown.absent).toBe(0);
  });
});
