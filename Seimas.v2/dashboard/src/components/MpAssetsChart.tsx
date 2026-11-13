import { useQuery } from '@tanstack/react-query';
import { Landmark, ExternalLink } from 'lucide-react';
import { api, type MpAssets } from '../services/api';

function formatEuros(amount: number | null | undefined): string {
  if (amount == null) return 'Nenurodyta';
  return new Intl.NumberFormat('lt-LT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function MpAssetsChart({ mpId }: { mpId: string }) {
  const query = useQuery({
    queryKey: ['mps', mpId, 'assets'],
    queryFn: () => api.getMpAssets(mpId),
    enabled: Boolean(mpId),
  });

  const data: MpAssets | undefined = query.data;
  if (!data) return null;

  const items = data.items;

  return (
    <section
      className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-5"
      aria-label="Deklaruotas turtas"
    >
      <div className="flex items-center gap-2">
        <Landmark className="w-4 h-4 text-primary shrink-0" />
        <h3 className="text-base font-semibold text-foreground">
          {/* LT-COPY: needs native review */}
          Deklaruotas turtas (VRK)
        </h3>
      </div>
      <p className="text-sm text-muted-foreground mt-1">
        Privalomas registruoti turtas pagal VRK kandidato deklaraciją. Rodome
        oficialius skaičius iš šaltinių be reitingavimo ar vertinimų.
      </p>

      {items === null ? (
        <p className="mt-4 text-sm text-muted-foreground">Duomenų nėra.</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Deklaruoto turto įrašų neužfiksuota.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {items.map((item) => (
              <div
                key={item.year}
                className="rounded-lg border border-border/70 bg-muted/20 p-3.5 flex flex-col justify-between hover:border-primary/50 transition-colors"
              >
                <div>
                  <span className="text-xs font-mono font-medium text-muted-foreground">
                    {item.year} m. deklaracija
                  </span>
                  <div className="text-lg font-bold text-foreground mt-1">
                    {formatEuros(item.total_value)}
                  </div>
                </div>

                {item.source_url && (
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 text-xs text-primary inline-flex items-center gap-1 hover:underline"
                  >
                    <span>Oficiali šaltinio nuoroda</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
