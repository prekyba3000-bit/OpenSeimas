import React from 'react';
import { ChevronDown, Download, ExternalLink, Sparkles, Star, Swords, Trophy } from 'lucide-react';
import { Card } from './Card';
import { RadarAttributeChart } from './RadarAttributeChart';
import { AlignmentBadge } from './AlignmentBadge';
import { ForensicExplainer } from './ForensicExplainer';
import { API_URL } from '../config';

interface HeroAttributes {
  STR: number;
  WIS: number;
  CHA: number;
  INT: number;
  STA: number;
}

interface HeroArtifact {
  name: string;
  rarity: string;
}

interface HeroProfile {
  mp: {
    id: string;
    name: string;
    party?: string;
    photo?: string;
    active?: boolean;
    seimas_id?: string | number;
    last_synced_at?: string | null;
  };
  level: number;
  xp: number;
  xp_current_level: number;
  xp_next_level: number;
  alignment: string;
  attributes: HeroAttributes;
  artifacts: HeroArtifact[];
  forensic_breakdown: {
    base_risk_score: number;
    base_risk_penalty: number;
    benford: ForensicEntry & { p_value?: number | null };
    chrono: ForensicEntry & { worst_zscore?: number | null };
    vote_geometry: ForensicEntry & { max_deviation_sigma?: number | null };
    phantom_network: ForensicEntry & {
      procurement_links?: number;
      closest_hop_count?: number | null;
      debtor_links?: number;
    };
    loyalty_bonus: {
      status: ForensicStatus;
      independent_voting_days_pct: number;
      bonus: number;
      explanation: string;
    };
    total_forensic_adjustment: number;
    final_integrity_score: number;
  };
}

type ForensicStatus = 'clean' | 'warning' | 'flagged' | 'critical' | 'unavailable';

interface ForensicEntry {
  status: ForensicStatus;
  penalty: number;
  explanation: string;
}

const rarityClass: Record<string, string> = {
  Mythic: 'border-yellow-400 text-[#F5E8B0] bg-yellow-500/10',
  Legendary: 'border-purple-500 text-purple-200 bg-purple-500/10',
  Epic: 'border-blue-400 text-blue-200 bg-blue-500/10',
  Rare: 'border-green-400 text-green-200 bg-green-500/10',
  Common: 'border-gray-500 text-gray-200 bg-gray-500/10',
  Cursed: 'border-red-500 text-red-200 bg-red-500/10',
};

const statusBadgeClass: Record<ForensicStatus, string> = {
  clean: 'bg-[#7AA2F7]/25 text-[#A9B1D6] border-[#7AA2F7]/40',
  warning: 'bg-[#7AA2F7]/25 text-[#A9B1D6] border-[#7AA2F7]/40',
  flagged: 'bg-[#7AA2F7]/25 text-[#A9B1D6] border-[#7AA2F7]/40',
  critical: 'bg-[#7AA2F7]/25 text-[#A9B1D6] border-[#7AA2F7]/40',
  unavailable: 'bg-[#7AA2F7]/20 text-[#A9B1D6] border-[#7AA2F7]/30',
};

const formatXp = (value: number) => value.toLocaleString();

