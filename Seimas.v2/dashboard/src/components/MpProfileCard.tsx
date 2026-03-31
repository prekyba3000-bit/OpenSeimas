import React, { useEffect, useRef, useState } from 'react';
import { Download, ExternalLink } from 'lucide-react';
import { Card } from './Card';
import { FlagList } from './FlagList';
import { API_URL } from '../config';
import type { ForensicFlag, MpProfile } from '../services/api';
import { forensicBreakdownToFlags } from '../utils/forensicBreakdownToFlags';

export type MpProfileCardProps = {
  profile: MpProfile;
  highlightEngine?: ForensicFlag['engine'];
};

export default function MpProfileCard({ profile, highlightEngine }: MpProfileCardProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const flagListRef = useRef<HTMLElement>(null);
  const flags = forensicBreakdownToFlags(profile.forensicBreakdown);
  const adjustment = profile.forensicBreakdown.totalForensicAdjustment;

  useEffect(() => {
    if (highlightEngine && flagListRef.current) {
      flagListRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [highlightEngine]);

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
        `${API_URL}/api/v2/heroes/${profile.mp.id}/share-card?format=primary`
      );
      if (!response.ok) {
        throw new Error(`Share card request failed (${response.status})`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const slug = profile.mp.name.replace(/\s+/g, '-').toLowerCase();
      const fileName = `mp-${slug}.png`;
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
    <Card className="p-6 md:p-8 space-y-6 bg-[#2D2E3A] border-[#4E597B] text-[#A9B1D6] rounded-2xl shadow-[0_0_45px_rgba(122,162,247,0.18)]">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-3 min-w-0 flex-1">
          {profile.mp.seimas_id != null && String(profile.mp.seimas_id).trim() !== '' && (
            <a
              href={`https://www.lrs.lt/sip/portal.show?p_r=35289&p_kln_id=${encodeURIComponent(String(profile.mp.seimas_id))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[#7AA2F7] hover:underline"
            >
              Oficialus Seimo profilis (lrs.lt)
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
        <button
          type="button"
          onClick={handleShareCard}
          disabled={isDownloading}
          className="inline-flex items-center justify-center gap-2 shrink-0 bg-[#7AA2F7] hover:bg-[#5B8AF0] disabled:opacity-60 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
        >
          <Download className="w-4 h-4" />
          {isDownloading ? 'Generuojama…' : 'Dalintis kortele'}
        </button>
      </div>

      <Card className="p-6 bg-[#1A1B26] border-[#4E597B] rounded-2xl space-y-4">
        <div>
          <div className="text-sm uppercase tracking-[0.15em] text-[#A9B1D6]/70">Skaidrumas</div>
          <div className="text-lg font-semibold mt-1 text-[#A9B1D6]">Kodėl toks balas?</div>
        </div>

        <div className="text-[#A9B1D6] [&_.text-muted-foreground]:text-[#A9B1D6]/70 [&_.text-foreground]:text-[#A9B1D6] [&_a.text-muted-foreground]:text-[#A9B1D6]/70">
          <FlagList ref={flagListRef} flags={flags} highlightEngine={highlightEngine} />
        </div>

        <div className="pt-3 border-t border-[#4E597B] space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#A9B1D6]">Bendra forensinė korekcija</span>
            <span className="font-bold text-[#A9B1D6]">{pointsLabel(adjustment)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#A9B1D6]">Galutinis vientisumo balas</span>
            <span className="font-bold text-[#7AA2F7]">{profile.forensicBreakdown.finalIntegrityScore}</span>
          </div>
        </div>
      </Card>
    </Card>
  );
}
