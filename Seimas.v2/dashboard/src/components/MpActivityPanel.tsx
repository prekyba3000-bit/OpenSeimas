import { Plane, Newspaper, Users, ShieldCheck, ExternalLink, MapPin, Building2 } from 'lucide-react';
import type { MpActivity } from '../services/api';
import { formatLtDateLong } from '../utils/ltDate';

/**
 * Official travel, press releases, and staff as evidence.
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
      <span
        title="Šaltinis (LRS API) sutrumpino pavadinimą ties 200 simbolių"
        className="text-xs text-muted-foreground whitespace-nowrap cursor-help border-b border-dotted border-muted-foreground/50"
      >
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

  const constituencyStaff = staff ? staff.filter((s) => s.in_constituency === true) : [];
  const capitalStaff = staff ? staff.filter((s) => s.in_constituency !== true) : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 1. Travel Section */}
      <section
        className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-5 flex flex-col justify-between"
        aria-label="Komandiruotės"
      >
        <div>
          <div className="flex items-center gap-2">
            <Plane className="w-4 h-4 text-primary shrink-0" />
            <h3 className="text-base font-semibold text-foreground">Komandiruotės</h3>
          </div>
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
            <ul className="mt-4 space-y-3 max-h-96 overflow-y-auto pr-1">
              {travel.map((trip) => (
                <li
                  key={`${trip.date_from}-${trip.title}`}
                  className="border-l-2 border-border hover:border-primary/50 pl-3 transition-colors"
                >
                  <div className="text-xs text-muted-foreground tabular-nums font-mono">
                    <DateRange from={trip.date_from} to={trip.date_to} />
                  </div>
                  <div className="text-sm text-foreground mt-0.5">
                    <TravelTitle title={trip.title} truncated={trip.title_truncated} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <MoreNote show={travelMore === true} />
      </section>

      {/* 2. Press Releases Section */}
      <section
        className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-5 flex flex-col justify-between"
        aria-label="Pranešimai žiniasklaidai"
      >
        <div>
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-primary shrink-0" />
            <h3 className="text-base font-semibold text-foreground">Pranešimai žiniasklaidai</h3>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Nario paskelbti pranešimai. Rodome, kad jie buvo paskelbti — ne ką jie verti.
          </p>

          {press === null ? (
            /* Unknown, not empty — same three-way branch as travel above. */
            <p className="mt-4 text-sm text-muted-foreground">Duomenų nėra.</p>
          ) : press.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Pranešimų neužfiksuota.</p>
          ) : (
            <ul className="mt-4 space-y-3 max-h-96 overflow-y-auto pr-1">
              {press.map((item) => (
                <li
                  key={`${item.date}-${item.title}`}
                  className="border-l-2 border-border hover:border-primary/50 pl-3 transition-colors"
                >
                  <div className="text-xs text-muted-foreground tabular-nums font-mono">
                    {formatLtDateLong(item.date) ?? item.date}
                  </div>
                  <div className="text-sm text-foreground mt-0.5">
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 hover:underline focus-visible:underline text-primary"
                      >
                        <span>{item.title}</span>
                        <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                      </a>
                    ) : (
                      item.title
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <MoreNote show={pressMore === true} />
      </section>

      {/* 3. Assistants and Staff Section */}
      <section
        className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-5 lg:col-span-2"
        aria-label="Padėjėjai ir sekretoriai"
      >
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary shrink-0" />
          <h3 className="text-base font-semibold text-foreground">Padėjėjai ir sekretoriai</h3>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Kas dirba nario komandoje. Kontaktų nerenkame ir neskelbiame — padėjėjai
          yra darbuotojai, o ne renkami politikai.
        </p>

        {staff === null ? (
          <p className="mt-4 text-sm text-muted-foreground">Duomenų nėra.</p>
        ) : staff.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Padėjėjų neužfiksuota.</p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Group 1: Seimo kanceliarijoje */}
              {capitalStaff.length > 0 && (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Seimo kanceliarijoje</span>
                  </div>
                  <ul className="space-y-1.5">
                    {capitalStaff.map((person) => (
                      <li
                        key={`${person.last_name}-${person.first_name}`}
                        className="text-sm text-foreground font-medium"
                      >
                        {person.first_name} {person.last_name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Group 2: Apygardoje */}
              {constituencyStaff.length > 0 && (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Apygardoje</span>
                  </div>
                  <ul className="space-y-1.5">
                    {constituencyStaff.map((person) => (
                      <li
                        key={`${person.last_name}-${person.first_name}`}
                        className="text-sm text-foreground font-medium flex items-center justify-between"
                      >
                        <span>
                          {person.first_name} {person.last_name}
                        </span>
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/50">
                          apygardoje
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Fallback if all staff have undefined grouping */}
            {capitalStaff.length === 0 && constituencyStaff.length === 0 && (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                {staff.map((person) => (
                  <li
                    key={`${person.last_name}-${person.first_name}`}
                    className="text-sm text-foreground flex items-baseline gap-2"
                  >
                    <span>
                      {person.first_name} {person.last_name}
                    </span>
                    {person.in_constituency === true && (
                      <span className="text-xs text-muted-foreground">apygardoje</span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {/* Ethical Privacy Notice */}
            <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2 bg-muted/40 p-2.5 rounded-lg border border-border/50">
              <ShieldCheck className="w-4 h-4 shrink-0 text-primary" />
              <span>
                Asmens duomenų apsauga: Kontaktų nerenkame ir neskelbiame siekiant apsaugoti pagal darbo sutartį dirbančių darbuotojų privatumą.
              </span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

