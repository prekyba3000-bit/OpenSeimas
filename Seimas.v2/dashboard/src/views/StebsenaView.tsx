/**
 * Stebėsena (monitoring register). Civic leaderboard table.
 * WS4: faction column; risk-tier summary toggles are not implemented here — orthogonal when added.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy, ArrowUpDown, HelpCircle } from 'lucide-react';
import { useNavigate, NavLink } from 'react-router';
import { api, MONITORING_API_URL, type MpLeaderboardRow } from '../services/api';
import { API_URL } from '../config';
import {
  CIVIC_DIMENSION_LABELS_LT,
  CIVIC_DIMENSION_ORDER,
  readMpDimension,
  DIMENSION_UNAVAILABLE_LT,
  type MpCivicDimension,
} from '../utils/mpLegacyDimensions';
import { toastErrorDeduped } from '../utils/toastDeduped';
import { Card } from '../components/Card';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { ProblemDetailsNotice } from '../components/ProblemDetailsNotice';
import { LT } from '../i18n/lt';
import { ltPlural } from '../utils/ltPlural';

type SortKey = 'rank' | 'name' | 'faction' | MpCivicDimension;
type SortDirection = 'asc' | 'desc';

type MpRow = MpLeaderboardRow;

const DEFAULT_PHOTO =
  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%231f2937" width="100" height="100"/><text x="50" y="58" text-anchor="middle" fill="%239ca3af" font-size="34">MP</text></svg>';


/**
 * A metric value, or an honest blank.
 *
 * These three call sites read `(readMpDimension(row, dim) ?? 0).toFixed(1)`,
 * which printed „0.0“ for a member whose metric has no source data — the same
 * disease as the „DEFERRED“ badge and the hardcoded status panel: a display
 * asserting something it did not know. A column is only shown when at least
 * one member has data for it, but within a shown column an individual member
 * can still be missing, and 0.0 in a ranked table reads as "worst", not as
 * "unknown".
 */
function DimensionValue({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <span className="text-muted-foreground" title={DIMENSION_UNAVAILABLE_LT}>
        —
      </span>
    );
  }
  return <>{value.toFixed(1)}</>;
}

