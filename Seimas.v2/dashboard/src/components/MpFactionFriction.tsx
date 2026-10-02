import React, { useEffect, useState } from 'react';
import { api, MpFactionFriction } from '../services/api';

interface MpFactionFrictionProps {
  mpId: string;
}

export const MpFactionFrictionCard: React.FC<MpFactionFrictionProps> = ({ mpId }) => {
  const [data, setData] = useState<MpFactionFriction | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(false);
    api
      .getMpFactionFriction(mpId)
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [mpId]);

  if (loading) {
    return (
      <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl animate-pulse">
        <div className="h-4 bg-slate-800 rounded w-1/3 mb-4"></div>
        <div className="h-12 bg-slate-800/50 rounded mb-2"></div>
      </div>
    );
  }

  if (error || !data || data.total_votes === 0 || data.friction_rate_pct === null) {
    return null;
  }

  return (
    <div className="p-6 bg-slate-900/80 border border-indigo-500/30 rounded-xl shadow-lg relative overflow-hidden">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wide">
            Frakcijos Linijos Nesutapimai (Balsavimo Savarankiškumas)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Kiek kartų Seimo nario balsas skyrėsi nuo frakcijos daugumos pozicijos
          </p>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold text-indigo-400">
            {data.friction_rate_pct}%
          </span>
          <div className="text-[11px] text-slate-400">
            {data.friction_count} iš {data.total_votes} balsavimų
          </div>
        </div>
      </div>

      {data.notable_dissent_votes.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Paskutiniai Nesutapę Balsavimai
          </h4>
          <div className="space-y-2">
            {data.notable_dissent_votes.slice(0, 5).map((vote) => (
              <div
                key={vote.vote_id}
                className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded flex items-center justify-between text-xs"
              >
                <div className="pr-3">
                  <div className="font-medium text-slate-200 line-clamp-1">{vote.title}</div>
                  <div className="text-[11px] text-slate-500">{vote.date || 'Data nenurodyta'}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2 py-0.5 rounded font-semibold bg-rose-950/70 text-rose-300 border border-rose-800/50">
                    Balsas: {vote.mp_choice}
                  </span>
                  <span className="px-2 py-0.5 rounded font-semibold bg-slate-800 text-slate-400">
                    Frakcija: {vote.party_majority_choice}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
