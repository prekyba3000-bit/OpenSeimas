import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';

import { api, type MpDiary } from '../services/api';
import { formatLtDateLong } from '../utils/ltDate';

const PAGE = 50;

/**
 * The member's official parliamentary calendar, as a timeline.
 *
 * Deliberately without a count. Diary length tracks office and committee load —
 * 4,024 events for the busiest member against 97 for the quietest — so a number
 * here would be read as diligence, which is a claim about a person made from a
 * fact about their role. The list is the point; its length is incidental.
 *
 * See docs/reviews/mp-diary-design-note.md, which refused the metric before the
 * feed was ingested rather than retiring it afterwards.
 */

function EventTime({ starts, ends }: { starts: string; ends: string | null }) {
  // "2026-09-10 17:00" -> date and clock rendered separately, so a reader scans
  // days rather than timestamps.
  const [day, clock] = starts.split(' ');
  const endClock = ends?.split(' ')[1];
  const sameDay = ends?.split(' ')[0] === day;
  return (
    <span className="tabular-nums">
      {formatLtDateLong(day) ?? day}
      {clock ? `, ${clock}` : ''}
      {endClock && sameDay ? `–${endClock}` : ''}
    </span>
  );
}

export function MpDiaryTimeline({ mpId }: { mpId: string }) {
  const [page, setPage] = useState(0);

  const query = useQuery({
    queryKey: ['mps', mpId, 'diary', page],
    queryFn: () => api.getMpDiary(mpId, PAGE, page * PAGE),
    enabled: Boolean(mpId),
    placeholderData: keepPreviousData,
  });

  const data: MpDiary | undefined = query.data;
  if (!data) return null;

  return (
    <section
      className="rounded-xl border border-border bg-card p-5"
      aria-label="Darbotvarkė"
    >
      {/* LT-COPY: needs native review */}
      <h3 className="text-base font-semibold text-foreground">Darbotvarkė</h3>
      <p className="text-sm text-muted-foreground mt-1">
        Oficialus Seimo skelbiamas nario kalendorius. Įrašų skaičius priklauso nuo
        pareigų ir komitetų, o ne nuo darbštumo, todėl jų čia nesuskaičiuojame.
      </p>

      {data.events === null ? (
        <p className="mt-4 text-sm text-muted-foreground">Duomenų nėra.</p>
      ) : data.events.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {page === 0 ? 'Darbotvarkės įrašų neužfiksuota.' : 'Daugiau įrašų nėra.'}
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {data.events.map((e) => (
            <li
              key={`${e.starts_at}-${e.title}`}
              className="border-l-2 border-border pl-3"
            >
              <div className="text-xs text-muted-foreground">
                <EventTime starts={e.starts_at} ends={e.ends_at} />
                {/* Blank at source on 89% of events. Absent, not "no location". */}
                {e.location ? <> · {e.location}</> : null}
              </div>
              <div className="text-sm text-foreground">{e.title}</div>
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
            {/* LT-COPY: needs native review */}
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
          {query.isFetching && (
            <span className="text-xs text-muted-foreground">Kraunama…</span>
          )}
        </div>
      )}
    </section>
  );
}
