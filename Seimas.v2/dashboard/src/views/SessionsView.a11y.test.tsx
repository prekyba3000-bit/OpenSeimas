import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { api } from '../services/api';
import type { SeimasSession } from '../services/api';
import SessionsView from './SessionsView';
import { ltPlural } from '../utils/ltPlural';

vi.mock('../services/api', async () => {
  const actual = await vi.importActual<typeof import('../services/api')>('../services/api');
  return { ...actual, api: { ...actual.api, getVotes: vi.fn(), getSessions: vi.fn() } };
});

/**
 * A reader using a keyboard could not open a session at all.
 *
 * Every control on this page was a `div` with an `onClick`: the session
 * headers, the timeline bars, and each vote row. None of them took a tab stop,
 * responded to Enter, showed a focus ring, or told a screen reader that they
 * expanded anything. The timeline bars carried their only label in a `title`
 * attribute — a tooltip, which needs a pointer to appear — and the vote count
 * inside is rendered only when the bar is wide enough, so a narrow bar had no
 * accessible name at all.
 */
const SESSIONS: SeimasSession[] = [
  { id: 144, number: 60, name: '4 eilinė', date_from: '2026-03-10', date_to: '2026-07-14',
    status: 'ended', vote_count: 1812, sitting_days: 29 },
  { id: 140, number: 58, name: '2 eilinė', date_from: '2025-03-10', date_to: '2025-06-30',
    status: 'ended', vote_count: 1517, sitting_days: 27 },
  // Seven, deliberately: „7 balsavimai", not „7 balsavimų". A count in the
  // 2–9 range is the only one that distinguishes the forms here.
  { id: 146, number: 61, name: 'neeilinė', date_from: '2026-08-25', date_to: '2026-08-25',
    status: 'ended', vote_count: 7, sitting_days: 1 },
];

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SessionsView />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(api.getSessions).mockReset();
  vi.mocked(api.getVotes).mockReset();
  vi.mocked(api.getSessions).mockResolvedValue({ sessions: SESSIONS, source: 'p2b' });
  vi.mocked(api.getVotes).mockResolvedValue([
    { id: '9', date: '2025-06-30', title: 'Dėl biudžeto pakeitimo', result: null },
  ] as never);
});

/**
 * Two buttons legitimately carry each session's name — the timeline bar and
 * the card header — so the helpers say which. The timeline's accessible name
 * is exactly „<name> — <n> balsavimų"; the header's is everything in the card,
 * which ends in the sitting-day count.
 */
const header = (name: string) =>
  screen.findByRole('button', { name: new RegExp(`${name}.*posėdžių`) });
const bar = (name: string, votes: number) =>
  screen.findByRole('button', {
    // Built with ltPlural, because the label is. It was a hardcoded
    // „balsavimų", which is right for 1812 and 1517 and wrong for 7 — so the
    // fixture below carries a small session that would have caught it.
    name: `${name} — ${votes} ${ltPlural(votes, 'balsavimas', 'balsavimai', 'balsavimų')}`,
  });

describe('the sessions page can be used without a mouse', () => {
  it('opens a session with the keyboard alone', async () => {
    renderView();
    const card = await header('4 eilinė');
    expect(card).toHaveAttribute('aria-expanded', 'false');

    card.focus();
    await userEvent.keyboard('{Enter}');
    expect(card).toHaveAttribute('aria-expanded', 'true');
  });

  it('names the region each control opens', async () => {
    renderView();
    const card = await header('2 eilinė');
    const panelId = card.getAttribute('aria-controls');
    expect(panelId).toBeTruthy();

    await userEvent.click(card);
    expect(document.getElementById(panelId!)).toHaveAttribute('role', 'region');
  });

  it('gives every timeline bar a name that does not depend on a pointer', async () => {
    // `title` needs hover. A bar narrow enough to hide its own count had no
    // accessible name whatsoever.
    renderView();
    expect(await bar('4 eilinė', 1812)).toBeInTheDocument();
    expect(await bar('2 eilinė', 1517)).toBeInTheDocument();
    expect(await bar('neeilinė', 7)).toBeInTheDocument();
  });

  it('makes each vote a link, so it can be focused and opened in a new tab', async () => {
    renderView();
    await userEvent.click(await header('2 eilinė'));

    const vote = await screen.findByRole('link', { name: /Dėl biudžeto pakeitimo/ });
    expect(vote).toHaveAttribute('href', '/dashboard/votes/9');
  });

  it('leaves no clickable div behind on the page', async () => {
    // The shape of the defect, not one instance of it: an element that
    // responds to a click and is not a button, link or input is invisible to
    // a keyboard.
    const { container } = renderView();
    await header('4 eilinė');

    const clickable = [...container.querySelectorAll('[class*="cursor-pointer"]')]
      .filter((el) => !['BUTTON', 'A', 'INPUT'].includes(el.tagName))
      .map((el) => el.className);
    expect(clickable).toEqual([]);
  });
});
