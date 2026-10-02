import { useQuery } from '@tanstack/react-query';
import { Clock, FileText } from 'lucide-react';
import { api, type MpAmendmentSpeed } from '../services/api';

export function MpChronoSpeed({ mpId }: { mpId: string }) {
  const query = useQuery({
    queryKey: ['mps', mpId, 'amendment-speed'],
    queryFn: () => api.getMpAmendmentSpeed(mpId),
    enabled: Boolean(mpId),
  });

  const data: MpAmendmentSpeed | undefined = query.data;
  if (!data) return null;

  const items = data.items;

  return (
    <section
      className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-5"
      aria-label="Teisėkūros pataisų rengimo trukmė"
    >
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-primary shrink-0" />
        <h3 className="text-base font-semibold text-foreground">
          Teisėkūros pataisų rengimo trukmė
        </h3>
      </div>
      <p className="text-sm text-muted-foreground mt-1">
        Užregistruotų pataisų ir teisėkūros projektų rengimo laiko tarpai tarp versijų ir dokumento apimties rodikliai.
      </p>

      {items === null ? (
        <p className="mt-4 text-sm text-muted-foreground">Duomenų nėra.</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Pataisų ar projektų rengimo laiko duomenų šiam nariui neužfiksuota.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div
              key={item.amendment_id}
              className="rounded-lg border border-border/70 bg-muted/20 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-primary/50 transition-colors"
            >
              <div className="space-y-1">
                <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  <span>Projektas / Pataisa: {item.amendment_id}</span>
                </div>
                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 font-mono">
                  <span>Žodžių sk.: {item.word_count}</span>
                  <span>Nuorodų: {item.citation_count}</span>
                  <span>Sudėtingumas: {item.complexity}</span>
                </div>
              </div>

              <div className="flex flex-col sm:items-end">
                {item.drafting_window_min != null && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Rengimo langas: {item.drafting_window_min} min.</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
