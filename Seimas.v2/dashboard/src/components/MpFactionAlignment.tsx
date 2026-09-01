import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';

import { api } from '../services/api';
import { formatLtDateLong } from '../utils/ltDate';

const PAGE = 25;

/**
 * The votes behind the party-alignment figure.
 *
 * A percentage nobody can open is an assertion. This shows what it is made of:
 * what the member chose, what the majority of their faction chose on the same
 * vote, and whether the two matched.
 *
 * Deliberately not framed as loyalty. Voting differently from one's faction is
 * an ordinary act with many possible reasons — conscience, constituency, a
 * drafting objection — and the platform has none of them. It reports that the
 * choices differed, and stops there.
 *
 * Votes where fewer than ten of the faction voted are excluded rather than
 * scored: there is no majority to compare against.
 */
export function MpFactionAlignment({ mpId }: { mpId: string }) {
  const [only, setOnly] = useState<'diverged' | 'all'>('diverged');
  const [page, setPage] = useState(0);

  const query = useQuery({
    queryKey: ['mps', mpId, 'faction-alignment', only, page],
    queryFn: () => api.getMpFactionAlignment(mpId, only, PAGE, page * PAGE),
    enabled: Boolean(mpId),
    placeholderData: keepPreviousData,
  });

  const data = query.data;
  if (!data) return null;

  const choose = (o: 'diverged' | 'all') => {
    setOnly(o);
    setPage(0);
  };

  return (
    <section
      className="rounded-xl border border-border bg-card p-5"
      aria-label="Sutapimas su frakcija"
    >
      {/* LT-COPY: needs native review */}
      <h3 className="text-base font-semibold text-foreground">Sutapimas su frakcija</h3>

      {data.comparable_votes === 0 ? (
        <p className="text-sm text-muted-foreground mt-1">
          Nėra balsavimų, kuriuose frakcijos poziciją būtų galima nustatyti — frakcija
          per maža. Skaičiaus nerodome.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mt-1">
            {data.alignment_pct === null ? (
              <>Per mažai palyginamų balsavimų, kad skaičius ką nors reikštų.</>
            ) : (
              <>
                Nario pasirinkimas sutapo su frakcijos dauguma{' '}
                <span className="text-foreground font-medium">
                  {data.aligned_votes} iš {data.comparable_votes}
                </span>{' '}
                balsavimų ({data.alignment_pct} %).
              </>
            )}{' '}
            Kitoks balsavimas nei frakcijos — įprastas dalykas, o priežasčių mes nežinome
            ir jų nevertiname.
          </p>

          <div className="mt-4 flex gap-2">
            {(['diverged', 'all'] as const).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => choose(o)}
                aria-pressed={only === o}
                className={
                  'rounded-md border px-3 py-1.5 text-sm ' +
                  (only === o
                    ? 'border-primary text-foreground'
                    : 'border-border text-muted-foreground')
                }
              >
                {o === 'diverged' ? 'Kur skyrėsi' : 'Visi palyginami'}
              </button>
            ))}
          </div>

          {data.votes.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              {only === 'diverged'
                ? 'Nesutapimų neužfiksuota.'
                : 'Palyginamų balsavimų nerasta.'}
            </p>
          ) : (
            <ul className="mt-4 space-y-3 max-h-96 overflow-y-auto">
              {data.votes.map((v) => (
                <li key={v.vote_id} className="border-l-2 border-border pl-3">
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {formatLtDateLong(v.date) ?? v.date}
                  </div>
                  <div className="text-sm text-foreground">{v.title}</div>
                  {/* Both sides shown. „Skyrėsi" without the two choices beside
                      it is a label; with them it is a fact the reader checks. */}
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Narys: <span className="text-foreground">{v.choice}</span> · Frakcijos
                    dauguma: <span className="text-foreground">{v.faction_position}</span>{' '}
                    ({v.faction_voters} balsavo)
                  </div>
                </li>
              ))}
            </ul>
          )}

          {(page > 0 || data.has_more) && (
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || query.isFetching}
                className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Ankstesni
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={!data.has_more || query.isFetching}
                className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Vėlesni
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
