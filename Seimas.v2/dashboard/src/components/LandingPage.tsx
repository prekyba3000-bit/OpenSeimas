import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { api, type MpSummary } from '../services/api';
import { SeimasMap } from './SeimasMap';
import { ThemeToggle } from './ThemeToggle';
import { getPartyColor, getPartyShort } from '../utils/partyColors';
import { formatLtDateLong, formatLtDateShort } from '../utils/ltDate';
import { ltPlural } from '../utils/ltPlural';
import { latestQuestions, sampleFaces, searchMembers, voteTime, type CountedVote } from '../utils/frontPage';
import { portraitThumb } from '../utils/portraitThumb';

// The front door. Built around the questions a visitor arrives with — who
// represents me, what was decided, who sits where, who governs — rather than
// around the data types the portal holds. Design note and mockup:
// docs/reviews/2026-11-14-front-page.md, docs/reviews/mockups/pradzia-2026.html.

const NAV = [
  // LT-COPY: needs native review
  { to: '/dashboard/mps', label: 'Kas mane atstovauja' },
  { to: '/dashboard/votes', label: 'Ką nusprendė' },
  { to: '/dashboard/factions', label: 'Seimo sudėtis' },
  { to: '/dashboard/valdzia', label: 'Kas valdo' },
  { to: '/dashboard/methodology', label: 'Kaip skaičiuojame' },
];

// Constituency names only: a named person as a suggested search on the front
// page would be the platform pointing at someone.
const EXAMPLES = ['Telšių', 'Antakalnio', 'Alytaus', 'Pasaulio lietuvių'];

const FACES = 12;
const FACES_ON_PHONE = 8;

function whereElected(m: MpSummary): string {
  // LT-COPY: needs native review
  if (m.election_type === 'single_mandate' && m.constituency_name) {
    return `${m.constituency_name} apygarda${m.constituency_number ? ` (Nr. ${m.constituency_number})` : ''}`;
  }
  return 'Pagal partijos sąrašą';
}

