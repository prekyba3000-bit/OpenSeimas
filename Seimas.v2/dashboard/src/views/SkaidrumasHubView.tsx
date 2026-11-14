import React from 'react';
import { useQueries } from '@tanstack/react-query';
import { useNavigate, NavLink } from 'react-router';
import {
  AlertTriangle,
  Database,
  Radio,
  Search,
  ShieldAlert,
  GitBranch,
  FileText,
  Scale,
  Trophy,
  BookOpen,
  Mail,
} from 'lucide-react';
import { CitationCopyButton } from '../components/CitationCopyButton';
import { VerifiedVotesPanel } from '../components/VerifiedVotesPanel';
import { CorrectionsAndRepliesPanel } from '../components/CorrectionsAndRepliesPanel';
import {
  api,
  type DashboardStats,
  type ForensicFlag,
  type LoyaltyResponse,
  type MpSummary,
  type VoteSummary,
} from '../services/api';
import { ProblemDetailsNotice } from '../components/ProblemDetailsNotice';
import { Button } from '../components/Button';
import { occupancyLabel } from '../utils/mpCounts';
import { belowAttendance, formatAttendance, hasAttendance } from '../utils/attendance';

const EMPTY_LOYALTY: LoyaltyResponse = { alignment: [], total_mps: 0 };

/**
 * Five distinguishable lines for the loyalty trend chart. Taken from the muted
 * faction palette rather than a rainbow of saturated primaries — these are
 * named MPs, and #ef4444 next to #22c55e reads as "bad" next to "good".
 */
const SERIES_COLORS = ['#6E8CAE', '#B66F3D', '#5D8A6C', '#937DAA', '#8C857A'];

const BENFORD_EXPECTED: Record<string, number> = {
  '1': 0.30103, '2': 0.17609, '3': 0.12494, '4': 0.09691,
  '5': 0.07918, '6': 0.06695, '7': 0.05799, '8': 0.05115, '9': 0.04576,
};

