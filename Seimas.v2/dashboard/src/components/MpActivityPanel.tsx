import type { MpActivity } from '../services/api';
import { formatLtDateLong } from '../utils/ltDate';

/**
 * Official travel and press releases, as evidence.
 *
 * Deliberately without a count anywhere. Trip and release frequency track
 * office and committee role — a delegation chair travels more than a
 * backbencher for reasons that have nothing to do with diligence — so a number
 * beside a name would be read as a verdict the data does not support. The
 * lists are the point; their length is incidental.
 *
 * See docs/reviews/mp-diary-design-note.md, which settled the same question
 * for the diary before either feed was built.
 */

// LRS clips titles at exactly 200 characters, mid-word, on 13.5% of trips.
// Rendering a clipped sentence as though it were whole is a small lie, so the
// cut is shown rather than hidden.
function TravelTitle({ title, truncated }: { title: string; truncated: boolean }) {
  if (!truncated) return <>{title}</>;
  return (
    <>
      {title}
      <span className="text-muted-foreground">…</span>{' '}
      {/* LT-COPY: needs native review */}
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        (pavadinimas šaltinyje nukirptas)
      </span>
    </>
  );
}

function DateRange({ from, to }: { from: string; to: string | null }) {
  // Long form deliberately: these lists span several years, and
  // formatLtDateShort drops the year by design. Null on an unparseable date
  // falls back to the raw value rather than an empty line reading as "no date".
  const start = formatLtDateLong(from) ?? from;
  if (!to || to === from) return <>{start}</>;
  return (
    <>
      {start} – {formatLtDateLong(to) ?? to}
    </>
  );
}


/* LT-COPY: needs native review */
function MoreNote({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p className="mt-3 text-xs text-muted-foreground">
      Rodomi naujausi įrašai. Sąrašas nėra visas.
    </p>
  );
}

export function MpActivityPanel({ data }: { data: MpActivity | null | undefined }) {
  if (!data) return null;

  const {
    travel,
    press_releases: press,
    travel_has_more: travelMore,
    press_has_more: pressMore,
    staff,
  } = data;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section
        className="rounded-xl border border-border bg-card p-5"
        aria-label="Komandiruotės"
      >
        {/* LT-COPY: needs native review */}
        <h3 className="text-base font-semibold text-foreground">Komandiruotės</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Oficialios išvykos, kaip jas skelbia Seimas. Sąrašas nėra vertinimas — išvykų
          skaičius priklauso nuo pareigų ir komiteto, o ne nuo darbštumo.
        </p>

        {travel === null ? (
          /* Unknown, not empty. The table is absent in this database, which is
             a different fact from "this member did not travel". */
          <p className="mt-4 text-sm text-muted-foreground">Duomenų nėra.</p>
        ) : travel.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Komandiruočių neužfiksuota.</p>
        ) : (
          <ul className="mt-4 space-y-3 max-h-96 overflow-y-auto">
            {travel.map((trip) => (
              <li
                key={`${trip.date_from}-${trip.title}`}
                className="border-l-2 border-border pl-3"
              >
                <div className="text-xs text-muted-foreground tabular-nums">
                  <DateRange from={trip.date_from} to={trip.date_to} />
                </div>
                <div className="text-sm text-foreground">
                  <TravelTitle title={trip.title} truncated={trip.title_truncated} />
                </div>
              </li>
            ))}
          </ul>
        )}
        <MoreNote show={travelMore === true} />
      </section>

      <section
        className="rounded-xl border border-border bg-card p-5"
        aria-label="Pranešimai žiniasklaidai"
      >
        {/* LT-COPY: needs native review */}
        <h3 className="text-base font-semibold text-foreground">Pranešimai žiniasklaidai</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Nario paskelbti pranešimai. Rodome, kad jie buvo paskelbti — ne ką jie verti.
        </p>

        {press === null ? (
          /* Unknown, not empty — same three-way branch as travel above. The
             speeches table can be absent, and "we cannot tell" is not "this
             member issued none". */
          <p className="mt-4 text-sm text-muted-foreground">Duomenų nėra.</p>
        ) : press.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Pranešimų neužfiksuota.</p>
        ) : (
          <ul className="mt-4 space-y-3 max-h-96 overflow-y-auto">
            {press.map((item) => (
              <li key={`${item.date}-${item.title}`} className="border-l-2 border-border pl-3">
                <div className="text-xs text-muted-foreground tabular-nums">
                  {formatLtDateLong(item.date) ?? item.date}
                </div>
                <div className="text-sm text-foreground">
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline focus-visible:underline"
                    >
                      {item.title}
                    </a>
                  ) : (
                    item.title
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <MoreNote show={pressMore} />
      </section>
      <section
        className="rounded-xl border border-border bg-card p-5 lg:col-span-2"
        aria-label="Padėjėjai ir sekretoriai"
      >
        {/* LT-COPY: needs native review */}
        <h3 className="text-base font-semibold text-foreground">Padėjėjai ir sekretoriai</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Kas dirba nario komandoje. Kontaktų nerenkame ir neskelbiame — padėjėjai
          yra darbuotojai, o ne renkami politikai.
        </p>

        {staff === null ? (
          <p className="mt-4 text-sm text-muted-foreground">Duomenų nėra.</p>
        ) : staff.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Padėjėjų neužfiksuota.</p>
        ) : (
          <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {staff.map((person) => (
              <li
                key={`${person.last_name}-${person.first_name}`}
                className="text-sm text-foreground flex items-baseline gap-2"
              >
                <span>
                  {person.first_name} {person.last_name}
                </span>
                {/* null means the source did not say, which is not "not in the
                    constituency". Only an explicit yes is labelled. */}
                {person.in_constituency === true && (
                  <span className="text-xs text-muted-foreground">apygardoje</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
