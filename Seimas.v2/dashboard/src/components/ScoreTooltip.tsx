import React from "react";
import type { MpProfile } from "../services/api";
import { NavLink } from "react-router";
import {
  CIVIC_DIMENSION_LABELS_LT,
  CIVIC_DIMENSION_ORDER,
  DIMENSION_UNAVAILABLE_LT,
  readMpDimension,
  type MpCivicDimension,
} from "../utils/mpLegacyDimensions";

export type ScoreTooltipProps = {
  profile: MpProfile;
  className?: string;
};

/** Civic dimension grid (Lithuanian labels) — replaces legacy stat abbreviations. */
export function ScoreTooltip({ profile, className = "" }: ScoreTooltipProps) {
  return (
    <div
      className={`rounded-xl border border-border bg-card/60 p-4 text-sm ${className}`}
      aria-label="Rodiklių suvestinė"
    >
      <p className="text-sm font-medium text-muted-foreground mb-3">
        Rodikliai
      </p>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
        {CIVIC_DIMENSION_ORDER.map((dim: MpCivicDimension) => {
          const value = readMpDimension(profile, dim);
          return (
            <div key={dim} className="flex items-center justify-between gap-4 py-1 border-b border-border/40 last:border-0">
              <dt className="text-muted-foreground">{CIVIC_DIMENSION_LABELS_LT[dim]}</dt>
              <dd
                className={
                  value === null
                    ? "text-right text-xs text-muted-foreground/70 max-w-[60%]"
                    : "font-mono tabular-nums font-medium text-foreground"
                }
              >
                {value === null ? DIMENSION_UNAVAILABLE_LT : value.toFixed(1)}
              </dd>
            </div>
          );
        })}
      </dl>
      {/* The live figure counts only days a member voted, over days they appear
          in the voting data — so a short tenure can read as 100%. Methodology v2
          (announced 2026-08-12, effective 2026-08-26) fixes it. Saying so now
          rather than after the notice period: the 14-day rule exists to prevent
          silent methodology changes, not to justify leaving a known-weak number
          unlabelled. */}
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Dalyvavimas kol kas skaičiuojamas tik pagal balsavimus, todėl trumpai dirbę nariai gali
        rodyti 100 %. Nuo 2026-08-26 buvimą patvirtins registracija <em>arba</em> balsavimas per
        mandato laikotarpį —{" "}
        <NavLink to="/dashboard/methodology" className="text-primary underline">
          metodika
        </NavLink>
        .
      </p>
    </div>
  );
}
