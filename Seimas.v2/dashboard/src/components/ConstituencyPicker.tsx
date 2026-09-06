import React, { useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';
import type { MpSummary } from '../services/api';
import { LT } from '../i18n/lt';

/**
 * Pick a single-mandate district, get the member who won it.
 *
 * The whole point of the platform is that a reader reasons about their own
 * representative rather than skimming a table of 141 strangers, and this is
 * the shortest path to that: one choice, one person, no ranking involved.
 *
 * Takes the FULL roster, not the active one. The first version took the
 * active list and silently listed 70 districts, because Nalšios šiaurinė
 * (Nr. 52) lost its member on 2026-05-28 and nobody has replaced him — that is
 * the vacant seat /api/stats reports as 140 of 141. A reader in that district
 * would have found their district simply absent from the list, which reads as
 * "we lost your data" rather than "your seat is empty". All 71 appear now, and
 * the vacant one says so.
 */
export function ConstituencyPicker({
  mps,
  onSelect,
}: {
  mps: MpSummary[];
  onSelect: (mp: MpSummary) => void;
}) {
  const [value, setValue] = useState('');

  const districts = useMemo(
    () =>
      mps
        .filter((mp) => mp.constituency_number != null && mp.constituency_name)
        // By name, not number: a reader looking for Telšiai is not thinking
        // in district numbers, and the numbering is not geographic.
        .sort((a, b) =>
          (a.constituency_name ?? '').localeCompare(b.constituency_name ?? '', 'lt'),
        ),
    [mps],
  );

  // A district whose elected member has left and not been replaced. Their
  // profile is still the honest answer to "who did this district elect", so
  // the option stays selectable — it is labelled, not disabled.
  const isVacant = (mp: MpSummary) => Boolean(mp.mandate_end_date);
  const vacantCount = districts.filter(isVacant).length;

  // Nothing to offer until the roster loads, or if the constituency backfill
  // has not run against this database. Rendering an empty <select> would look
  // like the districts themselves were missing.
  if (districts.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <label
        htmlFor="constituency-picker"
        className="flex items-center gap-2 text-sm font-semibold text-foreground"
      >
        <MapPin className="w-4 h-4 text-primary" aria-hidden="true" />
        {LT.constituency.pickerTitle}
      </label>

      <select
        id="constituency-picker"
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          setValue(next);
          const chosen = districts.find((mp) => String(mp.constituency_number) === next);
          if (chosen) onSelect(chosen);
        }}
        className="mt-3 w-full min-h-11 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">{LT.constituency.pickerPlaceholder}</option>
        {districts.map((mp) => (
          <option key={mp.constituency_number} value={String(mp.constituency_number)}>
            {mp.constituency_name} (Nr. {mp.constituency_number})
            {isVacant(mp) ? ` — ${LT.constituency.seatVacantShort}` : ''}
          </option>
        ))}
      </select>

      <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
        {LT.constituency.pickerNote(districts.length)}
        {vacantCount > 0 ? ` ${LT.constituency.vacantNote(vacantCount)}` : ''}
      </p>
    </div>
  );
}

export default ConstituencyPicker;
