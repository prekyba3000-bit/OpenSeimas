import React from 'react';
import { useNavigate, NavLink } from 'react-router';
import {
  AlertTriangle,
  Database,
  Radio,
  Search,
  ShieldAlert,
  Clock,
  BarChart3,
  GitBranch,
  Network,
  TrendingUp,
  FileText,
  Scale,
  Trophy,
  BookOpen,
} from 'lucide-react';
import { CitationCopyButton } from '../components/CitationCopyButton';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, LineChart, Line, Legend,
} from 'recharts';
import {
  api, DashboardStats, HeroesVillainsResponse, MpSummary, VoteSummary,
  ChronoResponse, BenfordResponse, LoyaltyResponse, PhantomResponse, VoteGeoResponse,
} from '../services/api';

type SourceStatus = {
  name: string;
  detail: string;
  state: 'active' | 'partial';
};

const SOURCES: SourceStatus[] = [
  { name: 'data.gov.lt API', detail: 'Viešieji rinkiniai ir registrai', state: 'active' },
  { name: 'Seimas XML API', detail: 'Balsavimai, posėdžiai, pataisos', state: 'active' },
  { name: 'VMI + VRK', detail: 'Deklaracijos ir finansiniai duomenys', state: 'active' },
  { name: 'Registrų Centras', detail: 'Įmonių ir ryšių duomenys', state: 'active' },
  { name: 'Rekvizitai', detail: 'Papildomas kontekstas (dalinis)', state: 'partial' },
  { name: 'OpenSanctions / ICIJ', detail: 'Tarptautiniai ryšiai ir PEP', state: 'active' },
];

const BENFORD_EXPECTED: Record<string, number> = {
  '1': 0.30103, '2': 0.17609, '3': 0.12494, '4': 0.09691,
  '5': 0.07918, '6': 0.06695, '7': 0.05799, '8': 0.05115, '9': 0.04576,
};

