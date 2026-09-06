import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import type { MpSummary } from '../services/api';
import { ConstituencyPicker } from './ConstituencyPicker';

/**
 * The district a member WON is not the district they ran in.
 *
 * 71 of 141 seats are single-mandate; the other 70 members are elected from a
 * party list and represent no district. Losing candidates ran in those same
 * districts — VRK's own `Kandidatai` dataset records the district contested,
 * not the one won, which is why this data comes from the election-outcome
 * line instead. A picker that offered a list-elected member under a district
 * heading would state something false about both them and whoever actually
 * holds that seat.
 */
function mp(over: Partial<MpSummary> = {}): MpSummary {
  return {
    id: 'id-1',
    name: 'Testinis Narys',
    normalized_name: 'testinis narys',
    party: 'Frakcija',
    is_active: true,
    photo_url: null,
    vote_count: 0,
    attendance: null,
    vote_mode: null,
    ...over,
  } as MpSummary;
}

const DISTRICT_A = mp({
  id: 'a',
  name: 'Viktorija Čmilytė-Nielsen',
  constituency_number: 1,
  constituency_name: 'Senamiesčio–Žvėryno',
  election_type: 'single_mandate',
});
const DISTRICT_B = mp({
  id: 'b',
  name: 'Ingrida Šimonytė',
  constituency_number: 3,
  constituency_name: 'Antakalnio',
  election_type: 'single_mandate',
});
const PARTY_LIST = mp({
  id: 'c',
  name: 'Saulius Skvernelis',
  constituency_number: null,
  constituency_name: null,
  election_type: 'multimandate',
});

describe('the constituency picker', () => {
  it('offers only members who actually won a district', () => {
    render(<ConstituencyPicker mps={[DISTRICT_A, DISTRICT_B, PARTY_LIST]} onSelect={vi.fn()} />);
    expect(screen.getByRole('option', { name: /Antakalnio/ })).toBeInTheDocument();
    // Skvernelis ran in Lazdynų (Nr. 9) and was elected off the list. He must
    // not appear under any district.
    expect(screen.queryByRole('option', { name: /Lazdyn/ })).not.toBeInTheDocument();
  });

  it('lists districts by name, not by number', () => {
    // A reader looking for Antakalnis is not thinking in district numbers,
    // and the numbering is not geographic.
    render(<ConstituencyPicker mps={[DISTRICT_A, DISTRICT_B]} onSelect={vi.fn()} />);
    const options = screen
      .getAllByRole('option')
      .map((o) => o.textContent ?? '')
      .filter((t) => t.includes('Nr.'));
    expect(options[0]).toMatch(/Antakalnio/);
    expect(options[1]).toMatch(/Senamiesčio/);
  });

  it('hands back the member who won the chosen district', async () => {
    const onSelect = vi.fn();
    render(<ConstituencyPicker mps={[DISTRICT_A, DISTRICT_B]} onSelect={onSelect} />);
    await userEvent.selectOptions(screen.getByRole('combobox'), '3');
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].id).toBe('b');
  });

  it('says why the other members are absent, rather than leaving a silent gap', () => {
    render(<ConstituencyPicker mps={[DISTRICT_A, DISTRICT_B, PARTY_LIST]} onSelect={vi.fn()} />);
    expect(screen.getByText(/pagal partijų sąrašus/)).toBeInTheDocument();
    expect(screen.getByText(/2 vienmandatės apygardos/)).toBeInTheDocument();
  });

  it('renders nothing at all when no district data has been loaded', () => {
    // An empty <select> would read as "the districts are missing" rather than
    // "this database has not had the backfill run".
    const { container } = render(<ConstituencyPicker mps={[PARTY_LIST]} onSelect={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('ignores a member with a number but no district name', () => {
    // Half a fact is not a district. Offering "undefined (Nr. 5)" would be
    // worse than offering nothing.
    const broken = mp({ id: 'd', constituency_number: 5, constituency_name: null });
    const { container } = render(<ConstituencyPicker mps={[broken]} onSelect={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
