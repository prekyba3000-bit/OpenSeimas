import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import type { MpVoteTopics } from '../services/api';
import { VoteTopicFilter } from './VoteTopicFilter';

/**
 * Two numbers per subject, never one.
 *
 * `votes` is how many votes on a subject happened while the member held a
 * seat — near-identical for every member, because the source records a row
 * per member per vote whether or not they took part. `recorded` is how many
 * carry an actual choice for them. Measured on one member: 86 housing votes,
 * 27 with a recorded choice. Publishing 86 alone looks personal and is not;
 * publishing 27 alone hides what it is out of.
 */
const BREAKDOWN: MpVoteTopics = {
  topics: {
    bustas: { votes: 86, recorded: 27 },
    sveikata: { votes: 179, recorded: 85 },
    // A subject this member has no votes on at all — must not be offered.
    transportas: { votes: 0, recorded: 0 },
  },
  tagged: 2553,
  total: 5286,
};

describe('the vote topic filter', () => {
  it('shows both numbers for a subject, not just the flattering one', () => {
    render(<VoteTopicFilter breakdown={BREAKDOWN} selected={null} onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Būstas 27\/86/ })).toBeInTheDocument();
  });

  it('offers only subjects the member actually has votes on', () => {
    render(<VoteTopicFilter breakdown={BREAKDOWN} selected={null} onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Sveikata/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Transportas/ })).not.toBeInTheDocument();
  });

  it('says what the two numbers mean, and what they are not', () => {
    render(<VoteTopicFilter breakdown={BREAKDOWN} selected={null} onSelect={vi.fn()} />);
    const note = screen.getByText(/Skaičiai rodo/).textContent ?? '';
    // Must not let a reader take the ratio for attendance or for a stance.
    expect(note).toMatch(/nėra nei lankomumo/);
    expect(note).toMatch(/pozicija/);
  });

  it('states how many votes carry any topic at all', () => {
    // The tagging is keyword matching over titles and misses things; the
    // counts would read as complete without this.
    render(<VoteTopicFilter breakdown={BREAKDOWN} selected={null} onSelect={vi.fn()} />);
    expect(screen.getByText(/2553 balsavimams iš 5286/)).toBeInTheDocument();
  });

  it('selects a subject, and deselects it when pressed again', async () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <VoteTopicFilter breakdown={BREAKDOWN} selected={null} onSelect={onSelect} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Būstas/ }));
    expect(onSelect).toHaveBeenLastCalledWith('bustas');

    rerender(<VoteTopicFilter breakdown={BREAKDOWN} selected="bustas" onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: /Būstas/ }));
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });

  it('marks the active subject for assistive tech, not only by colour', async () => {
    render(<VoteTopicFilter breakdown={BREAKDOWN} selected="bustas" onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Būstas/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /Visos temos/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('renders nothing when the tag table is absent, rather than an empty bar', () => {
    // topics: null means "we cannot tell", which is not the same as a member
    // having no tagged votes — an empty filter bar would assert the latter.
    const absent: MpVoteTopics = { topics: null, tagged: null, total: null };
    const { container } = render(
      <VoteTopicFilter breakdown={absent} selected={null} onSelect={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing while the breakdown is still loading', () => {
    const { container } = render(
      <VoteTopicFilter breakdown={undefined} selected={null} onSelect={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when every subject is empty', () => {
    const empty: MpVoteTopics = {
      topics: { bustas: { votes: 0, recorded: 0 } },
      tagged: 0,
      total: 0,
    };
    const { container } = render(
      <VoteTopicFilter breakdown={empty} selected={null} onSelect={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
