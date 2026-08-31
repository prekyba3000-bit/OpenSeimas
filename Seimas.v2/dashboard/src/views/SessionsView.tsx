import React, { useState, useMemo } from 'react';
import { ltPlural } from '../utils/ltPlural';
import { useQuery } from '@tanstack/react-query';
import { Calendar, ChevronRight, AlertTriangle, Vote, Clock, BarChart3 } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { api, VoteSummary, SeimasSession } from '../services/api';
import { Card } from '../components/Card';
import { cn } from '../components/ui/utils';
import { ProblemDetailsNotice } from '../components/ProblemDetailsNotice';

// LT-COPY: needs native review
export const UNKNOWN_SESSION_ID = -1;
const UNKNOWN_SESSION_LABEL = 'Sesija nenustatyta';

/**
 * Which session a sitting date falls in, or UNKNOWN_SESSION_ID.
 *
 * Sessions overlap at the edges — an extraordinary session opens while the next
 * ordinary session is already announced — so the latest session that has begun
 * by `date` wins, not whichever comes first in array order. A date that matches
 * nothing returns UNKNOWN and is rendered as unknown; the previous version
 * dropped those votes silently, and gave its open session an end date of
 * 2099-12-31 so that nothing ever failed to match.
 */
export function sessionIdForDate(sessions: SeimasSession[], date: string): number {
  let best: SeimasSession | null = null;
  for (const s of sessions) {
    if (date < s.date_from) continue;
    if (s.date_to && date > s.date_to) continue;
    if (!best || s.date_from > best.date_from) best = s;
  }
  return best ? best.id : UNKNOWN_SESSION_ID;
}

// LT-COPY: needs native review
export function periodLabel(s: SeimasSession): string {
  if (s.status === 'upcoming') return `nuo ${s.date_from}`;
  // No end date means LRS has not recorded one, not that the session runs
  // forever. „vyksta" says the session is open; it does not claim the Seimas
  // met today.
  if (!s.date_to) return `${s.date_from} → vyksta`;
  return `${s.date_from} → ${s.date_to}`;
}

