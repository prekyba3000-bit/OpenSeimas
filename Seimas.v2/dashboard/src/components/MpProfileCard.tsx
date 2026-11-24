import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Card } from './Card';
import type { MpProfile } from '../services/api';

export type MpProfileCardProps = {
  profile: MpProfile;
};

export default function MpProfileCard({ profile }: MpProfileCardProps) {
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

      {/* „Skaidrumas · Ką rodo patikros" stood here: one row per forensic
          engine — Benford, amendment timing, vote geometry and a „hidden
          connections network" — each reading „Duomenų nėra". Nothing ever ran
          those engines, and they were deleted on 2026-11-14; four rows of
          „no data" on a named member read as checks run or pending on this
          person (evaluation CORF-04). Before that, a „Bendra forensinė
          korekcija" total summed them into one ±N figure — the composite under
          another name. */}
    </Card>
  );
}
