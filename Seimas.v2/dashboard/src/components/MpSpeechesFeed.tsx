import { useQuery } from '@tanstack/react-query';
import { Mic, Clock, ExternalLink } from 'lucide-react';
import { api, type MpSpeeches } from '../services/api';
import { formatLtDateLong } from '../utils/ltDate';

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return '0 s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} s`;
  return `${m} min. ${s} s`;
}

export function MpSpeechesFeed({ mpId }: { mpId: string }) {
  const query = useQuery({
    queryKey: ['mps', mpId, 'speeches'],
    queryFn: () => api.getMpSpeeches(mpId),
    enabled: Boolean(mpId),
  });

  const data: MpSpeeches | undefined = query.data;
  if (!data) return null;

  const items = data.items;

  return (
    <section
      className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-5"
      aria-label="Pasisakymai posėdžiuose"
    >
      <div className="flex items-center gap-2">
        <Mic className="w-4 h-4 text-primary shrink-0" />
        <h3 className="text-base font-semibold text-foreground">
          Pasisakymai posėdžiuose ir kalbos
        </h3>
      </div>
      <p className="text-sm text-muted-foreground mt-1">
        Nario kalbos ir pasisakymai Seimo posėdžių metu, trukmė bei žodžių skaičius pagal oficialų stenogramų įrašą.
      </p>

      {items === null ? (
        <p className="mt-4 text-sm text-muted-foreground">Duomenų nėra.</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Pasisakymų stenogramose neužfiksuota.
        </p>
      ) : (
        <ul className="mt-4 space-y-3 max-h-96 overflow-y-auto pr-1">
          {items.map((speech, idx) => (
            <li
              key={`${speech.date}-${speech.title}-${idx}`}
              className="border-l-2 border-border hover:border-primary/50 pl-3 transition-colors"
            >
              <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 font-mono">
                <span>{formatLtDateLong(speech.date) ?? speech.date}</span>
                {speech.duration_seconds && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(speech.duration_seconds)}
                  </span>
                )}
                {speech.words_spoken && (
                  <span>· {speech.words_spoken} žodž.</span>
                )}
              </div>
              <div className="text-sm text-foreground mt-0.5 font-medium">
                {speech.url ? (
                  <a
                    href={speech.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:underline text-primary"
                  >
                    <span>{speech.title || 'Pasisakymas posėdyje'}</span>
                    <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                  </a>
                ) : (
                  speech.title || 'Pasisakymas posėdyje'
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