const SessionsView = () => {
  const navigate = useNavigate();
  const {
    data: votes = [],
    isLoading: loadingVotes,
    error,
  } = useQuery({
    queryKey: ['votes', 'sessions', 2600],
    queryFn: () => api.getVotes(2600, 0),
  });
  const {
    data: sessionData,
    isLoading: loadingSessions,
    error: sessionsError,
  } = useQuery({
    queryKey: ['meta', 'sessions'],
    queryFn: () => api.getSessions(),
  });
  const loading = loadingVotes || loadingSessions;
  const SESSIONS = useMemo(() => sessionData?.sessions ?? [], [sessionData]);
  const [expandedSession, setExpandedSession] = useState<number | null>(null);

  const sessionVotes = useMemo(() => {
    const grouped: Record<number, { votes: VoteSummary[]; byDate: Record<string, VoteSummary[]> }> = {};
    SESSIONS.forEach(s => { grouped[s.id] = { votes: [], byDate: {} }; });
    grouped[UNKNOWN_SESSION_ID] = { votes: [], byDate: {} };

    votes.forEach(v => {
      const d = v.date;
      const id = sessionIdForDate(SESSIONS, d);
      const bucket = grouped[id] ?? grouped[UNKNOWN_SESSION_ID];
      bucket.votes.push(v);
      if (!bucket.byDate[d]) bucket.byDate[d] = [];
      bucket.byDate[d].push(v);
    });

    return grouped;
  }, [votes, SESSIONS]);

  // Only shown when it has contents. An empty bucket is not a finding.
  const unknownCount = sessionVotes[UNKNOWN_SESSION_ID]?.votes.length ?? 0;

  // No session list is a different fact from "these votes belong to no
  // session". Without this, an unreachable endpoint would file every vote
  // under „Sesija nenustatyta" and state, in confident Lithuanian, something
  // untrue about the data rather than about the request.
  const sessionsUnavailable = !loadingSessions && SESSIONS.length === 0;

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
            const isCurrent = s.status === 'sitting';
            return (
              <div
                key={s.id}
                className={cn(
                  'h-full rounded cursor-pointer transition-all hover:brightness-110 flex items-center justify-center text-xs font-bold text-white/80',
                  isCurrent ? 'border-2 border-dashed border-primary' : '',
                )}
                style={{
                  flex: Math.max(count / maxCount, 0.05),
                  backgroundColor: isCurrent ? 'hsl(var(--attention))' : count > 0 ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
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
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>2024 m. lapkritis</span>
          <span>2026 m. kovas →</span>
        </div>
      </Card>

      {/* Session cards */}
      <div className="flex flex-col gap-4">
        {/* Votes whose sitting date falls in no session LRS publishes. The
            previous version could not produce this card: its open session ran
            to 2099, so every vote matched something. Silence here was not
            evidence of agreement. */}
        {sessionsUnavailable && (
          <Card className="p-5 border-dashed">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-muted-foreground" />
              <div>
                {/* LT-COPY: needs native review */}
                <h3 className="font-bold text-foreground">Sesijų sąrašas nepasiekiamas</h3>
                <p className="text-xs text-muted-foreground">
                  Balsavimų pagal sesijas kol kas neskirstome. Tai duomenų šaltinio
                  problema, ne teiginys apie balsavimus.
                </p>
              </div>
            </div>
          </Card>
        )}
        {!sessionsUnavailable && unknownCount > 0 && (
          <Card className="p-5 border-dashed">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-muted-foreground" />
              <div>
                {/* LT-COPY: needs native review */}
                <h3 className="font-bold text-foreground">{UNKNOWN_SESSION_LABEL}</h3>
                <p className="text-xs text-muted-foreground">
                  {unknownCount} balsavimų, kurių posėdžio data nepatenka į jokią
                  paskelbtą sesiją. Rodome atskirai, o ne priskiriame spėjant.
                </p>
              </div>
            </div>
          </Card>
        )}
        {SESSIONS.map(session => {
          const data = sessionVotes[session.id];
          const isExpanded = expandedSession === session.id;
          const isCurrent = session.status === 'sitting';
          const dates = Object.keys(data?.byDate ?? {}).sort().reverse();
          // The LRS feed lists a session before it opens.
          const hasStarted = session.date_from <= new Date().toISOString().slice(0, 10);

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
                        {/* The badge used to read a literal „IV" on whichever
                            card was pinned as current. It now shows the session
                            number LRS gives, or nothing if it gives none. */}
                        <span>{session.number ?? ''}</span>
                      </div>
                    ) : (
                      <Calendar className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{session.name}</h3>
                    <p className="text-xs text-muted-foreground">{periodLabel(session)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  {/* A session that has not begun has no votes yet, which is not the
                      same as one that met and decided nothing. Zero beside a future
                      date reads as the second. */}
                  {hasStarted ? (
                    <>
                      <div className="text-right">
                        <div className="text-lg font-bold text-foreground">{data?.votes.length ?? 0}</div>
                        <div className="text-xs text-muted-foreground">
                          {ltPlural(data?.votes.length ?? 0, 'balsavimas', 'balsavimai', 'balsavimų')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-foreground">{dates.length}</div>
                        <div className="text-xs text-muted-foreground">
                          {ltPlural(dates.length, 'posėdžio diena', 'posėdžių dienos', 'posėdžių dienų')}
                        </div>
                      </div>
                    </>
                  ) : (
                    /* LT-COPY: needs native review */
                    <div className="text-right text-xs text-muted-foreground max-w-[9rem]">
                      Sesija dar neprasidėjo
                    </div>
                  )}
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
                          <span className="text-xs text-muted-foreground">{dayVotes.length} balsavimų</span>
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
                                  'text-xs font-bold px-2 py-0.5 rounded shrink-0 ml-2',
                                  v.result.toLowerCase().includes('priimta') ? 'bg-vote-for/10 text-vote-for' : 'bg-destructive/10 text-destructive',
                                )}>
                                  {v.result}
                                </span>
                              )}
                            </div>
                          ))}
                          {dayVotes.length > 8 && (
                            <div className="px-5 py-2 text-xs text-muted-foreground text-center">
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
