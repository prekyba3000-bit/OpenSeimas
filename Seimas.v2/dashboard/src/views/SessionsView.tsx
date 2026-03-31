import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, ChevronRight, AlertTriangle, Vote, Clock, BarChart3 } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { api, VoteSummary } from '../services/api';
import { Card } from '../components/Card';
import { cn } from '../components/ui/utils';
import { ProblemDetailsNotice } from '../components/ProblemDetailsNotice';

interface SessionInfo {
  id: number;
  name: string;
  period: string;
  startDate: string;
  endDate: string;
}

const SESSIONS: SessionInfo[] = [
  { id: 144, name: 'IV (Pavasario) sesija', period: '2026-03-10 → dabar', startDate: '2026-03-10', endDate: '2099-12-31' },
  { id: 141, name: 'III (Rudens) sesija', period: '2025-09-10 → 2025-12-23', startDate: '2025-09-10', endDate: '2025-12-23' },
  { id: 143, name: 'Neeilinė sesija', period: '2025-08-21 → 2025-08-26', startDate: '2025-08-21', endDate: '2025-08-26' },
  { id: 140, name: 'II (Pavasario) sesija', period: '2025-03-10 → 2025-06-30', startDate: '2025-03-10', endDate: '2025-06-30' },
  { id: 139, name: 'I (Rudens) sesija', period: '2024-11-14 → 2025-01-14', startDate: '2024-11-14', endDate: '2025-01-14' },
];

const SessionsView = () => {
  const navigate = useNavigate();
  const {
    data: votes = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ['votes', 'sessions', 2600],
    queryFn: () => api.getVotes(2600, 0),
  });
  const [expandedSession, setExpandedSession] = useState<number | null>(141);

  const sessionVotes = useMemo(() => {
    const grouped: Record<number, { votes: VoteSummary[]; byDate: Record<string, VoteSummary[]> }> = {};
    SESSIONS.forEach(s => { grouped[s.id] = { votes: [], byDate: {} }; });

    votes.forEach(v => {
      const d = v.date;
      for (const s of SESSIONS) {
        if (d >= s.startDate && d <= s.endDate) {
          grouped[s.id].votes.push(v);
          if (!grouped[s.id].byDate[d]) grouped[s.id].byDate[d] = [];
          grouped[s.id].byDate[d].push(v);
          break;
        }
      }
    });

    return grouped;
  }, [votes]);

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
          <Calendar className="w-7 h-7 text-primary" />
          Sesijos
        </h2>
        <p className="text-muted-foreground text-sm">X kadencijos sesijų apžvalga (2024–2028)</p>
      </div>

      {/* Timeline bar */}
      <Card className="p-5">
        <div className="flex items-center gap-1 h-10">
          {SESSIONS.slice().reverse().map(s => {
            const count = sessionVotes[s.id]?.votes.length ?? 0;
            const maxCount = Math.max(...SESSIONS.map(ss => sessionVotes[ss.id]?.votes.length ?? 0), 1);
            const isCurrent = s.id === 144;
            return (
              <div
                key={s.id}
                className={cn(
                  'h-full rounded cursor-pointer transition-all hover:brightness-110 flex items-center justify-center text-[10px] font-bold text-white/80',
                  isCurrent ? 'border-2 border-dashed border-primary' : '',
                )}
                style={{
                  flex: Math.max(count / maxCount, 0.05),
                  backgroundColor: isCurrent ? 'var(--primary)' : count > 0 ? '#3b82f6' : '#374151',
                  opacity: count > 0 ? 0.6 + (count / maxCount) * 0.4 : 0.3,
                }}
                title={`${s.name}: ${count} balsavimų`}
                onClick={() => setExpandedSession(expandedSession === s.id ? null : s.id)}
              >
                {count > 20 && count}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
          <span>2024 m. lapkritis</span>
          <span>2026 m. kovas →</span>
        </div>
      </Card>

      {/* Session cards */}
      <div className="flex flex-col gap-4">
        {SESSIONS.map(session => {
          const data = sessionVotes[session.id];
          const isExpanded = expandedSession === session.id;
          const isCurrent = session.id === 144;
          const dates = Object.keys(data?.byDate ?? {}).sort().reverse();

          return (
            <Card
              key={session.id}
              className={cn(
                'overflow-hidden transition-colors',
                isCurrent && 'border-primary/40',
              )}
            >
              <div
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-muted/20 transition-colors"
                onClick={() => setExpandedSession(isExpanded ? null : session.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm',
                    isCurrent ? 'bg-primary' : 'bg-muted',
                  )}>
                    {isCurrent ? (
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        <span>IV</span>
                      </div>
                    ) : (
                      <Calendar className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{session.name}</h3>
                    <p className="text-xs text-muted-foreground">{session.period}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-lg font-bold text-foreground">{data?.votes.length ?? 0}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">balsavimų</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-foreground">{dates.length}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">posėdžių dienų</div>
                  </div>
                  <ChevronRight className={cn(
                    'w-5 h-5 text-muted-foreground transition-transform',
                    isExpanded && 'rotate-90',
                  )} />
                </div>
              </div>

              {isExpanded && dates.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="border-t border-border max-h-[500px] overflow-y-auto"
                >
                  {dates.slice(0, 30).map(date => {
                    const dayVotes = data!.byDate[date];
                    return (
                      <div key={date} className="border-b border-border last:border-0">
                        <div className="px-5 py-2 bg-muted/20 flex items-center justify-between">
                          <span className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {date}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{dayVotes.length} balsavimų</span>
                        </div>
                        <div className="divide-y divide-border/50">
                          {dayVotes.slice(0, 8).map(v => (
                            <div
                              key={v.id}
                              className="px-5 py-2.5 flex items-center justify-between hover:bg-muted/10 transition-colors cursor-pointer group"
                              onClick={() => navigate(`/dashboard/votes/${v.id}`)}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <Vote className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span className="text-sm text-foreground truncate group-hover:text-primary transition-colors">{v.title}</span>
                              </div>
                              {v.result && (
                                <span className={cn(
                                  'text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ml-2',
                                  v.result.toLowerCase().includes('priimta') ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500',
                                )}>
                                  {v.result}
                                </span>
                              )}
                            </div>
                          ))}
                          {dayVotes.length > 8 && (
                            <div className="px-5 py-2 text-[10px] text-muted-foreground text-center">
                              +{dayVotes.length - 8} daugiau balsavimų
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {dates.length > 30 && (
                    <div className="px-5 py-3 text-xs text-muted-foreground text-center bg-muted/10">
                      Rodoma 30 iš {dates.length} posėdžių dienų
                    </div>
                  )}
                </motion.div>
              )}

              {isExpanded && dates.length === 0 && (
                <div className="border-t border-border p-8 text-center text-muted-foreground text-sm">
                  {isCurrent ? 'Sesija ką tik prasidėjo — balsavimų dar nėra.' : 'Balsavimų duomenų nerasta.'}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </motion.div>
  );
};

export default SessionsView;
