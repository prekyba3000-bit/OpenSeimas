import { AttendanceTrajectory as Trajectory } from '../services/api';
import { formatLtMonth } from '../utils/ltDate';

/**
 * Attendance across the mandate, as a strip of months.
 *
 * The aggregate figure cannot say whether a member is turning up more or less
 * than they used to. This can, and that is a reading a citizen can act on in a
 * way a single percentage never supports.
 *
 * Gaps render as gaps. Four months this term had no sittings at all
 * (2025-02, 2025-07, 2026-01, 2026-02); drawing them as zero-height bars would
 * say the member missed everything, which is a claim about a person made from
 * a fact about the calendar. Months with too few sitting days to publish are
 * drawn differently again — they are missing data, not a recess.
 */
export function AttendanceTrajectoryStrip({ data }: { data: Trajectory | null }) {
  if (!data || data.buckets.length === 0) return null;

  const published = data.buckets.filter((b) => b.attendance !== null);
  // Nothing publishable means nothing to plot — and an empty axis would read
  // as a flat line at zero.
  if (published.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-5" aria-label="Dalyvavimas per kadenciją">
      <h3 className="text-base font-semibold text-foreground">Dalyvavimas per kadenciją</h3>
      {/* LT-COPY: needs native review */}
      <p className="text-sm text-muted-foreground mt-1">
        Kiekvienas stulpelis — vienas mėnuo. Tarpai reiškia, kad Seimas tą mėnesį neposėdžiavo.
      </p>

      <ul className="mt-4 flex items-end gap-1 h-28" role="list">
        {data.buckets.map((b) => {
          const recess = b.eligible_days === 0;
          const thin = !recess && b.attendance === null;
          const label = formatLtMonth(b.period) ?? b.period;

          if (recess || thin) {
            return (
              <li
                key={b.period}
                className="flex-1 min-w-[6px] h-full flex items-end"
                title={
                  recess
                    ? `${label}: Seimas neposėdžiavo`
                    : `${label}: per mažai posėdžių dienų (${b.eligible_days})`
                }
              >
                <span
                  className={
                    recess
                      ? 'block w-full h-1 rounded-sm bg-border'
                      : 'block w-full h-full rounded-sm border border-dashed border-muted-foreground/40'
                  }
                  aria-hidden
                />
                <span className="sr-only">
                  {recess
                    ? `${label}: Seimas neposėdžiavo`
                    : `${label}: per mažai duomenų`}
                </span>
              </li>
            );
          }

          return (
            <li
              key={b.period}
              className="flex-1 min-w-[6px] h-full flex items-end"
              title={`${label}: ${b.attendance!.toFixed(1)} % (${b.days_present} iš ${b.eligible_days} d.)`}
            >
              <span
                className="block w-full rounded-sm bg-primary/80"
                style={{ height: `${Math.max(b.attendance!, 2)}%` }}
                aria-hidden
              />
              <span className="sr-only">
                {label}: {b.attendance!.toFixed(1)} procento, {b.days_present} iš{' '}
                {b.eligible_days} posėdžių dienų
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-sm text-muted-foreground">
        {formatLtMonth(data.buckets[0].period)} – {formatLtMonth(data.buckets[data.buckets.length - 1].period)}
        {' · '}
        {published.length} iš {data.buckets.length} mėn. su paskelbtais duomenimis
      </p>
    </section>
  );
}
