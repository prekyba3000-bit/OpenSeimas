import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { NavLink } from "react-router";
import type { ForensicFlag } from "../services/api";

const ENGINE_METHODOLOGY_ANCHOR: Record<ForensicFlag["engine"], string> = {
  benford: "benford",
  chrono: "chronologine-analize",
  loyalty: "partijos-lojalumas",
  phantom: "fantominis-tinklas",
  vote_geometry: "balsavimo-geometrija",
  base_risk: "", // TODO(v4): add base_risk anchor to MethodologyView once section is written
};

const SEVERITY_BADGE: Record<
  ForensicFlag["severity"],
  { label: string; className: string }
> = {
  high: {
    label: "Aukštas",
    className:
      "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  medium: {
    label: "Vidutinis",
    className:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  low: {
    label: "Žemas",
    className:
      "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  none: {
    label: "Gerai",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
};

export type FlagRowProps = {
  flag: ForensicFlag;
  /** If true, the row starts expanded. Used when deep-linked. */
  expanded?: boolean;
};

export function FlagRow({ flag, expanded = false }: FlagRowProps) {
  const [isOpen, setIsOpen] = useState(expanded);
  useEffect(() => {
    if (expanded) setIsOpen(true);
  }, [expanded]);
  const methodologyAnchor = ENGINE_METHODOLOGY_ANCHOR[flag.engine] ?? "";
  const badge = SEVERITY_BADGE[flag.severity];
  const detailId = `flag-detail-${flag.engine}`;

  return (
    <li className="list-none">
      <div className="rounded-xl border border-border bg-card/80 overflow-hidden">
        <button
          type="button"
          className="w-full flex flex-wrap items-center gap-2 px-3 py-3 text-left hover:bg-muted/40 transition-colors"
          aria-expanded={isOpen}
          aria-controls={detailId}
          onClick={() => setIsOpen((o) => !o)}
        >
          <span
            className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
          >
            {badge.label}
          </span>
          <span className="text-sm font-medium text-foreground flex-1 min-w-0">
            {flag.title}
          </span>
          <ChevronDown
            className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        {isOpen && (
          <div
            id={detailId}
            role="region"
            className="px-3 pb-3 pt-0 border-t border-border/60"
          >
            <p className="text-sm text-muted-foreground mt-2">{flag.description}</p>
            {methodologyAnchor ? (
              <NavLink
                to={`/dashboard/methodology#${methodologyAnchor}`}
                className="mt-2 inline-block text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                → Metodika
              </NavLink>
            ) : null}
          </div>
        )}
      </div>
    </li>
  );
}
