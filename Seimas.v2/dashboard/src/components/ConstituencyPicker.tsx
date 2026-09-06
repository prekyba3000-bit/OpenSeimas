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
 * Only the 71 single-mandate districts appear. The other 70 members were
 * elected from a party list and represent no district — offering them here
 * would invite the reader to believe otherwise. The note under the control
 * says so rather than leaving the absence to be guessed at.
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
          </option>
        ))}
      </select>

      <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
        {LT.constituency.pickerNote(districts.length)}
      </p>
    </div>
  );
}

export default ConstituencyPicker;
