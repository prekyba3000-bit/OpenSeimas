import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { MpCard } from './MpCard';

/**
 * The members grid is 141 of these, and it is the main way to browse the
 * Seimas. Every card was a `div` with an `onClick`: no tab stop, no Enter, no
 * focus ring, no accessible name. A button fixed reachability and still could
 * not be opened in a new tab, which is a normal thing to want from a list of
 * 141 people — so navigation is a link, and `onClick` stays for the cases that
 * are not navigation.
 */
const MP = {
  id: 'abc',
  name: 'Agnė Bilotaitė',
  current_party: 'TS-LKD',
  vote_count: 1420,
  attendance: 71,
};

describe('MpCard', () => {
  it('is a link when it navigates, so it can be opened in a new tab', () => {
    render(
      <MemoryRouter>
        <MpCard mp={MP} to={`/dashboard/mps/${MP.id}`} />
      </MemoryRouter>,
    );
    const card = screen.getByRole('link', { name: /Agnė Bilotaitė/ });
    expect(card).toHaveAttribute('href', '/dashboard/mps/abc');
  });

  it('is a button when it acts rather than navigates', async () => {
    const onClick = vi.fn();
    render(<MpCard mp={MP} onClick={onClick} />);
    const card = screen.getByRole('button', { name: /Agnė Bilotaitė/ });

    card.focus();
    await userEvent.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalled();
  });

  it('is neither when it does nothing, and claims no affordance it lacks', () => {
    const { container } = render(<MpCard mp={MP} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    // No cursor-pointer either: a card that looks clickable and is not is its
    // own small lie.
    expect(container.querySelector('[class*="cursor-pointer"]')).toBeNull();
  });

  it('carries the member as its accessible name', () => {
    render(
      <MemoryRouter>
        <MpCard mp={MP} to="/x" />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link').textContent).toContain('Agnė Bilotaitė');
  });
});
