import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { MpFactionAlignment } from './MpFactionAlignment';
import { api, factionAlignmentSchema } from '../services/api';

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, networkMode: 'always' } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const vote = {
  vote_id: 5190,
  date: '2026-06-30',
  title: 'Referendumo konstitucinio įstatymo pakeitimas',
  choice: 'prieš',
  faction_position: 'susilaikė',
  faction_voters: 19,
  agreed: false,
};

beforeEach(() => vi.restoreAllMocks());

describe('MpFactionAlignment', () => {
  it('shows both choices, so a divergence is checkable rather than a label', async () => {
    vi.spyOn(api, 'getMpFactionAlignment').mockResolvedValue({
      alignment_pct: 89.2, comparable_votes: 1380, aligned_votes: 1231,
      votes: [vote], has_more: false,
    });
    wrap(<MpFactionAlignment mpId="x" />);
    await waitFor(() => expect(screen.getByText(vote.title)).toBeInTheDocument());
    expect(screen.getByText('prieš')).toBeInTheDocument();
    expect(screen.getByText('susilaikė')).toBeInTheDocument();
    expect(screen.getByText(/19 balsavo/)).toBeInTheDocument();
  });

  it('publishes the percentage with its numerator and denominator', async () => {
    vi.spyOn(api, 'getMpFactionAlignment').mockResolvedValue({
      alignment_pct: 89.2, comparable_votes: 1380, aligned_votes: 1231,
      votes: [], has_more: false,
    });
    const { container } = wrap(<MpFactionAlignment mpId="x" />);
    await waitFor(() => expect(container.textContent).toMatch(/89\.2/));
    // 89% of 1380 and 89% of 11 are different claims.
    expect(container.textContent).toMatch(/1231/);
    expect(container.textContent).toMatch(/1380/);
  });

  it('never calls a divergence disloyalty', async () => {
    vi.spyOn(api, 'getMpFactionAlignment').mockResolvedValue({
      alignment_pct: 50, comparable_votes: 100, aligned_votes: 50,
      votes: [vote], has_more: false,
    });
    const { container } = wrap(<MpFactionAlignment mpId="x" />);
    await waitFor(() => expect(screen.getByText(vote.title)).toBeInTheDocument());
    expect(container.textContent ?? '').not.toMatch(/lojal|neištikim|išdav|maištau/i);
  });

  it('says why there is no figure instead of showing a blank', async () => {
    vi.spyOn(api, 'getMpFactionAlignment').mockResolvedValue({
      alignment_pct: null, comparable_votes: 0, aligned_votes: 0,
      votes: [], has_more: false,
    });
    wrap(<MpFactionAlignment mpId="x" party="Liberalų sąjūdžio frakcija" />);
    await waitFor(() =>
      expect(screen.getByText(/frakcija\s+per maža/)).toBeInTheDocument(),
    );
  });

  it('does not blame a faction the member does not have', async () => {
    // Found on the live profile of Vilija Blinkevičiūtė, whose header reads
    // „Frakcija nenurodyta" two inches above a panel telling her that her
    // faction was too small. Nine members are in that state — the Speaker and
    // the eight former members — and the reason given was false for all of
    // them. A wrong explanation is not a smaller error than a wrong number.
    vi.spyOn(api, 'getMpFactionAlignment').mockResolvedValue({
      alignment_pct: null, comparable_votes: 0, aligned_votes: 0,
      votes: [], has_more: false,
    });
    const { container } = wrap(<MpFactionAlignment mpId="x" party={null} />);
    await waitFor(() =>
      expect(screen.getByText(/nepriskirtas jokiai frakcijai/)).toBeInTheDocument(),
    );
    expect(container.textContent ?? '').not.toMatch(/per maža/);
  });

  it('treats the stringified null faction as no faction here too', async () => {
    // `party_stats` keys arrive as the four characters n-u-l-l; hasFaction owns
    // that form, and this panel must not be the one surface that forgets.
    vi.spyOn(api, 'getMpFactionAlignment').mockResolvedValue({
      alignment_pct: null, comparable_votes: 0, aligned_votes: 0,
      votes: [], has_more: false,
    });
    const { container } = wrap(<MpFactionAlignment mpId="x" party="null" />);
    await waitFor(() =>
      expect(screen.getByText(/nepriskirtas jokiai frakcijai/)).toBeInTheDocument(),
    );
    expect(container.textContent ?? '').not.toMatch(/per maža/);
  });

  it('withholds a percentage that would be noise, but still lists the votes', async () => {
    vi.spyOn(api, 'getMpFactionAlignment').mockResolvedValue({
      alignment_pct: null, comparable_votes: 6, aligned_votes: 3,
      votes: [vote], has_more: false,
    });
    const { container } = wrap(<MpFactionAlignment mpId="x" />);
    await waitFor(() => expect(screen.getByText(vote.title)).toBeInTheDocument());
    expect(container.textContent).toMatch(/Per mažai palyginamų/);
    expect(container.textContent).not.toMatch(/50 %/);
  });
});

describe('factionAlignmentSchema', () => {
  it('keeps a null percentage rather than coercing it', () => {
    const parsed = factionAlignmentSchema.parse({
      alignment_pct: null, comparable_votes: 0, aligned_votes: 0,
      votes: [], has_more: false,
    });
    expect(parsed.alignment_pct).toBeNull();
  });

  it('keeps every field the API sends on a vote', () => {
    const parsed = factionAlignmentSchema.parse({
      alignment_pct: 89.2, comparable_votes: 1380, aligned_votes: 1231,
      votes: [vote], has_more: true,
    });
    expect(parsed.votes[0].faction_voters).toBe(19);
    expect(parsed.votes[0].agreed).toBe(false);
  });
});
