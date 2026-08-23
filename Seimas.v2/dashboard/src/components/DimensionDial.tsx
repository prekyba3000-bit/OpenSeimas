import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from './ui/utils';
import {
  CIVIC_DIMENSION_LABELS_LT,
  DIMENSION_UNAVAILABLE_LT,
  type MpCivicDimension,
} from '../utils/mpLegacyDimensions';
import { DIMENSION_EXPLAINERS } from '../utils/dimensionExplainers';

export interface DimensionDialProps {
  dimension: MpCivicDimension;
  value: number | null;
  /** „iš 93 posėdžių dienų" — the denominator, in words, when one is known. */
  coverage?: string | null;
  /**
   * Raw counts behind the percentage, shown inside the drawer.
   *
   * A single normalised percentage cannot distinguish a member who initiated
   * twenty projects alone from one who co-signed twenty. A `null` value prints
   * „Duomenų nėra" — never 0, which would read as "initiated nothing".
   */
  evidence?: Array<{ label: string; value: number | null }>;
}

/**
 * One dimension, standing alone.
 *
 * The dials are deliberately not combinable and deliberately not ranked
 * against each other. Each carries its own denominator and its own „Kaip
 * skaičiuojama?" drawer, because five numbers without those are just five
 * small verdicts replacing one large one.
 *
 * A dimension with no populated source renders the established unknown state
 * — never 0.0, which in a row of percentages reads as "worst".
 */
export function DimensionDial({ dimension, value, coverage, evidence }: DimensionDialProps) {
  const [open, setOpen] = React.useState(false);
  const explainer = DIMENSION_EXPLAINERS[dimension];
  const known = typeof value === 'number';
  const drawerId = `dial-${dimension}-how`;

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-2">
      <h3 className="text-base font-semibold text-foreground">
        {CIVIC_DIMENSION_LABELS_LT[dimension]}
      </h3>

      {known ? (
        <p className="text-3xl font-semibold text-foreground font-mono tabular-nums leading-none">
          {value.toFixed(1)}
          <span className="text-lg text-muted-foreground"> %</span>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {DIMENSION_UNAVAILABLE_LT}
        </p>
      )}

      {/* The denominator travels with the number. „71 %" of what is the
          difference between a fact and a figure. */}
      {known && coverage && <p className="text-sm text-muted-foreground">{coverage}</p>}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={drawerId}
        className="mt-1 inline-flex min-h-11 w-fit items-center gap-1.5 text-sm text-primary hover:underline"
      >
        <ChevronDown
          className={cn('h-4 w-4 transition-transform', open ? '' : '-rotate-90')}
          aria-hidden
        />
        Kaip skaičiuojama?
      </button>

      {open && (
        <div id={drawerId} className="text-sm text-muted-foreground space-y-2 leading-relaxed">
          <p>{explainer.formula}</p>
          {evidence && evidence.length > 0 && (
            <ul className="space-y-1 p-0 m-0 list-none">
              {evidence.map((row) => (
                <li key={row.label} className="flex gap-2">
                  <span className="text-foreground">{row.label}:</span>
                  <span>
                    {typeof row.value === 'number' ? row.value : DIMENSION_UNAVAILABLE_LT}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p>
            <span className="text-foreground">Vardiklis:</span> {explainer.denominator}
          </p>
          {/* The half that stops a dial becoming a verdict. */}
          <p>
            <span className="text-foreground">Ko šis rodiklis nerodo:</span>{' '}
            {explainer.notMeasuring}
          </p>
        </div>
      )}
    </div>
  );
}
