import { useQuery } from '@tanstack/react-query';
import { Building, GitFork, AlertCircle } from 'lucide-react';
import { api, type MpProcurement } from '../services/api';

export function MpProcurementCard({ mpId }: { mpId: string }) {
  const query = useQuery({
    queryKey: ['mps', mpId, 'procurement'],
    queryFn: () => api.getMpProcurement(mpId),
    enabled: Boolean(mpId),
  });

  const data: MpProcurement | undefined = query.data;
  if (!data) return null;

  const items = data.items;

  return (
    <section
      className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-5"
      aria-label="Viešieji pirkimai ir ryšiai"
    >
      <div className="flex items-center gap-2">
        <Building className="w-4 h-4 text-primary shrink-0" />
        <h3 className="text-base font-semibold text-foreground">
          Viešieji pirkimai ir verslo ryšiai (CVP IS)
        </h3>
      </div>
      <p className="text-sm text-muted-foreground mt-1">
        Atsekami ne tiesioginiai ir netiesioginiai ryšiai su juridiniais asmenimis ir valstybės pirkimų sutartimis.
      </p>

      {items === null ? (
        <p className="mt-4 text-sm text-muted-foreground">Duomenų nėra.</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Indikacijų apie netiesioginius viešųjų pirkimų ryšius neužfiksuota.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div
              key={`${item.target_code}-${item.target_name}`}
              className="rounded-lg border border-border/70 bg-muted/20 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-primary/50 transition-colors"
            >
              <div className="space-y-1">
                <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span>{item.target_name}</span>
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/50">
                    {item.target_code}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-mono">
                  <GitFork className="w-3.5 h-3.5" />
                  <span>Ryšio žingsniai (šakai): {item.hops}</span>
                  {item.path && item.path.length > 0 && (
                    <span className="truncate max-w-xs">({item.path.join(' → ')})</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {item.procurement_hit && (
                  <span className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                    <AlertCircle className="w-3 h-3" />
                    <span>CVP IS pirkimas</span>
                  </span>
                )}
                {item.debtor_hit && (
                  <span className="inline-flex items-center gap-1 rounded border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    <span>Skolų įrašas</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
