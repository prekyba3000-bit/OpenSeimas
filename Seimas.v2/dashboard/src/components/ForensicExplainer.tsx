import React from 'react';
import { NavLink } from 'react-router';
import { HelpCircle } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';

/** Subset of API `forensic_breakdown` used for public explainers */
export type ForensicBreakdownLite = {
  final_integrity_score?: number;
  total_forensic_adjustment?: number;
  benford?: { status?: string; penalty?: number; explanation?: string };
  chrono?: { status?: string; penalty?: number; explanation?: string };
  vote_geometry?: { status?: string; penalty?: number; explanation?: string };
  phantom_network?: { status?: string; penalty?: number; explanation?: string };
};

type Props = {
  intScore: number;
  breakdown?: ForensicBreakdownLite | null;
  /** Tailwind-friendly text color for dark cards */
  className?: string;
  variant?: 'banner' | 'inline';
};

const INT_SENTENCE_LT =
  'INT (vientisumas) — suvestinis 0–100 balas iš forensinių signalų (Benford, chronologija, balsavimo geometrija, ryšių tinklas ir kt.), kai duomenys prieinami. Tai modelio išvestis, ne teisinis ar oficialus verdiktas.';

export function ForensicExplainer({
  intScore,
  breakdown,
  className = 'text-[#A9B1D6]/90',
  variant = 'inline',
}: Props) {
  const finalScore = breakdown?.final_integrity_score;
  const adj = breakdown?.total_forensic_adjustment;

  const engines = [
    { key: 'benford', label: 'Benford (deklaracijos)', d: breakdown?.benford },
    { key: 'chrono', label: 'Chrono (pataisų laikas)', d: breakdown?.chrono },
    { key: 'vote_geometry', label: 'Balsavimo geometrija', d: breakdown?.vote_geometry },
    { key: 'phantom_network', label: 'Phantom (ryšiai)', d: breakdown?.phantom_network },
  ].filter((e) => e.d);

  const wrap =
    variant === 'banner'
      ? 'rounded-lg border border-[#4E597B]/80 bg-[#1A1B26]/90 p-4 text-sm'
      : 'text-sm';

  return (
    <div className={`${wrap} ${className}`}>
      <p className="leading-relaxed">
        <strong className="text-[#A9B1D6]">INT {intScore.toFixed(1)}</strong>
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
        . {INT_SENTENCE_LT}{' '}
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
              {engines.map(({ key, label, d }) => (
                <li key={key}>
                  <span className="text-foreground font-medium">{label}</span>
                  <br />
                  <code className="text-[10px] bg-muted px-1 rounded">forensic_breakdown.{key}</code>
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
                  {d?.explanation ? (
                    <p className="mt-0.5 text-[11px] leading-snug">{d.explanation}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
