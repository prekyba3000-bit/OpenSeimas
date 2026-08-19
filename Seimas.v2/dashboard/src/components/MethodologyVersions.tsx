import React from 'react';
import { formatLtDateLong } from '../utils/ltDate';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { ApiError } from '../services/api';
import { trustApi, type MethodologyVersion } from '../services/trust';

function formatDate(iso: string): string {
  // Shared civic formatter — see utils/ltDate.
  return formatLtDateLong(iso) ?? iso;
}

/** Pre-announced but not yet in force — plan §7 requires ≥14 days of notice. */
function isUpcoming(version: MethodologyVersion): boolean {
  return new Date(version.effective_from).getTime() > Date.now();
}

function noticeDays(version: MethodologyVersion): number | null {
  if (!version.announced_at) return null;
  const ms = new Date(version.effective_from).getTime() - new Date(version.announced_at).getTime();
  return Math.round(ms / 86_400_000);
}

function VersionEntry({ version }: { version: MethodologyVersion }) {
  return (
    <li className="space-y-1 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
          v{version.version}
        </span>
        <span className="text-sm text-foreground">{version.title_lt}</span>
        <span className="text-xs text-muted-foreground">
          galioja nuo {formatDate(version.effective_from)}
        </span>
      </div>
      <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
        {version.body_lt}
      </p>
    </li>
  );
}

export function MethodologyVersions({ metricKey }: { metricKey: string }) {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['trust', 'methodology', metricKey],
    queryFn: () => trustApi.getMethodology(metricKey),
    retry: false,
  });

  if (isPending) {
    return <p className="text-sm text-muted-foreground">Kraunama metodikos istorija…</p>;
  }

  // 404 is the honest "nothing published yet" case, not a failure.
  const notPublished = isError && error instanceof ApiError && error.status === 404;

  if (notPublished) {
    return (
      <p className="text-sm leading-relaxed text-muted-foreground">
        Čia bus skelbiami metodikos pakeitimai — ne vėliau kaip likus 14 dienų iki įsigaliojimo. Kol
        kas pakeitimų nėra — galioja žemiau aprašyta pradinė versija.
      </p>
    );
  }

  if (isError || !data) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Nepavyko įkelti metodikos istorijos. Pabandykite vėliau.
      </p>
    );
  }

  const upcoming = isUpcoming(data.current);
  const days = noticeDays(data.current);

  return (
    <div className="space-y-3">
      {upcoming && (
        <div className="flex gap-2 rounded-md border border-primary/50 bg-primary/5 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm leading-relaxed text-foreground">
            Nuo {formatDate(data.current.effective_from)} įsigalios nauja šio rodiklio metodikos
            versija (v{data.current.version}).
            {data.current.announced_at && (
              <>
                {' '}
                Paskelbta {formatDate(data.current.announced_at)}
                {days !== null && ` — likus ${days} d. iki įsigaliojimo`}.
              </>
            )}
          </p>
        </div>
      )}

      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        <VersionEntry version={data.current} />
        {data.history.map((version) => (
          <VersionEntry key={version.version} version={version} />
        ))}
      </ul>
    </div>
  );
}
