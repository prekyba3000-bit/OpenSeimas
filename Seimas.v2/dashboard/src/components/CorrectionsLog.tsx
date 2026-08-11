import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { trustApi, type CorrectionStatus } from '../services/trust';

const STATUS_LABELS: Record<CorrectionStatus, string> = {
  open: 'Gauta',
  accepted: 'Priimta',
  rejected: 'Atmesta',
  resolved: 'Išspręsta',
};

const STATUS_CLASSES: Record<CorrectionStatus, string> = {
  open: 'border-border text-muted-foreground',
  accepted: 'border-primary/40 text-primary',
  rejected: 'border-destructive/40 text-destructive',
  resolved: 'border-primary/60 text-primary',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('lt-LT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function CorrectionsLog() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['trust', 'corrections'],
    queryFn: () => trustApi.listCorrections(50),
  });

  if (isPending) {
    return <p className="text-sm text-muted-foreground">Kraunamas pataisymų žurnalas…</p>;
  }

  if (isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Nepavyko įkelti pataisymų žurnalo. Pabandykite vėliau.
      </p>
    );
  }

  const corrections = data?.corrections ?? [];

  if (corrections.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-muted-foreground">
        Čia viešai matysis kiekviena peržiūrėta pastaba ir jos būsena — priimta, atmesta ar
        išspręsta. Atmestas pastabas skelbiame taip pat: žurnalas, kuriame matyti tik mums palankūs
        pranešimai, būtų bevertis. Kol kas peržiūrėtų pataisymų nėra. Pastebėjote netikslumą?
        Užpildykite formą viršuje.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {corrections.map((correction) => (
        <li key={correction.id} className="space-y-2 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_CLASSES[correction.status]}`}
            >
              {STATUS_LABELS[correction.status] ?? correction.status}
            </span>
            <span className="text-xs text-muted-foreground">
              {correction.entity_type} · {correction.entity_id}
            </span>
            <span className="text-xs text-muted-foreground">{formatDate(correction.created_at)}</span>
          </div>
          <p className="text-sm text-foreground">{correction.description}</p>
          {correction.resolution_note && (
            <p className="border-l-2 border-primary/40 pl-3 text-sm text-muted-foreground">
              <span className="text-foreground">Sprendimas: </span>
              {correction.resolution_note}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