export function LandingPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  useEffect(() => {
    document.title = 'Atviras Seimas';
  }, []);

  const statsQ = useQuery({ queryKey: ['dashboard', 'stats'], queryFn: () => api.getStats() });
  const mpsQ = useQuery({ queryKey: ['mps', 'roster'], queryFn: () => api.getMps() });
  const dayQ = useQuery({ queryKey: ['meta', 'last-sitting-day'], queryFn: () => api.getLastSittingDay() });
  const day = dayQ.data ?? null;
  const dayVotesQ = useQuery({
    queryKey: ['votes', 'day', day?.sitting_date],
    queryFn: () => api.getVotes(500, 0, { from: day?.sitting_date, to: day?.sitting_date }),
    enabled: Boolean(day?.sitting_date),
  });

  const mps = useMemo(() => mpsQ.data ?? [], [mpsQ.data]);
  const faces = useMemo(() => sampleFaces(mps, FACES), [mps]);
  const results = useMemo(() => searchMembers(mps, query), [mps, query]);
  const questions = useMemo(() => latestQuestions(dayVotesQ.data ?? []), [dayVotesQ.data]);
  const dayLabel = formatLtDateLong(day?.sitting_date);
  const active = statsQ.data?.mps_active;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 md:h-16 md:flex-nowrap md:py-0">
          <Link to="/" className="font-serif text-xl font-bold tracking-tight">
            Atviras <span className="text-primary">Seimas</span>
          </Link>
          <ThemeToggle className="ml-auto md:order-last md:ml-0" />
          <nav aria-label="Pagrindinis" className="hide-scrollbar -mx-1 flex w-full gap-1 overflow-x-auto md:ml-auto md:w-auto">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="whitespace-nowrap rounded-full px-3.5 py-2 text-[15px] font-semibold text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main>
        {/* ── Who represents me ─────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 pb-12 pt-14 text-center md:pt-20">
          {dayLabel && (
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1.5 text-sm font-semibold text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
              {/* LT-COPY: needs native review */}
              Duomenys iki {dayLabel}
            </span>
          )}
          <h1 className="mx-auto mt-6 font-serif text-[clamp(2.5rem,7vw,4.75rem)] font-bold leading-[1.02] tracking-tight">
            Ką Seimas
            <br />
            <span className="text-primary">iš tikrųjų</span> padarė
          </h1>
          <p className="mx-auto mt-5 max-w-[46ch] text-lg text-muted-foreground md:text-xl">
            {/* LT-COPY: needs native review */}
            Raskite savo Seimo narį ir pažiūrėkite, kaip jis balsavo. Kiekvienas skaičius turi
            šaltinį. Vertinimų nerašome.
          </p>

          <div className="relative mx-auto mt-9 max-w-xl text-left">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && results[0]) navigate(`/dashboard/mps/${results[0].id}`);
              }}
              // LT-COPY: needs native review
              placeholder={mpsQ.isError ? 'Sąrašo įkelti nepavyko' : 'Pavardė arba apygarda'}
              aria-label="Ieškoti Seimo nario pagal pavardę arba apygardą"
              disabled={!mpsQ.data}
              className="w-full rounded-2xl border-[1.5px] border-border bg-card py-5 pl-14 pr-5 text-lg shadow-lg shadow-black/5 outline-none transition-colors focus:border-primary disabled:opacity-70"
            />
            {query.trim().length >= 2 && (
              <ul className="absolute inset-x-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
                {results.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-muted-foreground">
                    {/* LT-COPY: needs native review */}
                    Nieko neradome. Bandykite pavardę arba apygardos pavadinimą.
                  </li>
                ) : (
                  results.map((m) => (
                    <li key={m.id} className="border-b border-border last:border-0">
                      <Link to={`/dashboard/mps/${m.id}`} className="flex items-center gap-3.5 px-4 py-3 hover:bg-muted/50">
                        <img
                          src={portraitThumb(m.photo_url)}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="h-12 w-12 shrink-0 rounded-full bg-muted object-cover object-top"
                        />
                        <span className="min-w-0">
                          <span className="block font-semibold leading-tight">{m.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {getPartyShort(m.party)} · {whereElected(m)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[15px] text-muted-foreground">
            {/* LT-COPY: needs native review */}
            <span>Pabandykite:</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setQuery(ex)}
                className="rounded-full border border-border px-3.5 py-1 text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {ex}
              </button>
            ))}
          </div>

          <ul className="mx-auto mt-12 flex max-w-4xl flex-wrap justify-center gap-2.5" aria-label="Keletas Seimo narių">
            {faces.map((m, i) => (
              <li key={m.id} className={i >= FACES_ON_PHONE ? 'hidden sm:block' : undefined}>
                <Link
                  to={`/dashboard/mps/${m.id}`}
                  title={`${m.name} · ${getPartyShort(m.party)}`}
                  className="block h-16 w-16 rounded-full p-[3px] transition-transform hover:scale-110"
                  style={{ background: getPartyColor(m.party) }}
                >
                  <img
                    src={portraitThumb(m.photo_url)}
                    alt={m.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full rounded-full border-2 border-background bg-muted object-cover object-top"
                  />
                </Link>
              </li>
            ))}
          </ul>
          <Link to="/dashboard/mps" className="mt-6 inline-block font-semibold text-primary hover:underline">
            {/* LT-COPY: needs native review */}
            {active ? `Visi ${active} Seimo nariai →` : 'Visi Seimo nariai →'}
          </Link>
        </section>

        {/* ── What was decided ──────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 py-16">
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.08em] text-primary">Ką nusprendė</p>
          <h2 className="font-serif text-[clamp(1.9rem,4.2vw,2.75rem)] font-bold leading-tight tracking-tight">
            {/* LT-COPY: needs native review */}
            {day?.sitting_date ? `Paskutinis posėdis: ${formatLtDateShort(day.sitting_date)}` : 'Paskutinis posėdis'}
          </h2>
          {day && active != null && (
            <p className="mt-3 max-w-[60ch] text-muted-foreground">
              {/* LT-COPY: needs native review */}
              {day.vote_count} {ltPlural(day.vote_count, 'balsavimas', 'balsavimai', 'balsavimų')}. Bent kartą
              balsavo {day.mps_present} iš {active} Seimo narių. Žemiau — paskutiniai trys klausimai, dėl
              kurių tą dieną balsuota.
            </p>
          )}

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {questions.map((v) => (
              <VoteCard key={v.id} vote={v} />
            ))}
          </div>
          {dayVotesQ.isSuccess && questions.length === 0 && (
            <p className="mt-6 text-muted-foreground">
              {/* LT-COPY: needs native review */}
              Šios dienos balsavimų rezultatų neturime.
            </p>
          )}
          <Link to="/dashboard/votes" className="mt-6 inline-block font-semibold text-primary hover:underline">
            Visi balsavimai →
          </Link>
        </section>

        {/* ── Who sits where ────────────────────────────────────────────── */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.08em] text-primary">Seimo sudėtis</p>
            <h2 className="font-serif text-[clamp(1.9rem,4.2vw,2.75rem)] font-bold leading-tight tracking-tight">
              {/* LT-COPY: needs native review */}
              {/* „Kas kur sėdi." stood here, but no seating data exists: the dots
                  are filled in alphabetical order (evaluation CORF-06). */}
              {statsQ.data ? `${statsQ.data.seats_total} vieta.` : 'Seimo nariai.'}
            </h2>
            <p className="mt-3 max-w-[48ch] text-muted-foreground">
              {/* LT-COPY: needs native review */}
              Kiekvienas taškas — vienas Seimo narys; vietos salėje nerodomos. Spalva rodo frakciją.
              Užveskite pelę arba palieskite tašką — pamatysite, kuris tai narys.
            </p>
            <Link to="/dashboard/factions" className="mt-5 inline-block font-semibold text-primary hover:underline">
              Frakcijos →
            </Link>
          </div>
          <div className="rounded-3xl border border-border bg-card p-4 shadow-lg shadow-black/5">
            <SeimasMap mps={mps} compact hideControls />
          </div>
        </section>

        {/* ── Who governs ───────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 py-16">
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.08em] text-primary">Kas valdo</p>
          <h2 className="font-serif text-[clamp(1.9rem,4.2vw,2.75rem)] font-bold leading-tight tracking-tight">
            {/* LT-COPY: needs native review */}
            Trys institucijos, vienas kelias
          </h2>
          <p className="mt-3 max-w-[60ch] text-muted-foreground">
            {/* LT-COPY: needs native review */}
            Įstatymą priima Seimas, pasirašo arba grąžina Prezidentas, vykdo Vyriausybė.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {/* LT-COPY: needs native review */}
            <Door n={1} to="/dashboard/mps" title="Seimas" text="Seimo nariai, jų balsavimai ir dalyvavimas posėdžiuose." />
            <Door n={2} to="/dashboard/valdzia" title="Prezidentas" text="Pasirašo įstatymus arba grąžina juos Seimui. Dekretai su nuorodomis." />
            <Door n={3} to="/dashboard/valdzia" title="Vyriausybė" text="Ministras Pirmininkas ir ministrai, kiekvienas su paskyrimo dekretu." />
          </div>
        </section>

        {/* ── How we count ──────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="grid gap-8 rounded-[28px] bg-primary/10 p-8 md:grid-cols-3 md:p-11">
            {/* LT-COPY: needs native review */}
            <Trust to="/dashboard/methodology" title="Be balų ir reitingų" text="Rodome, kas padaryta. Kas geriau, sprendžiate jūs." />
            <Trust to="/dashboard/sources" title="Kiekvienas skaičius su šaltiniu" text="Prie rodiklio parašyta, iš kur jis ir kaip skaičiuojamas." />
            <Trust to="/dashboard/corrections" title="Klaidas taisome viešai" text="Pataisymų sąrašas atviras, su datomis." />
          </div>
        </section>
      </main>

      <footer className="mt-6 border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-9 text-sm text-muted-foreground md:flex-row md:justify-between">
          {/* LT-COPY: needs native review */}
          <p>Atviras Seimas — nepriklausomas projektas, ne Lietuvos Respublikos Seimo svetainė.</p>
          <p className="flex gap-4">
            <Link to="/dashboard/sources" className="hover:text-foreground">Šaltiniai</Link>
            <Link to="/dashboard/methodology" className="hover:text-foreground">Metodika</Link>
            <Link to="/dashboard/corrections" className="hover:text-foreground">Pataisymai</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

function VoteCard({ vote }: { vote: CountedVote }) {
  const total = vote.votes_for + vote.votes_against + vote.votes_abstained;
  const pct = (n: number) => `${((100 * n) / total).toFixed(1)}%`;
  const time = voteTime(vote.voted_at);
  return (
    <article className="flex flex-col rounded-3xl border border-border bg-card p-6 shadow-lg shadow-black/5">
      {time && <p className="mb-2 text-sm text-muted-foreground">{time}</p>}
      <h3 className="line-clamp-4 min-h-[5.2em] text-[17px] font-semibold leading-snug">{vote.title ?? 'Be pavadinimo'}</h3>
      <div className="mt-5 flex h-3.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <span className="bg-vote-for" style={{ width: pct(vote.votes_for) }} />
        <span className="bg-vote-against" style={{ width: pct(vote.votes_against) }} />
        <span className="bg-vote-abstain" style={{ width: pct(vote.votes_abstained) }} />
      </div>
      <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[15px]">
        <Tally dot="bg-vote-for" label="Už" n={vote.votes_for} />
        <Tally dot="bg-vote-against" label="Prieš" n={vote.votes_against} />
        <Tally dot="bg-vote-abstain" label="Susilaikė" n={vote.votes_abstained} />
      </dl>
      <Link to={`/dashboard/votes/${vote.id}`} className="mt-auto pt-5 font-semibold text-primary hover:underline">
        {/* LT-COPY: needs native review */}
        Kas kaip balsavo →
      </Link>
    </article>
  );
}

function Tally({ dot, label, n }: { dot: string; label: string; n: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} aria-hidden="true" />
      <dt>{label}</dt>
      <dd className="font-bold tabular-nums">{n}</dd>
    </div>
  );
}

function Door({ n, to, title, text }: { n: number; to: string; title: string; text: string }) {
  return (
    <Link
      to={to}
      className="block rounded-3xl border border-border bg-card p-7 transition-all hover:-translate-y-0.5 hover:border-primary"
    >
      <span className="font-serif text-5xl font-bold leading-none text-primary">{n}</span>
      <h3 className="mt-4 font-serif text-2xl font-bold">{title}</h3>
      <p className="mt-1.5 text-muted-foreground">{text}</p>
    </Link>
  );
}

function Trust({ to, title, text }: { to: string; title: string; text: string }) {
  return (
    <Link to={to} className="group block">
      <h3 className="font-serif text-xl font-bold group-hover:text-primary">{title}</h3>
      <p className="mt-1.5 text-muted-foreground">{text}</p>
    </Link>
  );
}
