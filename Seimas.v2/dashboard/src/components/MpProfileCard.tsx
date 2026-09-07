import React, { useEffect, useRef } from 'react';
import { ExternalLink } from 'lucide-react';
import { Card } from './Card';
import { FlagList } from './FlagList';
import type { ForensicFlag, MpProfile } from '../services/api';
import { forensicBreakdownToFlags } from '../utils/forensicBreakdownToFlags';

export type MpProfileCardProps = {
  profile: MpProfile;
  highlightEngine?: ForensicFlag['engine'];
};

export default function MpProfileCard({ profile, highlightEngine }: MpProfileCardProps) {
  const flagListRef = useRef<HTMLElement>(null);
  const flags = forensicBreakdownToFlags(profile.forensicBreakdown);

  useEffect(() => {
    if (highlightEngine && flagListRef.current) {
      flagListRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [highlightEngine]);



  return (
    <Card className="p-6 md:p-8 space-y-6 bg-card border-border text-foreground rounded-xl shadow-card">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-3 min-w-0 flex-1">
          {profile.mp.seimas_id != null && String(profile.mp.seimas_id).trim() !== '' && (
            <a
              href={`https://www.lrs.lt/sip/portal.show?p_r=35289&p_kln_id=${encodeURIComponent(String(profile.mp.seimas_id))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Oficialus Seimo profilis (lrs.lt)
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      <Card className="p-6 bg-muted border-border rounded-xl space-y-4">
        <div>
          <div className="text-sm text-muted-foreground">Skaidrumas</div>
          <div className="text-lg font-semibold mt-1 text-foreground">Ką rodo patikros</div>
        </div>

        <div className="text-foreground [&_.text-muted-foreground]:text-foreground/70 [&_.text-foreground]:text-foreground [&_a.text-muted-foreground]:text-foreground/70">
          <FlagList ref={flagListRef} flags={flags} highlightEngine={highlightEngine} />
        </div>

        {/* A „Bendra forensinė korekcija" total stood here, summing the
            engines into a single ±N points figure beside a named member — three
            lines above the profile's own statement that the indicators are not
            added into one score. It was the composite, rebuilt under another
            name. The individual findings remain, each with its methodology
            link; only the total is gone. */}
      </Card>
    </Card>
  );
}
