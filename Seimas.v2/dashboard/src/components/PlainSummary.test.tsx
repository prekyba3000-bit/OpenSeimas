import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { api } from '../services/api';
import type { PublishedSummary } from '../services/api';
import { PlainSummary } from './PlainSummary';

vi.mock('../services/api', async () => {
  const actual = await vi.importActual<typeof import('../services/api')>('../services/api');
  return { ...actual, api: { ...actual.api, getSummary: vi.fn() } };
});

/**
 * Everything worth testing here is what stays off the page.
 *
 * The panel renders a summary only when the server says "published" and hands
 * back a body — the state that means a human approved the latest revision and
 * its figures still verify. Every other state renders nothing, so an
 * unreviewed draft or a figure the data has drifted from cannot appear through
 * this component.
 */
function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PlainSummary entityType="vote" entityId="42" />
    </QueryClientProvider>,
  );
}

const PUBLISHED: PublishedSummary = {
  entity_type: 'vote',
  entity_id: '42',
  status: 'published',
  summary: {
    body_lt: '2026 m. vasario 3 d. Seimas balsavo dėl šio klausimo: „Testinis…“.',
    revision: 1,
    editor: 'pipeline:template v1',
    note: null,
    approved_by: 'Redaktorius',
    approved_at: '2026-09-08T10:00:00+00:00',
    created_at: '2026-09-08T09:00:00+00:00',
  },
};

beforeEach(() => vi.mocked(api.getSummary).mockReset());

describe('PlainSummary', () => {
  it('renders an approved, re-verified summary', async () => {
    vi.mocked(api.getSummary).mockResolvedValue(PUBLISHED);
    renderPanel();
    expect(await screen.findByText(/Seimas balsavo dėl šio klausimo/)).toBeInTheDocument();
    // A pipeline byline reads as machine-prepared, not as a person's claim.
    expect(screen.getByText(/parengtas automatiškai/)).toBeInTheDocument();
    expect(screen.getByText(/Patvirtino: Redaktorius/)).toBeInTheDocument();
  });

  it('shows a human editor by name when one reworded it', async () => {
    vi.mocked(api.getSummary).mockResolvedValue({
      ...PUBLISHED,
      summary: { ...PUBLISHED.summary!, editor: 'Vardas Pavardė' },
    });
    renderPanel();
    expect(await screen.findByText(/Tekstą redagavo: Vardas Pavardė/)).toBeInTheDocument();
  });

  it('renders nothing when no revision is approved', async () => {
    vi.mocked(api.getSummary).mockResolvedValue({
      entity_type: 'vote', entity_id: '42', status: 'none', summary: null,
    });
    const { container } = renderPanel();
    await waitFor(() => expect(api.getSummary).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when an approved summary is withheld as stale', async () => {
    // The data drifted from the approved figures; the server holds the body
    // back, and the panel must not invent one or hint that one exists.
    vi.mocked(api.getSummary).mockResolvedValue({
      entity_type: 'vote', entity_id: '42', status: 'withheld_stale', summary: null,
    });
    const { container } = renderPanel();
    await waitFor(() => expect(api.getSummary).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing while loading', async () => {
    // A deferred promise: assert the pre-resolution render is empty, then
    // settle it so no in-flight query dangles into teardown.
    let resolve!: (v: PublishedSummary) => void;
    vi.mocked(api.getSummary).mockReturnValue(
      new Promise<PublishedSummary>((r) => { resolve = r; }) as never,
    );
    const { container } = renderPanel();
    expect(container).toBeEmptyDOMElement();
    resolve({ entity_type: 'vote', entity_id: '42', status: 'none', summary: null });
    await waitFor(() => expect(api.getSummary).toHaveBeenCalled());
  });
});
