import React, { useEffect, useMemo, useState } from 'react';
import { Trophy, ArrowUpDown, HelpCircle } from 'lucide-react';
import { useNavigate, NavLink } from 'react-router';
import { API_URL } from '../config';
import { Card } from '../components/Card';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';

type SortKey = 'rank' | 'name' | 'party' | 'level' | 'xp' | 'STR' | 'WIS' | 'CHA' | 'INT' | 'STA';
type SortDirection = 'asc' | 'desc';

interface HeroRow {
  mp: {
    id: string;
    name: string;
    party?: string;
    photo?: string;
  };
  level: number;
  xp: number;
  attributes: {
    STR: number;
    WIS: number;
    CHA: number;
    INT: number;
    STA: number;
  };
  forensic_breakdown?: {
    benford?: { status?: string; penalty?: number };
    chrono?: { status?: string; penalty?: number };
    vote_geometry?: { status?: string; penalty?: number };
    phantom_network?: { status?: string; penalty?: number };
    total_forensic_adjustment?: number;
    final_integrity_score?: number;
  };
}

const DEFAULT_PHOTO =
  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%231f2937" width="100" height="100"/><text x="50" y="58" text-anchor="middle" fill="%239ca3af" font-size="34">MP</text></svg>';

const INT_HELP_LT =
  'Stulpelis „INT“ atitinka API lauką attributes.INT — vientisumo balą (0–100), susietą su forensinių variklių korekcijomis (forensic_breakdown.*), kai jos prieinamos. Žalia/ geltona / raudona žymė priklauso nuo total_forensic_adjustment.';

