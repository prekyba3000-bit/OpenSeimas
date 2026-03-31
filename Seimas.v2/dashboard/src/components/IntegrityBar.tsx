import React from "react";

export type IntegrityBarProps = {
  /** Model score 0–100 (typically finalIntegrityScore or transparency dimension). */
  score: number;
  /** Internal API signal for risk-tier bar tint only — never rendered as visible text. */
  riskTierSignal?: string;
  className?: string;
};

function barTintClass(signal: string | undefined): string {
  if (!signal) return "bg-[#7AA2F7]";
  const s = signal.toLowerCase();
  if (s.includes("evil") || s.includes("chaotic")) return "bg-rose-500/90";
  if (s.includes("neutral")) return "bg-amber-400/90";
  return "bg-[#7AA2F7]";
}

export function IntegrityBar({ score, riskTierSignal, className = "" }: IntegrityBarProps) {
  const pct = Math.max(0, Math.min(100, Number.isFinite(score) ? score : 0));
  const rounded = Math.round(pct);

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground font-medium">Skaidrumo indeksas</span>
        <span className="font-mono tabular-nums text-foreground">{pct.toFixed(1)}</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={rounded}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Skaidrumo indeksas"
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
