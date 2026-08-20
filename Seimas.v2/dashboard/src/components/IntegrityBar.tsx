import React from "react";
import {
  CIVIC_DIMENSION_LABELS_LT,
  DIMENSION_UNAVAILABLE_LT,
} from "../utils/mpLegacyDimensions";

export type IntegrityBarProps = {
  /**
   * The Skaidrumo indeksas value, or null when no populated source backs it.
   * Pass `readMpDimension(profile, "integrity")` — the same rule the metrics
   * grid uses — never the raw finalIntegrityScore. Null renders the "not yet
   * available" note instead of a number, so the header cannot become the one
   * place a hidden metric leaks as a baseline 100.
   */
  score: number | null;
  /** Internal API signal for risk-tier bar tint only — never rendered as visible text. */
  riskTierSignal?: string;
  className?: string;
};

const LABEL = CIVIC_DIMENSION_LABELS_LT.integrity;

function barTintClass(signal: string | undefined): string {
  if (!signal) return "bg-primary";
  const s = signal.toLowerCase();
  if (s.includes("evil") || s.includes("chaotic")) return "bg-destructive/90";
  if (s.includes("neutral")) return "bg-attention";
  return "bg-primary";
}

export function IntegrityBar({ score, riskTierSignal, className = "" }: IntegrityBarProps) {
  // Hidden metric: show the same note as the grid, never a number or a full bar.
  if (score === null || !Number.isFinite(score)) {
    return (
      <div className={`space-y-1.5 ${className}`}>
        <div className="flex items-start justify-between gap-3 text-sm">
          <span className="text-muted-foreground font-medium">{LABEL}</span>
          <span className="text-right text-xs text-muted-foreground/70 max-w-[60%]">
            {DIMENSION_UNAVAILABLE_LT}
          </span>
        </div>
      </div>
    );
  }

  const pct = Math.max(0, Math.min(100, score));
  const rounded = Math.round(pct);

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground font-medium">{LABEL}</span>
        <span className="font-mono tabular-nums text-foreground">{pct.toFixed(1)}</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={rounded}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={LABEL}
        className="h-2 w-full max-w-md rounded-full bg-muted overflow-hidden border border-border/60"
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${barTintClass(riskTierSignal)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