const LeaderboardView = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<HeroRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const getIntDotClass = (adjustment: number) => {
    if (adjustment === 0) return 'bg-emerald-300';
    if (adjustment >= -20) return 'bg-yellow-300';
    if (adjustment >= -40) return 'bg-orange-300';
    return 'bg-red-300';
  };

  const getIntegrityTooltip = (row: HeroRow) => {
    const adjustment = row.forensic_breakdown?.total_forensic_adjustment ?? 0;
    if (adjustment >= 0) {
      return 'Forensinių baudų netaikoma (arba duomenų nepakanka baudai).';
    }

    const engines: Array<{ label: string; penalty?: number }> = [
      { label: 'Benford', penalty: row.forensic_breakdown?.benford?.penalty },
      { label: 'Chrono', penalty: row.forensic_breakdown?.chrono?.penalty },
      { label: 'Balsavimo geometrija', penalty: row.forensic_breakdown?.vote_geometry?.penalty },
      { label: 'Phantom', penalty: row.forensic_breakdown?.phantom_network?.penalty },
    ];
    const topEngine = [...engines].sort((a, b) => (a.penalty ?? 0) - (b.penalty ?? 0))[0];
    const reason = topEngine?.penalty && topEngine.penalty < 0 ? topEngine.label : 'forensinių signalų suma';
    return `Vientisumas sumažintas maždaug ${Math.abs(adjustment)} tšk. dėl: ${reason}.`;
  };

  useEffect(() => {
    setLoadError(false);
    fetch(`${API_URL}/api/v2/heroes/leaderboard`)
      .then((res) => {
        if (!res.ok) {
          setLoadError(true);
          return [];
        }
        return res.json();
      })
      .then((data: HeroRow[]) => {
        setRows(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setRows([]);
        setLoadError(true);
        setLoading(false);
      });
  }, []);

  const sorted = useMemo(() => {
    const ranked = rows.map((row, i) => ({ ...row, rank: i + 1 }));
    const getValue = (row: HeroRow & { rank: number }, key: SortKey) => {
      if (key === 'rank') return row.rank;
      if (key === 'name') return row.mp.name || '';
      if (key === 'party') return row.mp.party || '';
      if (key === 'level') return row.level;
      if (key === 'xp') return row.xp;
      return row.attributes[key];
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
    setSortDirection(key === 'name' || key === 'party' ? 'asc' : 'desc');
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

  if (loading) {
    return (
      <Card className="p-12 text-center text-[#A9B1D6] flex flex-col items-center justify-center min-h-[300px] bg-[#2D2E3A] border-[#4E597B] rounded-2xl">
        <div className="animate-spin w-8 h-8 border-2 border-[#7AA2F7] border-t-transparent rounded-full mb-4" />
        Kraunamas sąrašas iš /api/v2/heroes/leaderboard…
      </Card>
    );
  }

  return (
    <div className="space-y-6 text-[#A9B1D6]">
      <div className="flex items-center gap-3">
        <Trophy className="w-7 h-7 text-[#7AA2F7]" />
        <div>
          <h2 className="text-3xl font-bold text-[#A9B1D6]">Stebėsena / rizika</h2>
          <p className="text-sm text-[#A9B1D6]/70">
            Lentelė pagal lygį ir XP; INT stulpelis rodo vientisumo modelio išvestį (žr.{' '}
            <NavLink to="/dashboard/methodology" className="text-[#7AA2F7] underline">
              metodiką
            </NavLink>
            ).
          </p>
        </div>
      </div>

      <Card className="p-4 md:p-6 bg-[#1A1B26] border-[#4E597B] rounded-2xl space-y-3">
        <p className="text-sm text-[#A9B1D6]/90 leading-relaxed">
          Tai <strong className="text-[#A9B1D6]">ne</strong> oficialus Seimo reitingas. „Hero“ sąrašas čia reiškia
          žaidybinį lygį ir patirties taškus iš portalo logikos; <strong className="text-[#A9B1D6]">INT</strong> ir
          forensiniai laukai — atskiri signalai iš duomenų. Tuščios arba klaidingos eilutės reiškia API triktį arba
          trūkstamus duomenis — žr. būseną žemiau.
        </p>
        {loadError && (
          <p className="text-sm text-amber-400 border border-amber-500/30 rounded-lg px-3 py-2 bg-amber-500/5">
            Serveris negrąžino lentelės (HTTP klaida). Rodomi 0 eilučių — tai sąžininga būsena, ne „viskas gerai“.
          </p>
        )}
      </Card>

      {!loadError && sorted.length === 0 && (
        <Card className="p-8 text-center bg-[#2D2E3A] border-[#4E597B] rounded-2xl">
          <p className="text-[#A9B1D6] mb-2">Leaderboard tuščias</p>
          <p className="text-sm text-[#A9B1D6]/70 max-w-lg mx-auto">
            API grąžino tuščią masyvą. Galimos priežastys: dar nesinchronizuoti herojai, kita aplinka arba išjungtas
            endpoint.
          </p>
          <NavLink to="/dashboard/methodology" className="inline-block mt-4 text-sm text-[#7AA2F7] underline">
            Metodika ir apribojimai
          </NavLink>
        </Card>
      )}

      {sorted.length > 0 && (
        <Card className="overflow-x-auto p-0 bg-[#1A1B26] border-[#4E597B] rounded-2xl shadow-[0_0_35px_rgba(122,162,247,0.16)]">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="border-b border-[#4E597B] bg-[#2D2E3A]">
                <th className="text-left p-4">
                  <SortHeader label="Vieta" keyName="rank" />
                </th>
                <th className="text-left p-4">
                  <SortHeader label="Seimo narys" keyName="name" />
                </th>
                <th className="text-left p-4">
                  <SortHeader label="Frakcija" keyName="party" />
                </th>
                <th className="text-right p-4">
                  <SortHeader label="Lygis" keyName="level" />
                </th>
                <th className="text-right p-4">
                  <SortHeader label="XP" keyName="xp" />
                </th>
                <th className="text-right p-4">
                  <SortHeader label="STR" keyName="STR" />
                </th>
                <th className="text-right p-4">
                  <SortHeader label="WIS" keyName="WIS" />
                </th>
                <th className="text-right p-4">
                  <SortHeader label="CHA" keyName="CHA" />
                </th>
                <th className="text-right p-4">
                  <div className="inline-flex items-center justify-end gap-1">
                    <SortHeader label="INT" keyName="INT" />
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="p-0.5 rounded text-[#7AA2F7] hover:bg-[#4E597B]/50"
                          aria-label="INT paaiškinimas"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 text-xs text-popover-foreground" align="end">
                        <p className="font-semibold mb-1">INT (vientisumas)</p>
                        <p className="text-muted-foreground leading-relaxed">{INT_HELP_LT}</p>
                        <p className="mt-2 text-muted-foreground">
                          API: <code className="text-[10px] bg-muted px-1 rounded">attributes.INT</code>,{' '}
                          <code className="text-[10px] bg-muted px-1 rounded">forensic_breakdown</code>
                        </p>
                      </PopoverContent>
                    </Popover>
                  </div>
                </th>
                <th className="text-right p-4">
                  <SortHeader label="STA" keyName="STA" />
                </th>
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
                  <td className="p-4 text-[#A9B1D6]/85">{row.mp.party || 'Nepriklausomas (-a)'}</td>
                  <td className="p-4 text-right font-semibold text-[#A9B1D6]">{row.level}</td>
                  <td className="p-4 text-right font-semibold text-[#A9B1D6]">{row.xp.toLocaleString()}</td>
                  <td className="p-4 text-right">{row.attributes.STR.toFixed(1)}</td>
                  <td className="p-4 text-right">{row.attributes.WIS.toFixed(1)}</td>
                  <td className="p-4 text-right">{row.attributes.CHA.toFixed(1)}</td>
                  <td className="p-4 text-right">
                    <div
                      className="inline-flex items-center justify-end gap-2"
                      title={getIntegrityTooltip(row)}
                    >
                      <span
                        className={`inline-block w-3 h-3 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.25)] ${getIntDotClass(
                          row.forensic_breakdown?.total_forensic_adjustment ?? 0,
                        )}`}
                      />
                      {row.attributes.INT.toFixed(1)}
                    </div>
                  </td>
                  <td className="p-4 text-right">{row.attributes.STA.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

export default LeaderboardView;
