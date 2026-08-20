import { Calendar, Coffee } from 'lucide-react';
import { LastSittingDay } from '../services/api';
import { formatLtDateLong } from '../utils/ltDate';
import { ltPlural } from '../utils/ltPlural';

/**
 * The first thing on the page: what the Seimas last actually did.
 *
 * The wireframe for this strip reads „7 balsavimų · 5 priimta · 2 atmesta ·
 * 127 dalyvavo“. Two of those four are counted from rows and are shown. The
 * outcome pair is not shown, because `votes.result_type` is NULL on all 5,279
 * rows — the LRS results feed publishes tallies and no pass/fail field — and
 * the endpoint returns `outcomes: null` rather than zeroes. A „0 priimta“
 * would read as "nothing passed that day", which is a claim nobody made.
 * When the column is populated the line grows a clause; until then it states
 * what is known and stops.
 */
export function LastSittingDayStrip({ data }: { data: LastSittingDay | null }) {
  if (!data?.sitting_date) return null;

  const dateLabel = formatLtDateLong(data.sitting_date) ?? data.sitting_date;

  const facts = [
    `${data.vote_count} ${ltPlural(data.vote_count, 'balsavimas', 'balsavimai', 'balsavimų')}`,
    `${data.mps_present} dalyvavo`,
  ];
  if (data.outcomes) facts.splice(1, 0, `${data.outcomes.decided} su paskelbtu rezultatu`);

  return (
    <section
      className="rounded-xl border border-border bg-card shadow-card px-6 py-5"
      aria-label="Paskutinė posėdžio diena"
    >
      <div className="flex items-start gap-3">
        <Calendar className="w-5 h-5 text-primary shrink-0 mt-1" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Paskutinė posėdžio diena</p>
          <h2 className="text-xl font-semibold text-foreground mt-0.5">{dateLabel}</h2>
          <p className="text-base text-muted-foreground mt-1">{facts.join(' · ')}</p>

          {data.is_recess && (
            <p className="mt-3 inline-flex items-start gap-2 rounded-lg bg-attention/15 border border-attention/40 px-3 py-2 text-sm text-foreground">
              <Coffee className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
              {/* Deliberately does not say when sittings resume. The return
                  date is a fact about the future that no source here carries,
                  and guessing it would be the same mistake as a fabricated
                  vote outcome. What is knowable is how long it has been. */}
              <span>
                Pertrauka — paskutiniai balsavimai buvo prieš {data.days_since}{' '}
                {ltPlural(data.days_since ?? 0, 'dieną', 'dienas', 'dienų')}.
              </span>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
