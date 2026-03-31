import React, { forwardRef } from "react";
import type { ForensicFlag } from "../services/api";
import { FlagRow } from "./FlagRow";

const SEVERITY_ORDER: Record<ForensicFlag["severity"], number> = {
  high: 0,
  medium: 1,
  low: 2,
  none: 3,
};

export type FlagListProps = {
  flags: ForensicFlag[];
  /** Engine key of the flag that should start expanded (from ?flag= param). */
  highlightEngine?: ForensicFlag["engine"];
};

export const FlagList = forwardRef<HTMLElement, FlagListProps>(function FlagList(
  { flags, highlightEngine },
  ref,
) {
  const sorted = [...flags].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );

  if (sorted.length === 0) {
    return (
      <section ref={ref} aria-label="Skaidrumo pažeidimai">
        <p className="text-sm text-muted-foreground">Pažeidimų nerasta.</p>
      </section>
    );
  }

  return (
    <section ref={ref} aria-label="Skaidrumo pažeidimai">
      <ul className="space-y-2 p-0 m-0">
        {sorted.map((flag) => (
          <FlagRow
            key={flag.engine}
            flag={flag}
            expanded={highlightEngine !== undefined && flag.engine === highlightEngine}
          />
        ))}
      </ul>
    </section>
  );
});
