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
  type MpCivicDimension,
} from '../utils/mpLegacyDimensions';
import { toastErrorDeduped } from '../utils/toastDeduped';
import { Card } from '../components/Card';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { ProblemDetailsNotice } from '../components/ProblemDetailsNotice';
import { LT } from '../i18n/lt';

type SortKey = 'rank' | 'name' | 'faction' | MpCivicDimension;
type SortDirection = 'asc' | 'desc';

type MpRow = MpLeaderboardRow;

const DEFAULT_PHOTO =
  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%231f2937" width="100" height="100"/><text x="50" y="58" text-anchor="middle" fill="%239ca3af" font-size="34">MP</text></svg>';

const SKAIDRUMO_HELP_LT =
  'Skaidrumo indeksas atitinka modelio vientisumo balą (0–100), susietą su forensinių variklių korekcijomis (forensic_breakdown.*), kai jos prieinamos. Žalia / geltona / raudona žymė priklauso nuo total_forensic_adjustment.';

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
    if (adjustment === 0) return 'bg-emerald-300';
    if (adjustment >= -20) return 'bg-yellow-300';
    if (adjustment >= -40) return 'bg-orange-300';
    return 'bg-red-300';
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

  const sorted = useMemo(() => {
    const ranked = rows.map((row, i) => ({ ...row, rank: i + 1 }));
    const getValue = (row: MpRow & { rank: number }, key: SortKey) => {
      if (key === 'rank') return row.rank;
      if (key === 'name') return row.mp.name || '';
      if (key === 'faction') return row.faction ?? '';
      return readMpDimension(row, key);
    };

    return [...ranked].sort((a, b) => {
      const av = getValue(a, sortKey);
      const bv = getValue(b, sortKey);
      if (typeof av === 'string' && typeof bv === 'string') {
        const cmp = av.localeCompare(bv);
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      const cmp = Number(av) - Number(bv);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
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
      className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-[#A9B1D6]/70 hover:text-[#A9B1D6]"
      onClick={() => toggleSort(keyName)}
    >
      {label}
      <ArrowUpDown className="w-3 h-3" />
    </button>
  );

  const loadSourceLabel = `${API_URL}/api${MONITORING_API_URL}`;

  if (loading) {
    return (
      <Card className="p-12 text-center text-[#A9B1D6] flex flex-col items-center justify-center min-h-[300px] bg-[#2D2E3A] border-[#4E597B] rounded-2xl">
        <div className="animate-spin w-8 h-8 border-2 border-[#7AA2F7] border-t-transparent rounded-full mb-4" />
        Kraunamas sąrašas iš {loadSourceLabel}…
        {slowNetwork && <p className="mt-3 text-xs text-[#A9B1D6]/70">Tinklas lėtas, bandoma dar kartą.</p>}
      </Card>
    );
  }

  return (
    <div className="space-y-6 text-[#A9B1D6]">
      <div className="flex items-center gap-3">
        <Trophy className="w-7 h-7 text-[#7AA2F7]" />
        <div>
          <h2 className="text-3xl font-bold text-[#A9B1D6]">Stebėsena</h2>
          <p className="text-sm text-[#A9B1D6]/70">
            Lentelė pagal viešus stebėsenos rodiklius; skaidrumo stulpelis rodo modelio vientisumo išvestį (žr.{' '}
            <NavLink to="/dashboard/methodology" className="text-[#7AA2F7] underline">
              metodiką
            </NavLink>
            ).
          </p>
        </div>
      </div>

      <Card className="p-4 md:p-6 bg-[#1A1B26] border-[#4E597B] rounded-2xl space-y-3">
        <p className="text-sm text-[#A9B1D6]/90 leading-relaxed">
          Tai <strong className="text-[#A9B1D6]">ne</strong> oficialus Seimo reitingas. Rodomi laukai ateina iš
          stebėsenos API; <strong className="text-[#A9B1D6]">skaidrumo indeksas</strong> ir kiti stulpeliai — modelio
          išvestys iš duomenų. Tuščios arba klaidingos eilutės reiškia API triktį arba trūkstamus duomenis — žr. būseną
          žemiau.
        </p>
        {loadError && (
          <ProblemDetailsNotice error={requestError} className="text-sm border border-amber-500/30 rounded-lg px-3 py-2 bg-amber-500/5 text-amber-400" />
        )}
      </Card>

      {!loadError && sorted.length === 0 && (
        <Card className="p-8 text-center bg-[#2D2E3A] border-[#4E597B] rounded-2xl">
          <p className="text-[#A9B1D6] mb-2">Sąrašas tuščias</p>
          <p className="text-sm text-[#A9B1D6]/70 max-w-lg mx-auto">
            API grąžino tuščią masyvą. Galimos priežastys: dar nesinchronizuoti įrašai, kita aplinka arba išjungtas
            endpoint.
          </p>
          <NavLink to="/dashboard/methodology" className="inline-block mt-4 text-sm text-[#7AA2F7] underline">
            Metodika ir apribojimai
          </NavLink>
        </Card>
      )}

      {sorted.length > 0 && (
        <>
          {/* TODO(v4): add faction filter chip once faction data is reliable */}
          <Card className="overflow-x-auto p-0 bg-[#1A1B26] border-[#4E597B] rounded-2xl shadow-[0_0_35px_rgba(122,162,247,0.16)]">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-[#4E597B] bg-[#2D2E3A]">
                  <th className="text-left p-4">
                    <SortHeader label="Vieta" keyName="rank" />
                  </th>
                  <th className="text-left p-4">
                    <SortHeader label="Seimo narys" keyName="name" />
                  </th>
                  <th className="text-left p-4">
                    <SortHeader label="Frakcija" keyName="faction" />
                  </th>
                  {CIVIC_DIMENSION_ORDER.map((dim) => (
                    <th key={dim} className="text-right p-4">
                      {dim === 'transparency' ? (
                        <div className="inline-flex items-center justify-end gap-1">
                          <SortHeader label={CIVIC_DIMENSION_LABELS_LT[dim]} keyName={dim} />
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="p-0.5 rounded text-[#7AA2F7] hover:bg-[#4E597B]/50"
                                aria-label="Skaidrumo indekso paaiškinimas"
                              >
                                <HelpCircle className="w-3.5 h-3.5" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 text-xs text-popover-foreground" align="end">
                              <p className="font-semibold mb-1">Skaidrumo indeksas</p>
                              <p className="text-muted-foreground leading-relaxed">{SKAIDRUMO_HELP_LT}</p>
                              <p className="mt-2 text-muted-foreground">
                                API: <code className="text-[10px] bg-muted px-1 rounded">forensic_breakdown</code>
                              </p>
                            </PopoverContent>
                          </Popover>
                        </div>
                      ) : (
                        <SortHeader label={CIVIC_DIMENSION_LABELS_LT[dim]} keyName={dim} />
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr
                    key={row.mp.id}
                    className="border-b border-[#4E597B]/40 bg-[#2D2E3A] hover:bg-[#3B3C4A] cursor-pointer transition-colors"
                    onClick={() => navigate(`/dashboard/mps/${row.mp.id}`)}
                  >
                    <td className="p-4 font-bold text-[#7AA2F7]">#{row.rank}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={row.mp.photo || DEFAULT_PHOTO}
                          alt={row.mp.name}
                          className="w-9 h-9 rounded-xl object-cover bg-[#1A1B26] ring-1 ring-[#4E597B]"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = DEFAULT_PHOTO;
                          }}
                        />
                        <span className="font-semibold text-[#A9B1D6]">{row.mp.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-[#A9B1D6]/85">
                      {row.faction?.trim() ? (
                        row.faction.trim()
                      ) : (
                        <span className="text-[#A9B1D6]/45" aria-hidden>
                          —
                        </span>
                      )}
                    </td>
                    {CIVIC_DIMENSION_ORDER.map((dim) => (
                      <td key={dim} className="p-4 text-right">
                        {dim === 'transparency' ? (
                          <div
                            className="inline-flex items-center justify-end gap-2"
                            title={getIntegrityTooltip(row)}
                          >
                            <span
                              className={`inline-block w-3 h-3 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.25)] ${getIntDotClass(
                                row.forensicBreakdown?.totalForensicAdjustment ?? 0,
                              )}`}
                            />
                            {readMpDimension(row, dim).toFixed(1)}
                          </div>
                        ) : (
                          readMpDimension(row, dim).toFixed(1)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
