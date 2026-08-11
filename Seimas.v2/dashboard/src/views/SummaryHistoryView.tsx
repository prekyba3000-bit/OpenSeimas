import React from 'react';
import { NavLink } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { History, ArrowLeft } from 'lucide-react';
import { Card } from '../components/Card';
import { trustApi } from '../services/trust';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('lt-LT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Public revision trail for a plain-language summary. Migration 017 stores the
 * full body per revision and no diffs, so this lists revisions newest-first
 * rather than rendering a diff view.
 */
export function SummaryHistoryView({ entityType, entityId }: { entityType: string; entityId: string }) {
  const { data, isPending, isError } = useQuery({
    queryKey: ['trust', 'summary-history', entityType, entityId],
    queryFn: () => trustApi.getSummaryHistory(entityType, entityId),
    enabled: Boolean(entityType && entityId),
  });

  const revisions = data?.revisions ?? [];

  return (
    <div className="max-w-3xl space-y-8 text-foreground">
      <NavLink
        to="/dashboard/skaidrumas"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Atgal į skaidrumo centrą
      </NavLink>

      <div className="flex items-center gap-3">
        <History className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Santraukos istorija</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {entityType} · {entityId}
          </p>
        </div>
      </div>

      <Card className="space-y-4 border-border bg-card p-6">
        {isPending && <p className="text-sm text-muted-foreground">Kraunama istorija…</p>}

        {isError && (
          <p role="alert" className="text-sm text-destructive">
            Nepavyko įkelti istorijos. Pabandykite vėliau.
          </p>
        )}

        {!isPending && !isError && revisions.length === 0 && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Čia bus viešai matoma kiekvieno pakeitimo istorija — su data, autoriumi ir priežastimi,
            kaip Vikipedijoje. Ši santrauka kol kas redaguota nebuvo.
          </p>
        )}

        {revisions.length > 0 && (
          <ol className="divide-y divide-border">
            {revisions.map((revision) => (
              <li key={revision.revision} className="space-y-2 py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                    Redakcija {revision.revision}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(revision.created_at)}
                  </span>
                  <span className="text-xs text-foreground">{revision.editor}</span>
                </div>
                {revision.note && (
                  <p className="text-xs text-muted-foreground">Priežastis: {revision.note}</p>
                )}
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                  {revision.body_lt}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}

export default SummaryHistoryView;