export default function SkaidrumasHubView() {
  const navigate = useNavigate();
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [mps, setMps] = React.useState<MpSummary[]>([]);
  const [votes, setVotes] = React.useState<VoteSummary[]>([]);
  const [accountability, setAccountability] = React.useState<HeroesVillainsResponse | null>(null);
  const [chrono, setChrono] = React.useState<ChronoResponse | null>(null);
  const [benford, setBenford] = React.useState<BenfordResponse | null>(null);
  const [loyalty, setLoyalty] = React.useState<LoyaltyResponse | null>(null);
  const [phantom, setPhantom] = React.useState<PhantomResponse | null>(null);
  const [voteGeo, setVoteGeo] = React.useState<VoteGeoResponse | null>(null);
  const [query, setQuery] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.all([
      api.getStats(),
      api.getMps(),
      api.getVotes(8, 0),
      api.getHeroesVillains(10),
      api.getChronoForensics(30).catch(() => ({ items: [], clusters: [] }) as ChronoResponse),
      api.getBenfordResults(20).catch(() => ({ items: [] }) as BenfordResponse),
      api.getLoyaltyGraph().catch(() => ({ alignment: [], total_mps: 0 }) as LoyaltyResponse),
      api.getPhantomNetwork(20).catch(() => ({ items: [] }) as PhantomResponse),
      api.getVoteGeometry(15).catch(() => ({ items: [], total_analyzed: 0 }) as VoteGeoResponse),
    ])
      .then(([s, m, v, hv, ch, bf, ly, ph, vg]) => {
        setStats(s);
        setMps(m);
        setVotes(v);
        setAccountability(hv);
        setChrono(ch);
        setBenford(bf);
        setLoyalty(ly);
        setPhantom(ph);
        setVoteGeo(vg);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredMps = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return mps
      .filter((mp) => mp.name.toLowerCase().includes(q) || (mp.party || '').toLowerCase().includes(q))
      .slice(0, 6);
  }, [mps, query]);

  const riskyMps = React.useMemo(
    () => [...mps].sort((a, b) => (a.attendance ?? 0) - (b.attendance ?? 0)).slice(0, 6),
    [mps],
  );

  const tickerItems = React.useMemo(() => {
    const lowAttendanceCount = mps.filter((m) => (m.attendance ?? 0) < 60).length;
    const newestVote = votes[0]?.title ?? 'Nėra naujausių įrašų';
    return [
      `Seimo nariai: ${stats?.total_mps ?? '—'}`,
      `Balsavimai: ${stats?.historical_votes ?? '—'}`,
      `Žemas lankomumas (<60%): ${lowAttendanceCount}`,
      `Naujausias balsavimas: ${newestVote}`,
    ];
  }, [stats, mps, votes]);

  if (loading) {
    return <div className="py-16 text-center text-muted-foreground">Kraunama „Skaidrumas Hub“...</div>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-primary mb-4">OpenSeimas · skaidrumo centras</p>
        <h1 className="text-4xl md:text-5xl font-black leading-tight">
          Neįmanoma būti <span className="text-primary">suktam</span>.
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Viešoji atskaitomybės platforma: balsavimai, dalyvavimas, deklaracijos ir ryšiai vienoje vietoje.
        </p>
        <p className="mt-2 text-xs text-muted-foreground max-w-2xl">
          Tai ne LR Seimo oficiali svetainė — nepriklausomas civic tech projektas; šaltiniai ir metodika nurodyti atskiruose puslapiuose.
        </p>
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
                <div className="text-xs text-muted-foreground">{mp.party || 'Nežinoma'} · {mp.attendance}% lankomumas</div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-2 items-center">
          <span className="text-xs uppercase tracking-wider text-muted-foreground w-full sm:w-auto sm:mr-2">Greiti žingsniai</span>
          <NavLink
            to="/dashboard/votes"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted/50"
          >
            <FileText className="w-4 h-4" />
            Balsavimai
          </NavLink>
          <NavLink
            to="/dashboard/compare"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted/50"
          >
            <Scale className="w-4 h-4" />
            Palyginimas
          </NavLink>
          <NavLink
            to="/dashboard/leaderboard"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted/50"
          >
            <Trophy className="w-4 h-4" />
            Stebėsena / rizika
          </NavLink>
          <NavLink
            to="/dashboard/methodology"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted/50"
          >
            <BookOpen className="w-4 h-4" />
            Metodika
          </NavLink>
          <CitationCopyButton className="border-border" />
        </div>
      </section>

      <section className="rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-2 text-xs uppercase tracking-[0.15em] text-primary border-b border-border bg-primary/5">
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
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Įspėjimai</h2>
          </div>
          <div className="space-y-2">
            {riskyMps.slice(0, 5).map((mp) => (
              <button
                key={mp.id}
                type="button"
                onClick={() => navigate(`/dashboard/mps/${mp.id}`)}
                className="w-full text-left rounded-md border border-border p-3 hover:bg-muted/30 transition-colors"
              >
                <div className="text-sm font-semibold">{mp.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Žemas lankomumas: {mp.attendance}% · {mp.party || 'Nežinoma frakcija'}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Skaidrumo indeksas</h2>
          </div>
          <div className="space-y-2">
            {riskyMps.map((mp) => {
              const risk = Math.round(100 - (mp.attendance ?? 0));
              return (
                <div key={mp.id} className="flex items-center justify-between border-b border-border/60 py-2">
                  <div>
                    <div className="text-sm font-medium">{mp.name}</div>
                    <div className="text-xs text-muted-foreground">{mp.party || 'Nežinoma'}</div>
                  </div>
                  <span className="text-sm font-mono text-primary">{risk}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Radio className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Balsavimų srautas</h2>
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
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Top 10 herojai</h2>
            </div>
            <span className="text-xs text-muted-foreground">7 d.</span>
          </div>
          <div className="space-y-2">
            {(accountability?.heroes ?? []).map((item) => (
              <button
                key={`hero-${item.id}`}
                onClick={() => navigate(`/dashboard/mps/${item.id}`)}
                className="w-full text-left rounded-md border border-border p-3 hover:bg-muted/30"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">#{item.rank} {item.name}</div>
                  <div className="text-xs text-emerald-400 font-mono">{item.integrity_score}</div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{item.party || 'Nežinoma'} · {item.attendance}% lankomumas</div>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {item.hero_evidence.slice(0, 3).map((evidence) => (
                    <li key={`${item.id}-${evidence}`}>• {evidence}</li>
                  ))}
                </ul>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Top 10 stebėsena</h2>
            </div>
            <span className="text-xs text-muted-foreground">7 d.</span>
          </div>
          <div className="space-y-2">
            {(accountability?.watchlist ?? []).map((item) => (
              <button
                key={`watch-${item.id}`}
                onClick={() => navigate(`/dashboard/mps/${item.id}`)}
                className="w-full text-left rounded-md border border-border p-3 hover:bg-muted/30"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">#{item.rank} {item.name}</div>
                  <div className="text-xs text-rose-400 font-mono">{item.risk_score}</div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{item.party || 'Nežinoma'} · {item.attendance}% lankomumas</div>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {item.watch_evidence.slice(0, 3).map((evidence) => (
                    <li key={`${item.id}-${evidence}`}>• {evidence}</li>
                  ))}
                </ul>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── FORENSIC ENGINES ─────────────────────────────────────────── */}

      <section className="rounded-xl border border-primary/30 bg-card p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-primary mb-2">Forensic Engines</p>
        <h2 className="text-2xl font-black">Penki varikliai. Nulinis fluffas.</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
          Kiekvienas variklis atakuoja specifinį korupcijos vektorių — nuo laikinio pirštų antspaudų iki statistinės balsavimų geometrijos.
        </p>
      </section>

      {/* Engine 01: Chrono-Forensics */}
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            01 · Pakeitimų greitis
          </h2>
          <span className="ml-auto text-xs text-muted-foreground">Chrono-Forensics</span>
        </div>

        {(chrono?.items?.length ?? 0) > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="drafting_window_min" name="Laikas (min)"
                    label={{ value: 'Laikas (min)', position: 'insideBottom', offset: -10, fontSize: 11 }}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis
                    dataKey="complexity" name="Sudėtingumas"
                    label={{ value: 'Sudėtingumas', angle: -90, position: 'insideLeft', fontSize: 11 }}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip
                    content={({ payload }) => {
                      if (!payload?.[0]) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded border border-border bg-popover p-2 text-xs shadow">
                          <div className="font-semibold">{d.amendment_id}</div>
                          <div>Laikas: {d.drafting_window_min} min</div>
                          <div>Sudėtingumas: {d.complexity?.toFixed(1)}</div>
                          <div>Z-score: {d.zscore?.toFixed(2)}</div>
                          {d.cluster_id && <div className="text-amber-400">Klasteris #{d.cluster_id}</div>}
                        </div>
                      );
                    }}
                  />
                  <Scatter
                    data={chrono!.items.filter((i) => i.drafting_window_min != null)}
                    fill="var(--color-primary)"
                  >
                    {chrono!.items.filter((i) => i.drafting_window_min != null).map((item, idx) => (
                      <Cell
                        key={idx}
                        fill={
                          item.zscore !== null && item.zscore < -2
                            ? '#ef4444'
                            : item.cluster_id
                              ? '#f59e0b'
                              : 'var(--color-primary)'
                        }
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {chrono!.items
                .filter((i) => i.zscore !== null && i.zscore < -2)
                .slice(0, 10)
                .map((item) => (
                  <div key={item.amendment_id} className="rounded-md border border-rose-500/30 bg-rose-500/5 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono font-semibold">{item.amendment_id}</span>
                      <span className="text-xs font-mono text-rose-400">z = {item.zscore?.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {item.drafting_window_min} min · {item.word_count} žodžiai · {item.citation_count} citatos
                      {item.cluster_id && <span className="text-amber-400 ml-2">Klasteris #{item.cluster_id}</span>}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Duomenų dar nėra — pakeitimų analizė bus paleista po duomenų surinkimo.</p>
        )}
      </section>

      {/* Engine 02: Benford's Lens */}
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-violet-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            02 · Deklaracijų patikimumas
          </h2>
          <span className="ml-auto text-xs text-muted-foreground">Benford's Lens</span>
        </div>

        {(benford?.items?.length ?? 0) > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={Object.entries(BENFORD_EXPECTED).map(([digit, expected]) => {
                    const worst = benford!.items.find((i) => i.conformity === 'non-conforming');
                    const actual = worst?.digit_distribution?.[digit] ?? expected;
                    return {
                      digit: `D${digit}`,
                      expected: +(expected * 100).toFixed(1),
                      actual: +(actual * 100).toFixed(1),
                      deviation: +((actual - expected) * 100).toFixed(1),
                    };
                  })}
                  margin={{ top: 10, right: 10, bottom: 20, left: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="digit" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} unit="%" />
                  <Tooltip
                    content={({ payload }) => {
                      if (!payload?.[0]) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded border border-border bg-popover p-2 text-xs shadow">
                          <div className="font-semibold">{d.digit}</div>
                          <div>Tikėtina: {d.expected}%</div>
                          <div>Faktinė: {d.actual}%</div>
                          <div className={d.deviation > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                            Δ {d.deviation > 0 ? '+' : ''}{d.deviation}%
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="expected" fill="var(--color-primary)" opacity={0.3} name="Tikėtina (Benford)" />
                  <Bar dataKey="actual" name="Faktinė">
                    {Object.entries(BENFORD_EXPECTED).map(([digit, expected]) => {
                      const worst = benford!.items.find((i) => i.conformity === 'non-conforming');
                      const actual = worst?.digit_distribution?.[digit] ?? expected;
                      const diff = Math.abs(actual - expected);
                      return <Cell key={digit} fill={diff > 0.05 ? '#ef4444' : diff > 0.02 ? '#f59e0b' : '#22c55e'} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {benford!.items.slice(0, 10).map((item) => (
                <div
                  key={item.mp_id}
                  className={`rounded-md border p-3 ${
                    item.conformity === 'non-conforming'
                      ? 'border-rose-500/30 bg-rose-500/5'
                      : item.conformity === 'marginal'
                        ? 'border-amber-500/30 bg-amber-500/5'
                        : 'border-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{item.mp_id}</span>
                    <span className={`text-xs font-mono ${
                      item.conformity === 'non-conforming' ? 'text-rose-400'
                        : item.conformity === 'marginal' ? 'text-amber-400'
                          : 'text-emerald-400'
                    }`}>
                      {item.conformity} · p={item.p_value.toFixed(4)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    MAD: {item.mad.toFixed(4)} · χ²: {item.chi_squared.toFixed(2)} · Imtis: {item.sample_size}
                  </div>
                  {item.flagged_fields.length > 0 && (
                    <div className="text-xs text-rose-400 mt-1">
                      Pažymėti: {item.flagged_fields.map((f) => f.field).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Duomenų dar nėra — Benfordo analizė reikalauja turto deklaracijų duomenų.</p>
        )}
      </section>

      {/* Engine 03: Loyalty Graph */}
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            03 · Frakcijos lojalumas
          </h2>
          <span className="ml-auto text-xs text-muted-foreground">Loyalty Graph</span>
        </div>

        {(loyalty?.alignment?.length ?? 0) > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                  <Tooltip
                    content={({ payload }) => {
                      if (!payload?.[0]) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded border border-border bg-popover p-2 text-xs shadow">
                          <div>{d.date}</div>
                          <div>Sutapimas: {d.alignment?.toFixed(1)}%</div>
                        </div>
                      );
                    }}
                  />
                  {loyalty!.alignment.slice(0, 5).map((mp, idx) => (
                    <Line
                      key={mp.mp_id}
                      data={mp.trend}
                      dataKey="alignment"
                      name={mp.name}
                      stroke={['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#22c55e'][idx % 5]}
                      dot={false}
                      strokeWidth={2}
                    />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {loyalty!.alignment.slice(0, 15).map((mp) => (
                <div key={mp.mp_id} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold">{mp.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{mp.party}</span>
                    </div>
                    <span className={`text-sm font-mono ${
                      mp.avg_alignment_30d < 70 ? 'text-rose-400'
                        : mp.avg_alignment_30d < 85 ? 'text-amber-400'
                          : 'text-emerald-400'
                    }`}>
                      {mp.avg_alignment_30d}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Duomenų dar nėra — lojalumo analizė bus paleista po balsavimų duomenų surinkimo.</p>
        )}
      </section>

      {/* Engine 04: Phantom Network */}
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Network className="w-4 h-4 text-orange-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            04 · Paslėpti ryšiai
          </h2>
          <span className="ml-auto text-xs text-muted-foreground">Phantom Network</span>
        </div>

        {(phantom?.items?.length ?? 0) > 0 ? (
          <div className="space-y-3">
            {phantom!.items.slice(0, 10).map((link, idx) => (
              <div
                key={idx}
                className={`rounded-md border p-4 ${
                  link.procurement_hit
                    ? 'border-rose-500/40 bg-rose-500/5'
                    : link.debtor_hit
                      ? 'border-amber-500/40 bg-amber-500/5'
                      : 'border-border'
                }`}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  {link.path.map((node, nodeIdx) => (
                    <React.Fragment key={nodeIdx}>
                      {nodeIdx > 0 && <span className="text-muted-foreground text-xs">→</span>}
                      <span className={`text-xs px-2 py-1 rounded ${
                        nodeIdx === 0
                          ? 'bg-primary/20 text-primary font-semibold'
                          : nodeIdx === link.path.length - 1
                            ? link.procurement_hit
                              ? 'bg-rose-500/20 text-rose-400 font-semibold'
                              : 'bg-amber-500/20 text-amber-400 font-semibold'
                            : 'bg-muted text-muted-foreground'
                      }`}>
                        {node}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>{link.hops} žingsniai</span>
                  <span>{link.target_name}</span>
                  {link.procurement_hit && <span className="text-rose-400 font-semibold">Viešasis pirkimas</span>}
                  {link.debtor_hit && <span className="text-amber-400 font-semibold">Mokesčių skolininkas</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Duomenų dar nėra — verslo ryšių grafo analizė reikalauja Registrų Centro duomenų.</p>
        )}
      </section>

      {/* Engine 05: Vote Geometry */}
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-fuchsia-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            05 · Statistinės anomalijos
          </h2>
          <span className="ml-auto text-xs text-muted-foreground">Vote Geometry</span>
        </div>

        {(voteGeo?.items?.length ?? 0) > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={voteGeo!.items.slice(0, 8).map((v) => ({
                    label: (v.title ?? '').slice(0, 30) + '...',
                    'Tikėtina Už': v.expected.for,
                    'Faktinė Už': v.actual.for,
                    sigma: v.sigma,
                  }))}
                  margin={{ top: 10, right: 10, bottom: 20, left: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 8 }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    content={({ payload }) => {
                      if (!payload?.[0]) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded border border-border bg-popover p-2 text-xs shadow max-w-xs">
                          <div className="font-semibold">{d.label}</div>
                          <div>Tikėtina: {d['Tikėtina Už']?.toFixed(0)} Už</div>
                          <div>Faktinė: {d['Faktinė Už']} Už</div>
                          <div className="text-rose-400">{d.sigma?.toFixed(1)}σ nuokrypis</div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="Tikėtina Už" fill="var(--color-primary)" opacity={0.3} />
                  <Bar dataKey="Faktinė Už" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {voteGeo!.items.slice(0, 10).map((item) => (
                <div key={item.vote_id} className="rounded-md border border-rose-500/30 bg-rose-500/5 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold line-clamp-1">{item.title ?? `#${item.vote_id}`}</span>
                    <span className="text-xs font-mono text-rose-400 shrink-0 ml-2">{item.sigma.toFixed(1)}σ</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {item.date} · {item.anomaly_type?.replace('_', ' ')}
                  </div>
                  <div className="text-xs mt-1">
                    <span className="text-muted-foreground">Tikėtina:</span>{' '}
                    <span className="text-emerald-400">{item.expected.for.toFixed(0)} Už</span>{' / '}
                    <span className="text-rose-400">{item.expected.against.toFixed(0)} Prieš</span>
                    <span className="text-muted-foreground ml-3">Faktinė:</span>{' '}
                    <span className="text-emerald-400">{item.actual.for} Už</span>{' / '}
                    <span className="text-rose-400">{item.actual.against} Prieš</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Duomenų dar nėra — balsavimų geometrija bus apskaičiuota po balsavimų duomenų surinkimo.</p>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Duomenų šaltiniai</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {SOURCES.map((source) => (
            <div key={source.name} className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{source.name}</span>
                <span className={source.state === 'active' ? 'text-emerald-400 text-xs' : 'text-amber-400 text-xs'}>
                  {source.state === 'active' ? 'aktyvus' : 'dalinis'}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{source.detail}</div>
            </div>
          ))}
        </div>
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