export default function StebsenaView() {
  const navigate = useNavigate();
  const {
    data: rowsRaw,
    isPending: loading,
    isFetching,
    isError: loadError,
    error: requestError,
  } = useQuery({
    queryKey: ['monitoring', 'leaderboard'],
    queryFn: () => api.getMpLeaderboard(),
  });
  const rows = useMemo(() => (Array.isArray(rowsRaw) ? rowsRaw : []) as MpRow[], [rowsRaw]);
  const [slowNetwork, setSlowNetwork] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const getIntDotClass = (adjustment: number) => {
    // A four-step severity ramp, not a traffic light: clean → attention →
    // clay. Nothing here is a pass/fail verdict on a person.
    if (adjustment === 0) return 'bg-vote-for';
    if (adjustment >= -20) return 'bg-attention/60';
    if (adjustment >= -40) return 'bg-attention';
    return 'bg-destructive';
  };

  const getIntegrityTooltip = (row: MpRow) => {
    const adjustment = row.forensicBreakdown?.totalForensicAdjustment ?? 0;
    if (adjustment >= 0) {
      return 'Forensinių baudų netaikoma (arba duomenų nepakanka baudai).';
    }

    const engines: Array<{ label: string; penalty?: number }> = [
      { label: 'Benford', penalty: row.forensicBreakdown?.benford?.penalty },
      { label: 'Chrono', penalty: row.forensicBreakdown?.chrono?.penalty },
      { label: 'Balsavimo geometrija', penalty: row.forensicBreakdown?.voteGeometry?.penalty },
      { label: 'Phantom', penalty: row.forensicBreakdown?.phantomNetwork?.penalty },
    ];
    const topEngine = [...engines].sort((a, b) => (a.penalty ?? 0) - (b.penalty ?? 0))[0];
    const reason = topEngine?.penalty && topEngine.penalty < 0 ? topEngine.label : 'forensinių signalų suma';
    return `Vientisumas sumažintas maždaug ${Math.abs(adjustment)} tšk. dėl: ${reason}.`;
  };

  useEffect(() => {
    if (!isFetching) {
      setSlowNetwork(false);
      return;
    }
    const slowTimer = window.setTimeout(() => setSlowNetwork(true), 1200);
    return () => window.clearTimeout(slowTimer);
  }, [isFetching]);

  useEffect(() => {
    if (loadError && requestError) {
      toastErrorDeduped('monitoring:leaderboard', LT.errors.leaderboardLoad);
    }
  }, [loadError, requestError]);

  // Only rank on metrics something actually backs — a column of identical 0.0s
  // (or a baseline 100.0) invites conclusions the data cannot support.
  const visibleDimensions = useMemo(
    () =>
      CIVIC_DIMENSION_ORDER.filter((dim) =>
        rows.some((row) => readMpDimension(row, dim) !== null),
      ),
    [rows],
  );

  const hiddenDimensions = useMemo(
    () => CIVIC_DIMENSION_ORDER.filter((dim) => !visibleDimensions.includes(dim)),
    [visibleDimensions],
  );

  /**
   * Sorting by a dimension ranks only the members who have one.
   *
   * „Sort last as negative infinity" still put them in the ranking, at the
   * bottom, which reads as worst — the same lie as a 0.0 cell, one layer up.
   * They are lifted out into their own labelled group instead, so the ordering
   * makes no claim about them at all.
   */
  const { sorted, unranked } = useMemo(() => {
    const ranked = rows.map((row, i) => ({ ...row, rank: i + 1 }));
    const isDimension = sortKey !== 'rank' && sortKey !== 'name' && sortKey !== 'faction';

    const comparable = isDimension
      ? ranked.filter((row) => readMpDimension(row, sortKey) !== null)
      : ranked;
    const withoutData = isDimension
      ? ranked.filter((row) => readMpDimension(row, sortKey) === null)
      : [];

    const getValue = (row: MpRow & { rank: number }, key: SortKey) => {
      if (key === 'rank') return row.rank;
      if (key === 'name') return row.mp.name || '';
      if (key === 'faction') return row.faction ?? '';
      return readMpDimension(row, key) as number;
    };

    const ordered = [...comparable].sort((a, b) => {
      const av = getValue(a, sortKey);
      const bv = getValue(b, sortKey);
      if (typeof av === 'string' && typeof bv === 'string') {
        const cmp = av.localeCompare(bv);
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      const cmp = Number(av) - Number(bv);
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    // Alphabetical inside the group: any other order would imply a ranking of
    // people the platform has just said it cannot rank.
    withoutData.sort((a, b) => (a.mp.name || '').localeCompare(b.mp.name || ''));

    return { sorted: ordered, unranked: withoutData };
  }, [rows, sortKey, sortDirection]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDirection(key === 'name' || key === 'faction' || key === 'rank' ? 'asc' : 'desc');
  };

  const SortHeader = ({ label, keyName }: { label: string; keyName: SortKey }) => (
    <button
      type="button"
      className="inline-flex min-h-11 items-center gap-1 py-2 text-sm text-muted-foreground hover:text-foreground"
      onClick={() => toggleSort(keyName)}
    >
      {label}
      <ArrowUpDown className="w-3 h-3" />
    </button>
  );

  /** Sort keys offered on the phone layout, where there are no column headers to tap. */
  const sortOptions: Array<{ key: SortKey; label: string }> = [
    { key: 'name', label: 'Seimo narys' },
    { key: 'faction', label: 'Frakcija' },
    ...visibleDimensions.map((dim) => ({ key: dim as SortKey, label: CIVIC_DIMENSION_LABELS_LT[dim] })),
  ];

  const loadSourceLabel = `${API_URL}/api${MONITORING_API_URL}`;

  if (loading) {
    return (
      <Card className="p-12 text-center text-foreground flex flex-col items-center justify-center min-h-[300px] bg-card border-border rounded-xl">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mb-4" />
        Kraunamas sąrašas iš {loadSourceLabel}…
        {slowNetwork && <p className="mt-3 text-xs text-foreground/70">Tinklas lėtas, bandoma dar kartą.</p>}
      </Card>
    );
  }

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex items-center gap-3">
        <Trophy className="w-7 h-7 text-primary" />
        <div>
          <h2 className="text-3xl font-bold text-foreground">Pasisakymai ir balsavimai</h2>
          <p className="text-sm text-foreground/70">
            Lentelė pagal viešus stebėsenos rodiklius. Rodomi tik tie rodikliai, kuriuos šiandien remia įkelti
            duomenys (žr.{' '}
            <NavLink to="/dashboard/methodology" className="text-primary underline">
              metodiką
            </NavLink>
            ).
          </p>
        </div>
      </div>

      <Card className="p-4 md:p-6 bg-muted border-border rounded-xl space-y-3">
        <p className="text-sm text-foreground/90 leading-relaxed">
            {/* LT-COPY: needs native review */}
            Tai <strong className="text-foreground">ne</strong> reitingas. Nariai išdėstyti abėcėlės tvarka, o
            stulpeliai yra atskiri rodikliai — jie nesudedami ir tarpusavyje nepalyginami. Tuščios eilutės
            reiškia trūkstamus duomenis — žr. būseną žemiau.
        </p>
        {hiddenDimensions.length > 0 && (
          <p className="text-xs text-foreground/70 leading-relaxed">
            Kol kas nerodoma:{' '}
            <span className="text-foreground">
              {hiddenDimensions.map((dim) => CIVIC_DIMENSION_LABELS_LT[dim]).join(', ')}
            </span>
            . Šių rodiklių šaltinio duomenys dar neįkelti, todėl jų reikšmės būtų klaidinančios.
          </p>
        )}
        {loadError && (
          <ProblemDetailsNotice error={requestError} className="text-sm border border-attention/40 rounded-lg px-3 py-2 bg-attention/10 text-foreground" />
        )}
      </Card>

      {!loadError && sorted.length === 0 && (
        <Card className="p-8 text-center bg-card border-border rounded-xl">
          <p className="text-foreground mb-2">Sąrašas tuščias</p>
          <p className="text-sm text-foreground/70 max-w-lg mx-auto">
            API grąžino tuščią masyvą. Galimos priežastys: dar nesinchronizuoti įrašai, kita aplinka arba išjungtas
            endpoint.
          </p>
          <NavLink to="/dashboard/methodology" className="inline-block mt-4 text-sm text-primary underline">
            Metodika ir apribojimai
          </NavLink>
        </Card>
      )}

      {sorted.length > 0 && (
        <>
          {/* TODO(v4): add faction filter chip once faction data is reliable */}

          {/* Phone layout. The table below needs ~900px to stay readable, which
              on a 360px screen is a sideways scroll across the one screen most
              citizens open. Same rows, same rule about which metrics exist. */}
          <div className="space-y-3 md:hidden">
            <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="stebesena-sort">
                Rikiuoti pagal
              </label>
              <select
                id="stebesena-sort"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="min-h-11 flex-1 rounded-lg border border-border bg-card px-3 text-sm text-foreground"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    Rikiuoti: {opt.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
                className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg border border-border bg-card px-3 text-sm text-foreground"
                aria-label={sortDirection === 'asc' ? 'Rikiuoti mažėjančiai' : 'Rikiuoti didėjančiai'}
              >
                <ArrowUpDown className="h-4 w-4" />
                {sortDirection === 'asc' ? 'A→Z' : 'Z→A'}
              </button>
            </div>

            <ul className="space-y-3">
              {sorted.map((row) => (
                <li key={row.mp.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/dashboard/mps/${row.mp.id}`)}
                    className="w-full rounded-xl border border-border bg-card p-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={row.mp.photo || DEFAULT_PHOTO}
                        alt=""
                        className="h-10 w-10 rounded-xl object-cover bg-muted ring-1 ring-border"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_PHOTO;
                        }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-foreground">{row.mp.name}</span>
                        <span className="block text-xs text-foreground/70">
                          {row.faction?.trim() || '—'}
                        </span>
                      </span>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-border/40 pt-3">
                      {visibleDimensions.map((dim) => (
                        <div key={dim} className="flex items-baseline justify-between gap-2">
                          <dt className="text-xs text-foreground/70">{CIVIC_DIMENSION_LABELS_LT[dim]}</dt>
                          <dd className="font-mono tabular-nums text-sm text-foreground">
                            <DimensionValue value={readMpDimension(row, dim)} />
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <Card className="hidden overflow-x-auto p-0 bg-muted border-border rounded-xl shadow-card md:block">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-border bg-card">
                  <th className="text-left p-4">
                    <SortHeader label="Seimo narys" keyName="name" />
                  </th>
                  <th className="text-left p-4">
                    <SortHeader label="Frakcija" keyName="faction" />
                  </th>
                  {visibleDimensions.map((dim) => (
                    <th key={dim} className="text-right p-4">
                      <SortHeader label={CIVIC_DIMENSION_LABELS_LT[dim]} keyName={dim} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr
                    key={row.mp.id}
                    className="border-b border-border/40 bg-card hover:bg-border cursor-pointer transition-colors"
                    onClick={() => navigate(`/dashboard/mps/${row.mp.id}`)}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={row.mp.photo || DEFAULT_PHOTO}
                          alt={row.mp.name}
                          className="w-9 h-9 rounded-xl object-cover bg-muted ring-1 ring-border"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = DEFAULT_PHOTO;
                          }}
                        />
                        <span className="font-semibold text-foreground">{row.mp.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-foreground/85">
                      {row.faction?.trim() ? (
                        row.faction.trim()
                      ) : (
                        <span className="text-foreground/45" aria-hidden>
                          —
                        </span>
                      )}
                    </td>
                    {visibleDimensions.map((dim) => (
                      <td key={dim} className="p-4 text-right">
                        <DimensionValue value={readMpDimension(row, dim)} />
                      </td>
                    ))}
                  </tr>
                ))}

                {/* Members the sorted dimension cannot rank. Kept on the page —
                    dropping them would hide a member from the public record —
                    but outside the ordering, which makes no claim about them. */}
                {unranked.length > 0 && (
                  <>
                    <tr>
                      <td
                        colSpan={3 + visibleDimensions.length}
                        className="px-4 pt-6 pb-2 text-sm font-semibold text-foreground border-t border-border"
                      >
                        {/* LT-COPY: needs native review */}
                        Nepakanka duomenų
                        <span className="ml-2 font-normal text-muted-foreground">
                          — {unranked.length}{' '}
                          {ltPlural(unranked.length, 'narys', 'nariai', 'narių')} be šio rodiklio;
                          nerikiuojami
                        </span>
                      </td>
                    </tr>
                    {unranked.map((row) => (
                      <tr key={`unranked-${row.mp.id}`} className="border-t border-border/60">
                        <td className="p-4 text-muted-foreground">—</td>
                        <td className="p-4">{row.mp.name}</td>
                        <td className="p-4 text-foreground/85">{row.faction?.trim() || '—'}</td>
                        {visibleDimensions.map((dim) => (
                          <td key={dim} className="p-4 text-right">
                            <DimensionValue value={readMpDimension(row, dim)} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