export default function SkaidrumasHubView() {
  const navigate = useNavigate();

  const goToMpForensicFlag = (mpId: string, engine: ForensicFlag['engine']) => {
    navigate(`/dashboard/mps/${mpId}?flag=${engine}`);
  };
  const [query, setQuery] = React.useState('');

  const hubQueries = useQueries({
    queries: [
      { queryKey: ['skaidrumas', 'stats'] as const, queryFn: () => api.getStats() },
      { queryKey: ['skaidrumas', 'mps'] as const, queryFn: () => api.getMps() },
      { queryKey: ['skaidrumas', 'votesPreview'] as const, queryFn: () => api.getVotes(8, 0) },
      {
        queryKey: ['skaidrumas', 'loyalty'] as const,
        queryFn: async () => {
          try {
            return await api.getLoyaltyGraph();
          } catch {
            return EMPTY_LOYALTY;
          }
        },
        retry: false,
      },
    ],
  });

  const [statsQ, mpsQ, votesQ, loyaltyQ] = hubQueries;

  const loading = hubQueries.some((q) => q.isPending);
  const coreError = [statsQ, mpsQ, votesQ].find((q) => q.isError)?.error;
  const refetchHub = () => {
    hubQueries.forEach((q) => void q.refetch());
  };

  const stats = statsQ.data ?? null;
  const mps = React.useMemo(() => mpsQ.data ?? [], [mpsQ.data]);
  const votes = React.useMemo(() => votesQ.data ?? [], [votesQ.data]);
  const loyalty = loyaltyQ.data ?? null;

  const filteredMps = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return mps
      .filter((mp) => mp.name.toLowerCase().includes(q) || (mp.party || '').toLowerCase().includes(q))
      .slice(0, 6);
  }, [mps, query]);

  const riskyMps = React.useMemo(
    // Only members with a publishable figure can be ranked as lowest-attending.
    // A suppressed member sorted to the top of this list was being named as a
    // risk on the strength of no data at all.
    () => belowAttendance(mps, 60),
    [mps],
  );

  const tickerItems = React.useMemo(() => {
    const lowAttendanceCount = belowAttendance(mps, 60).length;
    const newestVote = votes[0]?.title ?? 'Nėra naujausių įrašų';
    return [
      // A citation must not be ambiguous about which number it quotes: this is
      // the count holding a mandate today, against the constitutional 141.
      `Seimo nariai (mandatą turi): ${occupancyLabel(stats ?? {})}`,
      `Balsavimai: ${stats?.historical_votes ?? '—'}`,
      `Dalyvavimas žemiau 60 %: ${lowAttendanceCount}`,
      `Naujausias balsavimas: ${newestVote}`,
    ];
  }, [stats, mps, votes]);

  if (loading) {
    return <div className="py-16 text-center text-muted-foreground">Kraunama „Skaidrumas Hub“...</div>;
  }

  if (coreError) {
    return (
      <div className="space-y-4 py-8 max-w-lg mx-auto">
        <ProblemDetailsNotice error={coreError} />
        <Button variant="secondary" type="button" onClick={() => refetchHub()}>
          Bandyti dar kartą
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-8">
        <p className="text-sm] text-primary mb-4">OpenSeimas · skaidrumo centras</p>
        <h1 className="text-4xl md:text-5xl font-black leading-tight">
          Neįmanoma būti <span className="text-primary">suktam</span>.
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          {/* LT-COPY: needs native review */}
          Viešoji atskaitomybės platforma: balsavimai, dalyvavimas ir pasisakymai vienoje vietoje.
        </p>
        <p className="mt-2 text-xs text-muted-foreground max-w-2xl">
          Tai ne LR Seimo oficiali svetainė — nepriklausomas civic tech projektas; šaltiniai ir metodika nurodyti atskiruose puslapiuose.
        </p>

        {/* Mission — the same text as the master plan preamble, README and
            ADR 0007. Kept in sync deliberately: a visitor, a collaborator and a
            journalist should each meet it before anything else. */}
        <div className="mt-8 max-w-2xl space-y-4 border-t border-border pt-6">
          <h2 className="text-lg font-semibold text-foreground">Kodėl šis projektas egzistuoja</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Kad kuo daugiau Lietuvos žmonių 2028 m. Seimo rinkimuose apsispręstų{' '}
            <strong className="text-foreground">patys, remdamiesi tuo, ką išrinktieji iš tikrųjų padarė</strong>,
            o ne tuo, ką žadėjo. Ir kad balsavimas nustotų atrodyti beprasmis ar per sudėtingas tiems,
            kurie dar niekada nebalsavo.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            <strong className="text-foreground">
              „Nebalsuodamas tu nepasišalini — tu atiduodi savo balsą tiems, kurie balsuoja.“
            </strong>{' '}
            Balsas nedingsta: jis tiesiog atitenka kitiems. Sąmoningai atiduotas balsas yra
            paprasčiausia piliečio galia.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Mes niekada nesakome, už ką balsuoti.</strong>{' '}
            Rodome, ką kiekvienas Seimo narys ir frakcija patikrinamai padarė, ir padedame
            susidaryti savo nuomonę. Jei platforma imtų kreipti, ji taptų dar vienu politiniu
            veikėju — ir viskas, ką ji skelbia, prarastų vertę.
          </p>
        </div>
        <div className="mt-6 relative max-w-xl">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ieškoti parlamento nario arba frakcijos..."
            className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm"
          />
        </div>
        {filteredMps.length > 0 && (
          <div className="mt-3 grid gap-2 max-w-xl">
            {filteredMps.map((mp) => (
              <button
                key={mp.id}
                onClick={() => navigate(`/dashboard/mps/${mp.id}`)}
                className="text-left rounded-md border border-border px-3 py-2 hover:bg-muted/40"
              >
                <div className="font-medium text-sm">{mp.name}</div>
                <div className="text-xs text-muted-foreground">{mp.party || 'Nežinoma'} · {formatAttendance(mp.attendance)} lankomumas</div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-2 items-center">
          <span className="text-smwider text-muted-foreground w-full sm:w-auto sm:mr-2">Greiti žingsniai</span>
          <NavLink
            to="/dashboard/votes"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted/50"
          >
            <FileText className="w-4 h-4" />
            Balsavimai
          </NavLink>
          <NavLink
            to="/dashboard/sources"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted/50"
          >
            <Database className="w-4 h-4" />
            Duomenų šaltiniai
          </NavLink>
          <NavLink
            to="/dashboard/compare"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted/50"
          >
            <Scale className="w-4 h-4" />
            Palyginimas
          </NavLink>
          <NavLink
            to="/dashboard/stebejimas"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted/50"
          >
            <Trophy className="w-4 h-4" />
            Pasisakymai ir balsavimai
          </NavLink>
          <NavLink
            to="/dashboard/methodology"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted/50"
          >
            <BookOpen className="w-4 h-4" />
            Metodika
          </NavLink>
          <NavLink
            to="/dashboard/corrections"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted/50"
          >
            <Mail className="w-4 h-4" />
            Pataisymai
          </NavLink>
          <CitationCopyButton className="border-border" />
        </div>
      </section>

      <section className="rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-2 text-sm] text-primary border-b border-border bg-primary/5">
          Gyvai
        </div>
        <div className="flex overflow-hidden whitespace-nowrap">
          <div className="animate-[scroll_35s_linear_infinite] py-2">
            {[...tickerItems, ...tickerItems].map((item, idx) => (
              <span key={idx} className="inline-block px-8 text-sm text-muted-foreground border-r border-border">
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Lankomumas žemiau 60 %</h2>
          </div>
            {/* LT-COPY: needs native review */}
            <p className="text-xs text-muted-foreground mb-3">
              Nariai, kurių dalyvavimas posėdžiuose žemiau 60 %. Tai atrankos kriterijus, o ne
              vertinimas — kaip skaičiuojama, žr. metodikoje.
            </p>
          <div className="space-y-2">
            {riskyMps.map((mp) => (
              <button
                key={mp.id}
                type="button"
                onClick={() => navigate(`/dashboard/mps/${mp.id}`)}
                className="w-full text-left rounded-md border border-border p-3 hover:bg-muted/30 transition-colors"
              >
                <div className="text-sm font-semibold">{mp.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                    Dalyvavimas: {formatAttendance(mp.attendance, 1)} · {mp.party || 'Nežinoma frakcija'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* A „Skaidrumo indeksas" panel stood here ranking named members by
            `100 - attendance` — a composite invented locally, under a label
            that described something else entirely, presented as an index. The
            low-attendance figures it was built from are already on this page,
            in the low-attendance list, stated as a criterion rather than a
              judgement. */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Radio className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Balsavimų srautas</h2>
          </div>
          <div className="space-y-2">
            {votes.map((vote) => (
              <button
                key={vote.id}
                onClick={() => navigate(`/dashboard/votes/${vote.id}`)}
                className="w-full text-left rounded-md border border-border p-3 hover:bg-muted/30"
              >
                <div className="text-sm font-medium line-clamp-2">{vote.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{vote.date}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* „Stebėsenos suvestinė" and „Top 10 stebėsena" stood here: heroes and
            a watchlist, ranked by a composite verdict over named people. They
            are retired, not restyled — see the corrections log. What replaces
            them is evidence: what the Seimas verifiably did, and what the
            platform has been told it got wrong. */}
        <VerifiedVotesPanel votes={votes} />

        <CorrectionsAndRepliesPanel />
      </section>

        {/* A „Gėdos siena" — wall of shame — stood here: the fifteen
            lowest-attendance members, ranked #1 to #15 by name, each with a
            euro figure for the salary they had supposedly not earned. It was
            regenerated and committed daily.

            It is the plainest thing the accumulated law forbids: a rank, about
            named people, carrying a moral label and a derived accusation. It
            also contradicted the platform's own published methodology, still
            counting attendance the v1 way (a vote that day) after v2 took
            effect on 2026-08-26 — so it showed 42.6% for a member the panel
            above showed at 44%.

            Attendance is already published per member, with its denominator,
            its coverage note and a methodology drawer. That is the evidence.
            The ranking was the verdict. See docs/corrections. */}

      {/* Agreement with the member's own faction */}
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="w-4 h-4 text-sky-400" />
          <h2 className="text-base font-semibold text-foreground">
            Sutapimas su frakcija
          </h2>
          <span className="ml-auto text-xs text-muted-foreground">Kaip dažnai sutapo</span>
        </div>

          {/* LT-COPY: needs native review */}
          <p className="text-xs text-muted-foreground mb-3 max-w-prose">
            Kiek kartų nario pasirinkimas sutapo su daugumos jo frakcijos pasirinkimu.
            Tai nėra ištikimybės ar principingumo matas: mažesnis skaičius nereiškia
            nei blogiau, nei geriau — tik tai, kad narys dažniau balsavo kitaip nei
            jo frakcija. Priežasčių mes nežinome.
          </p>

        {(loyalty?.alignment?.length ?? 0) > 0 ? (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {/* Alphabetical, never by the metric: the order of a list is
                itself a claim, and this list used to be ordered worst-first.
                No colour grading either — red/amber/green on a person is a
                verdict wearing a palette. Each row carries its own counts.
                The chamber distribution and per-vote drill-in replace this
                interim rendering. */}
            {loyalty!.alignment.map((mp) => (
              <button
                key={mp.mp_id}
                type="button"
                onClick={() => goToMpForensicFlag(mp.mp_id, 'loyalty')}
                className="w-full text-left rounded-md border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-sm font-semibold">{mp.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{mp.party}</span>
                  </div>
                  <span className="text-sm font-mono text-foreground shrink-0">
                    {/* An em dash, not the generic „source data not loaded" string: the
                        reason sits on the line below and stating two different causes
                        for the same absence is worse than stating none. */}
                    {mp.alignment_pct === null ? "—" : `${mp.alignment_pct}%`}
                  </span>
                  </div>
                  {/* LT-COPY: needs native review */}
                  {/* The reason travels with the row. A generic „source data not
                      loaded" was shown for members whose data is entirely present and
                      whose faction is simply too small to have a position — the right
                      answer to the wrong question. And 0 of 0 is not a count. */}
                  <div className="text-xs text-muted-foreground mt-1">
                    {mp.comparable_votes > 0 ? (
                      <>
                        {mp.aligned_votes} iš {mp.comparable_votes} balsavimų, kuriuose
                        frakcijos pozicija nustatyta
                      </>
                    ) : mp.suppression_reason === 'faction_too_small' ? (
                      <>Frakcija per maža, kad būtų galima nustatyti jos poziciją.</>
                    ) : mp.suppression_reason === 'no_faction' ? (
                      <>Narys nepriklauso frakcijai.</>
                    ) : (
                      <>Palyginamų balsavimų nepakanka.</>
                    )}
                  </div>
              </button>
            ))}
          </div>
        ) : (
          /* LT-COPY: needs native review */
          <p className="text-sm text-muted-foreground">
            Duomenų dar nėra. Balsavimų duomenys surinkti, tačiau frakcijos
            pozicijos skaičiavimas dar neįjungtas — įjungsime tada, kai
            puslapis rodys ne tik suvestinį skaičių, bet ir konkrečius
            balsavimus, iš kurių jis susideda.
          </p>
        )}
      </section>

      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
