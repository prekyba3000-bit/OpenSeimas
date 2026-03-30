import React, { useEffect, useState } from 'react';
import { AlertTriangle, Calendar, Euro, TrendingDown } from 'lucide-react';
import { getPartyColor, getPartyShort } from '../utils/partyColors';

interface AbsenteeRecord {
  rank: number;
  name: string;
  photo_url?: string;
  party?: string;
  days_present: number;
  total_days: number;
  days_absent: number;
  participation_pct: number;
  daily_rate_eur: number;
  wage_unearned_eur: number;
}

interface AbsenteeismData {
  title: string;
  subtitle?: string;
  description: string;
  methodology?: {
    daily_rate_eur: number;
    total_sitting_days: number;
  };
  summary?: {
    top15_total_absent_days: number;
    top15_total_wage_unearned_eur: number;
  };
  generated_at: string;
  absentees: AbsenteeRecord[];
}

export const AbsenteeismCard: React.FC = () => {
  const [data, setData] = useState<AbsenteeismData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/absenteeism.json')
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-6 rounded w-1/3 bg-muted" />
          <div className="h-12 rounded bg-muted" />
          <div className="h-12 rounded bg-muted" />
          <div className="h-12 rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 flex items-center gap-3 text-destructive">
        <AlertTriangle className="w-5 h-5" />
        <span className="text-sm">{error || 'Duomenys nepasiekiami'}</span>
      </div>
    );
  }

  const summary = data.summary;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border bg-gradient-to-r from-red-500/5 to-transparent">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              {data.title}
            </h2>
            {data.subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{data.subtitle}</p>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mt-3 max-w-3xl">
          {data.description}
        </p>
      </div>

      {/* Summary stats */}
      {summary && (
        <div className="grid grid-cols-2 border-b border-border">
          <div className="p-4 border-r border-border text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-red-500" />
              <span className="text-2xl font-bold text-foreground">{summary.top15_total_absent_days}</span>
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">praleistų dienų (top 15)</div>
          </div>
          <div className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Euro className="w-4 h-4 text-red-500" />
              <span className="text-2xl font-bold text-foreground">€{summary.top15_total_wage_unearned_eur.toLocaleString()}</span>
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">neuždirbtas atlyginimas</div>
          </div>
        </div>
      )}

      {/* MP rows */}
      <div className="divide-y divide-border">
        {data.absentees.map(record => {
          const partyColor = getPartyColor(record.party);
          const partyShort = getPartyShort(record.party);
          const barColor =
            record.participation_pct >= 90 ? '#10b981' :
            record.participation_pct >= 70 ? '#f59e0b' :
            '#ef4444';

          return (
            <div key={record.rank} className="p-4 hover:bg-muted/20 transition-colors">
              <div className="flex items-center gap-4">
                {/* Rank */}
                <div className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-red-500">#{record.rank}</span>
                </div>

                {/* Photo */}
                {record.photo_url ? (
                  <img
                    src={record.photo_url}
                    alt={record.name}
                    className="w-10 h-10 rounded-full object-cover bg-muted border-2 shrink-0"
                    style={{ borderColor: partyColor }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
                )}

                {/* Name + Party */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground text-sm truncate">{record.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white"
                      style={{ backgroundColor: partyColor }}
                    >
                      {partyShort}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {record.days_present}/{record.total_days} dienų
                    </span>
                  </div>
                </div>

                {/* Absent days */}
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 justify-end">
                    <TrendingDown className="w-3 h-3 text-red-500" />
                    <span className="text-sm font-bold text-red-500">{record.days_absent} d.</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">praleista</div>
                </div>

                {/* Wage impact */}
                <div className="text-right shrink-0 min-w-[80px]">
                  <div className="text-sm font-bold text-foreground">€{record.wage_unearned_eur.toLocaleString()}</div>
                  <div className="text-[10px] text-red-400">neuždirbta</div>
                </div>

                {/* Percentage */}
                <div className="text-right shrink-0 w-14">
                  <div className="text-lg font-bold" style={{ color: barColor }}>
                    {record.participation_pct}%
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-2 ml-[4.5rem] mr-0">
                <div className="h-1.5 w-full rounded-full overflow-hidden bg-muted">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${record.participation_pct}%`, backgroundColor: barColor }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground">
          Atnaujinta: {new Date(data.generated_at).toLocaleString('lt-LT')}
        </p>
        <p className="text-[10px] text-muted-foreground">
          Dienos atlyginimas ≈ €{data.methodology?.daily_rate_eur ?? 191} (pagal viešus duomenis)
        </p>
      </div>
    </div>
  );
};

export default AbsenteeismCard;
