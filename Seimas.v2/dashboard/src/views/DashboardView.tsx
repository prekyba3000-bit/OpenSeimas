import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Activity } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import {
    api,
    DashboardStats,
    Freshness,
    LastSittingDay,
    MpSummary,
    VoteSummary,
} from '../services/api';
import { ConnectingNotice, ConnectionError, isConnectionProblem } from '../components/ConnectionState';
import { occupancyLabel } from '../utils/mpCounts';
import { Card } from '../components/Card';
import { SeimasMap } from '../components/SeimasMap';
import { DataStripVote } from '../components/DataStripVote';
import { LastSittingDayStrip } from '../components/LastSittingDayStrip';
import { FreshnessLine } from '../components/FreshnessLine';
import { StatTrio } from '../components/StatTrio';
import { toOutcome } from '../utils/voteOutcome';

/**
 * The landing, rebuilt to the Phase 2 wireframe.
 *
 * Reading order is now primacy → context → recency: what the Seimas last did,
 * then three numbers that frame it, then the chamber and the votes themselves.
 *
 * Three things that used to be here are gone:
 *
 *   SISTEMOS BŪSENA — three hardcoded literals asserting health nobody
 *   checked. Replaced by one freshness line built from a real timestamp.
 *
 *   VEIKLOS SUVESTINĖ — a feed of five individual votes by five individual
 *   members, which is a question you ask *about an MP*, not about parliament.
 *   It lives in MP and vote contexts, where it answers something.
 *
 *   „743 233 individualūs balsai“ — a true number that no reader can hold. It
 *   moves to the methodology page, where being able to check every one of them
 *   is the point.
 */
export const DashboardView = () => {
    const navigate = useNavigate();

    const statsQ = useQuery({ queryKey: ['dashboard', 'stats'], queryFn: () => api.getStats() });
    const mpsQ = useQuery({ queryKey: ['mps', 'roster'], queryFn: () => api.getMps() });
    const votesQ = useQuery({
        queryKey: ['dashboard', 'votesPreview'],
        queryFn: () => api.getVotes(12, 0),
    });
    const sittingQ = useQuery({
        queryKey: ['dashboard', 'lastSittingDay'],
        queryFn: () => api.getLastSittingDay(),
    });
    // The most recent vote, for the seat map's „Balsavimas" encoding. Enabled
    // only once the list has arrived, so it never fetches /votes/undefined.
    const latestVoteId = votesQ.data?.[0]?.id;
    const latestVoteQ = useQuery({
        queryKey: ['votes', 'detail', latestVoteId],
        queryFn: () => api.getVote(latestVoteId!),
        enabled: Boolean(latestVoteId),
    });
    const freshnessQ = useQuery({
        queryKey: ['dashboard', 'freshness'],
        queryFn: () => api.getFreshness(),
    });

    const core = [statsQ, mpsQ, votesQ];
    const loading = core.some((q) => q.isLoading);
    // A failed or offline-paused core query means the page can't render; show
    // the connection screen rather than a half-empty dashboard. The strip and
    // freshness line are additive — if only those fail, the page still works
    // and simply says less.
    const connectionProblem = core.some(isConnectionProblem);

    const stats: DashboardStats | null = statsQ.data ?? null;
    const mps: MpSummary[] = mpsQ.data ?? [];
    const votes: VoteSummary[] = votesQ.data ?? [];
    const sitting: LastSittingDay | null = sittingQ.data ?? null;
    const freshness: Freshness | null = freshnessQ.data ?? null;

    if (connectionProblem) {
        return <ConnectionError onRetry={() => core.forEach((q) => q.refetch())} />;
    }

    if (loading) {
        return <ConnectingNotice />;
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-8"
        >
            {/* Primacy: what the Seimas last actually did. */}
            <LastSittingDayStrip data={sitting} />

            {/* Context: exactly three numbers, each with a per-person reading. */}
            <StatTrio stats={stats} />

            {/* Recency: the chamber, and the votes. */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                <div className="xl:col-span-3">
                    <Card className="p-4 h-full">
                        <div className="flex items-center justify-between mb-3 gap-3">
                            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                                <Users className="w-4 h-4 text-primary" aria-hidden />
                                Posėdžių salė
                            </h2>
                            <span className="text-sm text-muted-foreground">
                                {stats ? occupancyLabel(stats) : `${mps.length} nariai`}
                            </span>
                        </div>
                        <SeimasMap
                            mps={mps}
                            compact
                            latestVote={latestVoteQ.data ?? null}
                            lastSittingDay={sitting}
                        />
                    </Card>
                </div>

                <div className="xl:col-span-2">
                    <Card className="p-0 h-full flex flex-col overflow-hidden">
                        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                                <Activity className="w-4 h-4 text-primary" aria-hidden />
                                Naujausi balsavimai
                            </h2>
                            <button
                                onClick={() => navigate('/dashboard/votes')}
                                className="inline-flex min-h-6 items-center px-2 -mr-2 text-sm text-primary hover:underline font-medium"
                            >
                                Visi →
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto max-h-[420px]">
                            {votes.map((v) => (
                                <DataStripVote
                                    key={v.id}
                                    title={v.title}
                                    outcome={toOutcome(v.result)}
                                    votesFor={0}
                                    votesAgainst={0}
                                    timestamp={v.date}
                                />
                            ))}
                        </div>
                    </Card>
                </div>
            </div>

            <FreshnessLine data={freshness} />
        </motion.div>
    );
};

export default DashboardView;