export default function HeroCard({ hero }: { hero: HeroProfile }) {
  const [showBreakdown, setShowBreakdown] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const nextLevelGap = Math.max(hero.xp_next_level - hero.xp_current_level, 1);
  const progressRaw = ((hero.xp - hero.xp_current_level) / nextLevelGap) * 100;
  const progress = Math.max(0, Math.min(100, progressRaw));

  const radarData = [
    { label: 'STR', value: hero.attributes.STR },
    { label: 'WIS', value: hero.attributes.WIS },
    { label: 'CHA', value: hero.attributes.CHA },
    { label: 'INT', value: hero.attributes.INT },
    { label: 'STA', value: hero.attributes.STA },
  ];

  const fallbackPhoto =
    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%231f2937" width="100" height="100"/><text x="50" y="58" text-anchor="middle" fill="%239ca3af" font-size="34">MP</text></svg>';

  const forensicRows: Array<{
    key: string;
    label: string;
    data: ForensicEntry;
  }> = [
    { key: 'benford', label: "Benford's Law Analysis", data: hero.forensic_breakdown.benford },
    { key: 'chrono', label: 'Chrono-Forensics', data: hero.forensic_breakdown.chrono },
    { key: 'vote_geometry', label: 'Vote Geometry', data: hero.forensic_breakdown.vote_geometry },
    { key: 'phantom_network', label: 'Phantom Network', data: hero.forensic_breakdown.phantom_network },
  ];

  const adjustment = hero.forensic_breakdown.total_forensic_adjustment;

  const pointsLabel = (points: number) => {
    if (points > 0) return `+${points} pts`;
    if (points < 0) return `${points} pts`;
    return '0 pts';
  };

  const handleShareCard = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/v2/heroes/${hero.mp.id}/share-card?format=primary`
      );
      if (!response.ok) {
        throw new Error(`Share card request failed (${response.status})`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const fileName = `hero-${hero.mp.name.replace(/\s+/g, '-').toLowerCase()}.png`;
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download share card:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card className="p-6 md:p-8 space-y-8 bg-[#2D2E3A] border-[#4E597B] text-[#A9B1D6] rounded-2xl shadow-[0_0_45px_rgba(122,162,247,0.18)]">
      <div className="flex flex-col md:flex-row md:items-center gap-6">
        <img
          src={hero.mp.photo || fallbackPhoto}
          alt={hero.mp.name}
          className="w-28 h-28 rounded-2xl object-cover bg-[#1A1B26] ring-2 ring-[#7AA2F7]/40"
          onError={(e) => {
            (e.target as HTMLImageElement).src = fallbackPhoto;
          }}
        />

        <div className="flex-1">
          <div className="text-xs uppercase tracking-[0.2em] text-[#7AA2F7]/90 mb-2 flex items-center gap-2">
            <Sparkles className="w-3 h-3" />
            Hero Profile
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#A9B1D6]">{hero.mp.name}</h1>
          <div className="text-sm text-[#A9B1D6]/70 mt-1">{hero.mp.party || 'Independent'}</div>
          {hero.mp.seimas_id != null && String(hero.mp.seimas_id).trim() !== '' && (
            <a
              href={`https://www.lrs.lt/sip/portal.show?p_r=35289&p_kln_id=${encodeURIComponent(String(hero.mp.seimas_id))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-xs text-[#7AA2F7] hover:underline"
            >
              Oficialus Seimo profilis (lrs.lt)
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          <div className="mt-3">
            <AlignmentBadge alignment={hero.alignment} />
          </div>
          <div className="mt-4 max-w-xl">
            <ForensicExplainer intScore={hero.attributes.INT} breakdown={hero.forensic_breakdown} variant="banner" />
          </div>
          {hero.mp.last_synced_at && (
            <div className="mt-4 text-[10px] uppercase tracking-widest text-[#A9B1D6]/40 font-mono">
              Last synced: {new Date(hero.mp.last_synced_at).toLocaleString('lt-LT')}
            </div>
          )}
        </div>

        <div className="md:text-right flex md:flex-col items-center md:items-end gap-3">
          <div className="text-xs uppercase tracking-[0.2em] text-[#A9B1D6]/70">Level</div>
          <div className="w-16 h-16 rounded-full border-2 border-[#7AA2F7]/70 bg-[#1A1B26] text-[#7AA2F7] text-3xl font-bold flex items-center justify-center shadow-[0_0_16px_rgba(122,162,247,0.35)]">
            {hero.level}
          </div>
          <button
            onClick={handleShareCard}
            disabled={isDownloading}
            className="inline-flex items-center gap-2 bg-[#7AA2F7] hover:bg-[#5B8AF0] disabled:opacity-60 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
          >
            <Download className="w-4 h-4" />
            {isDownloading ? 'Generating...' : 'Share Card'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <Card className="p-6 bg-[#1A1B26] border-[#4E597B] rounded-2xl">
          <div className="flex items-center gap-2 text-sm uppercase tracking-[0.15em] text-[#A9B1D6]/70 mb-5">
            <Swords className="w-4 h-4" />
            Attributes
          </div>
          <div className="flex justify-center">
            <RadarAttributeChart data={radarData} size={320} color="#22d3ee" />
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6 bg-[#1A1B26] border-[#4E597B] rounded-2xl">
            <div className="flex items-center gap-2 text-sm uppercase tracking-[0.15em] text-[#A9B1D6]/70 mb-4">
              <Star className="w-4 h-4" />
              Experience
            </div>
            <div className="text-2xl font-bold mb-3 text-[#A9B1D6]">{formatXp(hero.xp)} XP</div>
            <div className="relative w-full h-6 bg-[#2D2E3A] border border-[#4E597B] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#3E4C76] to-[#7AA2F7] transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-[11px] md:text-xs font-semibold text-white/90">
                XP: {formatXp(hero.xp_current_level)} / {formatXp(hero.xp_next_level)}
              </div>
            </div>
            <div className="flex justify-between text-xs text-[#A9B1D6]/70 mt-2">
              <span>{formatXp(hero.xp_current_level)} XP</span>
              <span>{formatXp(hero.xp_next_level)} XP</span>
            </div>
          </Card>

          <Card className="p-6 bg-[#1A1B26] border-[#4E597B] rounded-2xl">
            <div className="flex items-center gap-2 text-sm uppercase tracking-[0.15em] text-[#A9B1D6]/70 mb-4">
              <Trophy className="w-4 h-4" />
              Artifacts
            </div>
            {hero.artifacts.length ? (
              <div className="space-y-3">
                {hero.artifacts.map((artifact, index) => (
                  <div
                    key={`${artifact.name}-${index}`}
                    className={`rounded-lg px-3 py-2 border ${
                      rarityClass[artifact.rarity] || 'text-[#A9B1D6] border-gray-500 bg-gray-500/10'
                    }`}
                  >
                    <div className="font-semibold">{artifact.name}</div>
                    <div className="text-xs uppercase tracking-wider opacity-80">{artifact.rarity}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#A9B1D6]/70">No artifacts unlocked yet.</p>
            )}
          </Card>
        </div>
      </div>

      <Card className="p-6 bg-[#1A1B26] border-[#4E597B] rounded-2xl">
        <button
          className="w-full flex items-center justify-between text-left"
          onClick={() => setShowBreakdown((prev) => !prev)}
        >
          <div>
            <div className="text-sm uppercase tracking-[0.15em] text-[#A9B1D6]/70">Score Transparency</div>
            <div className="text-lg font-semibold mt-1">Why this score?</div>
          </div>
          <ChevronDown className={`w-5 h-5 transition-transform ${showBreakdown ? 'rotate-180' : ''}`} />
        </button>

        {showBreakdown && (
          <div className="mt-6 space-y-3">
            <div className="rounded-xl border border-[#4E597B] bg-[#2D2E3A] p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[#A9B1D6]">Base Risk Penalty</span>
                <span className="font-semibold text-red-300">
                  {pointsLabel(hero.forensic_breakdown.base_risk_penalty)}
                </span>
              </div>
              <div className="text-xs text-[#A9B1D6]/70 mt-1">
                Base risk score: {hero.forensic_breakdown.base_risk_score}
              </div>
            </div>

            {forensicRows.map((row) => (
              <div key={row.key} className="rounded-xl border border-[#4E597B] bg-[#2D2E3A] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">{row.label}</div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-xs border uppercase tracking-wider ${statusBadgeClass[row.data.status]}`}
                    >
                      {row.data.status}
                    </span>
                    <span className="text-sm font-semibold">{pointsLabel(row.data.penalty)}</span>
                  </div>
                </div>
                <p className="text-xs text-[#A9B1D6]/70 mt-2">{row.data.explanation}</p>
              </div>
            ))}

            <div className="rounded-xl border border-[#4E597B] bg-[#2D2E3A] p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Loyalty Bonus</span>
                <span className="text-sm font-semibold text-green-300">
                  {pointsLabel(hero.forensic_breakdown.loyalty_bonus.bonus)}
                </span>
              </div>
              <p className="text-xs text-[#A9B1D6]/70 mt-2">{hero.forensic_breakdown.loyalty_bonus.explanation}</p>
            </div>

            <div className="pt-2 border-t border-[#4E597B] space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#A9B1D6]">Total Forensic Adjustment</span>
                <span className="font-bold">{pointsLabel(adjustment)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#A9B1D6]">Final Integrity Score</span>
                <span className="font-bold text-[#7AA2F7]">{hero.forensic_breakdown.final_integrity_score}</span>
              </div>
            </div>
          </div>
        )}
      </Card>
    </Card>
  );
}
