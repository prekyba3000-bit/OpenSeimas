// TODO(v4): confirm whether ForensicExplainer is still needed elsewhere before deleting
import React from 'react';
import { NavLink } from 'react-router';
import { HelpCircle } from 'lucide-react';
import type { ForensicBreakdown } from '../services/api';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';

/** Subset of civic `ForensicBreakdown` used for public explainers */
export type ForensicBreakdownLite = {
  finalIntegrityScore?: number;
  totalForensicAdjustment?: number;
  benford?: { status?: string; penalty?: number; explanation?: string; description?: string };
  chrono?: { status?: string; penalty?: number; explanation?: string; description?: string };
  voteGeometry?: { status?: string; penalty?: number; explanation?: string; description?: string };
  phantomNetwork?: { status?: string; penalty?: number; explanation?: string; description?: string };
};

type Props = {
  /** Skaidrumo indeksas (0–100 model output). */
  skaidrumoIndeksas: number;
  breakdown?: ForensicBreakdown | ForensicBreakdownLite | null;
  /** Tailwind-friendly text color for dark cards */
  className?: string;
  variant?: 'banner' | 'inline';
};

const SKAIDRUMO_SENTENCE_LT =
  'Skaidrumo indeksas — suvestinis 0–100 balas iš forensinių signalų (Benford, chronologija, balsavimo geometrija, ryšių tinklas ir kt.), kai duomenys prieinami. Tai modelio išvestis, ne teisinis ar oficialus verdiktas.';

export function ForensicExplainer({
  skaidrumoIndeksas,
  breakdown,
  className = 'text-[#A9B1D6]/90',
  variant = 'inline',
}: Props) {
  const finalScore = breakdown?.finalIntegrityScore;
  const adj = breakdown?.totalForensicAdjustment;

  const engines = [
    { key: 'benford', wire: 'benford', label: 'Benford (deklaracijos)', d: breakdown?.benford },
    { key: 'chrono', wire: 'chrono', label: 'Chrono (pataisų laikas)', d: breakdown?.chrono },
    { key: 'voteGeometry', wire: 'vote_geometry', label: 'Balsavimo geometrija', d: breakdown?.voteGeometry },
    { key: 'phantomNetwork', wire: 'phantom_network', label: 'Phantom (ryšiai)', d: breakdown?.phantomNetwork },
  ].filter((e) => e.d);

  const wrap =
    variant === 'banner'
      ? 'rounded-lg border border-[#4E597B]/80 bg-[#1A1B26]/90 p-4 text-sm'
      : 'text-sm';

  return (
    <div className={`${wrap} ${className}`}>
      <p className="leading-relaxed">
        <strong className="text-[#A9B1D6]">
          Skaidrumo indeksas {skaidrumoIndeksas.toFixed(1)}
        </strong>
        {finalScore != null && (
          <>
            {' '}
            · galutinis vientisumas API:{' '}
            <span className="font-mono text-[#7AA2F7]">{finalScore.toFixed(1)}</span>
          </>
        )}
        {adj != null && adj !== 0 && (
          <span className="text-[#A9B1D6]/80">
            {' '}
            (forensinė korekcija: {adj > 0 ? '+' : ''}
            {adj})
          </span>
        )}
        . {SKAIDRUMO_SENTENCE_LT}{' '}
        <NavLink to="/dashboard/methodology" className="text-[#7AA2F7] underline underline-offset-2">
          Kaip skaičiuojama
        </NavLink>
        .
      </p>
      {engines.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-1 text-xs text-[#7AA2F7] hover:underline"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Variklių būsenos (techninė)
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 max-h-72 overflow-y-auto text-xs" align="start">
            <p className="font-semibold text-foreground mb-2">API laukai (žiniasklaidai)</p>
            <ul className="space-y-2 text-muted-foreground">
              {engines.map(({ key, wire, label, d }) => (
                <li key={key}>
                  <span className="text-foreground font-medium">{label}</span>
                  <br />
                  <code className="text-[10px] bg-muted px-1 rounded">forensic_breakdown.{wire}</code>
                  {d?.status != null && (
                    <>
                      {' '}
                      · status: <strong>{d.status}</strong>
                    </>
                  )}
                  {d?.penalty != null && (
                    <>
                      {' '}
                      · penalty: {d.penalty}
                    </>
                  )}
                  {(() => {
                    const detail = d as { explanation?: string; description?: string };
                    const text = detail.explanation ?? detail.description;
                    return text ? (
                      <p className="mt-0.5 text-[11px] leading-snug">{text}</p>
                    ) : null;
                  })()}
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
