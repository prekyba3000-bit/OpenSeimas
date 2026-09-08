import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { api } from '../services/api';
import ComparisonView from './ComparisonView';

vi.mock('../services/api', async () => {
  const actual = await vi.importActual<typeof import('../services/api')>('../services/api');
  return { ...actual, api: { ...actual.api, getMps: vi.fn(), compareMps: vi.fn() } };
});

/**
 * The member picker was a div with an onClick, and every option in it was too.
 * So the comparison page — whose entire purpose is choosing two members —
 * could not be used at all without a pointer: no tab stop, no Enter, no focus
 * ring, and nothing telling a screen reader that a list had opened.
 */
const MPS = [
  { id: 'a', name: 'Agnė Bilotaitė', party: 'TS-LKD', photo_url: null },
  { id: 'b', name: 'Aidas Gedvilas', party: '„Nemuno aušra"', photo_url: null },
];

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ComparisonView />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(api.getMps).mockReset();
  vi.mocked(api.getMps).mockResolvedValue(MPS as never);
});

describe('choosing members to compare, without a mouse', () => {
  it('opens the picker from the keyboard and announces the list', async () => {
    renderView();
    const trigger = (await screen.findAllByRole('button', { name: /Pasirinkite pirmą narį/ }))[0];
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    trigger.focus();
    await userEvent.keyboard('{Enter}');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
  });

  it('offers each member as a real option', async () => {
    renderView();
    const trigger = (await screen.findAllByRole('button', { name: /Pasirinkite pirmą narį/ }))[0];
    await userEvent.click(trigger);

    const options = await screen.findAllByRole('option');
    expect(options.length).toBe(MPS.length);
    await userEvent.click(options[1]);
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: /Aidas Gedvilas/ })[0]).toBeInTheDocument(),
    );
  });

  it('closes on Escape from anywhere in the list, not only the search box', async () => {
    // The first fix listened on the input, so tabbing to an option and
    // pressing Escape did nothing — a reader was inside a list they could not
    // leave without a pointer.
    renderView();
    const trigger = (await screen.findAllByRole('button', { name: /Pasirinkite pirmą narį/ }))[0];
    await userEvent.click(trigger);
    await screen.findByRole('listbox');

    (await screen.findAllByRole('option'))[0].focus();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });

  it('gives focus back to the trigger when the list closes', async () => {
    // Otherwise focus is on document.body — nowhere — and a reader who opened
    // the list and changed their mind tabs from the top of the page again.
    renderView();
    const trigger = (await screen.findAllByRole('button', { name: /Pasirinkite pirmą narį/ }))[0];
    await userEvent.click(trigger);
    await screen.findByRole('listbox');

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('removes the list from the document when it closes', async () => {
    // AnimatePresence cannot remove a child it cannot track, and both the
    // backdrop and the list were wrapped in a fragment. The list animated to
    // opacity 0 and then stayed — invisible, and still 140 focusable options
    // carrying a listbox role, reachable by Tab and by a screen reader.
    renderView();
    const trigger = (await screen.findAllByRole('button', { name: /Pasirinkite pirmą narį/ }))[0];
    await userEvent.click(trigger);
    await screen.findByRole('listbox');

    await userEvent.keyboard('{Escape}');
    await waitFor(() => {
      expect(document.querySelectorAll('[role="listbox"]')).toHaveLength(0);
      expect(document.querySelectorAll('[role="option"]')).toHaveLength(0);
    });
  });
});
