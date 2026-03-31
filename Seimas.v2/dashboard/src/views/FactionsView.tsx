import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Shield, AlertTriangle, TrendingUp, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { api, MpSummary } from '../services/api';
import { Card } from '../components/Card';
import { getPartyMeta, PartyMeta } from '../utils/partyColors';
import { cn } from '../components/ui/utils';
import { ProblemDetailsNotice } from '../components/ProblemDetailsNotice';

interface FactionData {
  name: string;
  meta: PartyMeta;
  members: MpSummary[];
  avgAttendance: number;
  totalVotes: number;
}

const FactionsView = () => {
  const navigate = useNavigate();
  const {
    data: mps = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ['mps', 'roster'],
    queryFn: () => api.getMps(),
  });
  const [expandedFaction, setExpandedFaction] = useState<string | null>(null);

  const factions = useMemo<FactionData[]>(() => {
    const groups: Record<string, MpSummary[]> = {};
    mps.filter(m => m.is_active).forEach(mp => {
      const party = mp.party || 'Unknown';
      if (!groups[party]) groups[party] = [];
      groups[party].push(mp);
    });

    return Object.entries(groups)
      .map(([name, members]) => {
        const meta = getPartyMeta(name);
        const avgAttendance = members.length
          ? members.reduce((s, m) => s + (m.attendance ?? 0), 0) / members.length
          : 0;
        const totalVotes = members.reduce((s, m) => s + (m.vote_count ?? 0), 0);
        return { name, meta, members, avgAttendance, totalVotes };
      })
      .sort((a, b) => b.members.length - a.members.length);
  }, [mps]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        Kraunama...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 border rounded-xl flex items-center gap-3 border-destructive bg-destructive/10 text-destructive">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <ProblemDetailsNotice error={error} className="text-sm border-0 bg-transparent p-0 text-destructive" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-3 mb-1">
          <Shield className="w-7 h-7 text-primary" />
          Frakcijos
        </h2>
        <p className="text-muted-foreground text-sm">Seimo frakcijų analizė ir narių statistika</p>
      </div>

      {/* Faction overview bar */}
      <Card className="p-4">
        <div className="flex h-8 rounded-full overflow-hidden bg-muted">
          {factions.filter(f => f.name !== 'Unknown').map(f => (
            <div
              key={f.name}
              className="h-full flex items-center justify-center text-[10px] font-bold text-white transition-all cursor-pointer hover:brightness-110"
              style={{
                width: `${(f.members.length / mps.filter(m => m.is_active).length) * 100}%`,
                backgroundColor: f.meta.hex,
                minWidth: f.members.length > 2 ? '40px' : '20px',
              }}
              title={`${f.meta.short}: ${f.members.length}`}
              onClick={() => setExpandedFaction(expandedFaction === f.name ? null : f.name)}
            >
              {f.members.length > 5 && f.meta.short}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-4 mt-3 flex-wrap">
          {factions.filter(f => f.name !== 'Unknown').map(f => (
            <div key={f.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: f.meta.hex }} />
              {f.meta.short} ({f.members.length})
            </div>
          ))}
        </div>
      </Card>

      {/* Faction cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {factions.map(faction => {
          const isExpanded = expandedFaction === faction.name;
          const sortedMembers = [...faction.members].sort((a, b) => (b.attendance ?? 0) - (a.attendance ?? 0));

          return (
            <motion.div
              key={faction.name}
              layout
              className={cn('col-span-1', isExpanded && 'md:col-span-2')}
            >
              <Card
                className="overflow-hidden cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => setExpandedFaction(isExpanded ? null : faction.name)}
              >
                {/* Header */}
                <div className="p-5 flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg"
                    style={{ backgroundColor: faction.meta.hex }}
                  >
                    {faction.meta.short.slice(0, 3)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground text-lg leading-tight truncate">
                      {faction.meta.short === '?' ? faction.name : faction.meta.short}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">{faction.name}</p>
                  </div>
                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <div className="text-xl font-bold text-foreground">{faction.members.length}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">nariai</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-foreground">{faction.avgAttendance.toFixed(0)}%</div>
                      <div className="text-[10px] text-muted-foreground uppercase">dalyvavimas</div>
                    </div>
                    <ChevronRight className={cn(
                      'w-5 h-5 text-muted-foreground transition-transform',
                      isExpanded && 'rotate-90'
                    )} />
                  </div>
                </div>

                {/* Mini attendance bar */}
                <div className="px-5 pb-4">
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${faction.avgAttendance}%`,
                        backgroundColor: faction.meta.hex,
                      }}
                    />
                  </div>
                </div>

                {/* Expanded member roster */}
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="border-t border-border"
                  >
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[500px] overflow-y-auto">
                      {sortedMembers.map(mp => (
                        <div
                          key={mp.id}
                          className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                          onClick={e => { e.stopPropagation(); navigate(`/dashboard/mps/${mp.id}`); }}
                        >
                          <img
                            src={mp.photo_url}
                            alt=""
                            className="w-9 h-9 rounded-lg object-cover bg-muted"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                              {mp.name}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <span>{mp.vote_count} balsų</span>
                              <span>•</span>
                              <span>{mp.attendance?.toFixed(0) ?? '—'}%</span>
                            </div>
                          </div>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                            style={{
                              backgroundColor: (mp.attendance ?? 0) > 80 ? '#10b98133' : (mp.attendance ?? 0) > 50 ? '#f59e0b33' : '#ef444433',
                              color: (mp.attendance ?? 0) > 80 ? '#10b981' : (mp.attendance ?? 0) > 50 ? '#f59e0b' : '#ef4444',
                            }}
                          >
                            {mp.attendance?.toFixed(0) ?? '?'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default FactionsView;
