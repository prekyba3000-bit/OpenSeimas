import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Activity, Shield, FileText, Vote, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { api, DashboardStats, ActivityItem as ActivityItemType, MpSummary, VoteSummary } from '../services/api';
import { ConnectingNotice, ConnectionError, isConnectionProblem } from '../components/ConnectionState';
import { occupancyLabel, activeCount, seatTotal } from '../utils/mpCounts';
import { formatLtDateShort } from '../utils/ltDate';
import { StatCard } from '../components/StatCard';
import { Card } from '../components/Card';
import { AbsenteeismCard } from '../components/AbsenteeismCard';
import { SeimasMap } from '../components/SeimasMap';
import { DataStripVote } from '../components/DataStripVote';
import { TickerTape } from '../components/TickerTape';
import { CornerAccents } from '../components/CornerAccents';

export const DashboardView = () => {
    const navigate = useNavigate();

    const statsQ = useQuery({
        queryKey: ['dashboard', 'stats'],
        queryFn: () => api.getStats(),
    });
    const activityQ = useQuery({
        queryKey: ['dashboard', 'activity'],
        queryFn: () => api.getActivity(),
    });
    const mpsQ = useQuery({
        queryKey: ['mps', 'roster'],
        queryFn: () => api.getMps(),
    });
    const votesQ = useQuery({
        queryKey: ['dashboard', 'votesPreview'],
        queryFn: () => api.getVotes(12, 0),
    });

    const loading = statsQ.isLoading || activityQ.isLoading || mpsQ.isLoading || votesQ.isLoading;
    // A failed or offline-paused query with no data means the page can't render;
    // show the connection screen rather than a half-empty dashboard.
    const connectionProblem = [statsQ, activityQ, mpsQ, votesQ].some(isConnectionProblem);

    const stats: DashboardStats | null = statsQ.data ?? null;
    const activity: ActivityItemType[] = activityQ.data ?? [];
    const mps: MpSummary[] = mpsQ.data ?? [];
    const votes: VoteSummary[] = votesQ.data ?? [];

    if (connectionProblem) {
        return (
            <ConnectionError
                onRetry={() => {
                    statsQ.refetch();
                    activityQ.refetch();
                    mpsQ.refetch();
                    votesQ.refetch();
                }}
            />
        );
    }

    if (loading) {
        return <ConnectingNotice />;
    }

    const tickerItems = [
        // The Seimas is a 141-seat body; the headline states that, and the
        // sub-label says how many of those seats are filled today.
        { icon: Users, label: 'Seimo vietos', value: String(seatTotal(stats)), trend: 'neutral' as const, trendValue: activeCount(stats) !== null ? `${activeCount(stats)} užimtos` : '—' },
        { icon: Vote, label: 'Balsavimai', value: stats?.historical_votes ?? '—', trend: 'up' as const, trendValue: 'viso' },
        { icon: FileText, label: 'Individualūs balsai', value: stats?.individual_votes ?? '—', trend: 'up' as const, trendValue: 'įrašai' },
        { icon: Calendar, label: 'Posėdžių dienos', value: stats ? String(stats.sitting_days) : '—', trend: 'neutral' as const, trendValue: 'su balsavimais' },
    ];

    const voteEvents = votes.map(v => ({
        title: v.title,
        // null when the source publishes no result — which is currently every
        // vote, because the LRS XML carries tallies but no pass/fail field.
        // The old `: 'DEFERRED'` fallback turned "we don't know" into "the
        // Seimas deferred this", asserted 5,279 times.
        outcome: v.result?.toLowerCase().includes('nepriimta')
            ? ('FAILED' as const)
            : v.result?.toLowerCase().includes('priimta')
                ? ('PASSED' as const)
                : null,
        votesFor: 0,
        votesAgainst: 0,
        timestamp: v.date,
    }));

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-6"
        >
            {/* Ticker Tape */}
            <div className="relative bg-card rounded-xl border border-border overflow-hidden">
                <CornerAccents />
                <TickerTape items={tickerItems} autoScroll={false} />
            </div>

            {/* Main Grid: Hemicycle + Recent Votes */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                {/* Hemicycle Map */}
                <div className="xl:col-span-3">
                    <Card className="p-4 h-full">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <Users className="w-4 h-4 text-primary" />
                                Posėdžių salė
                            </h2>
                            <span className="text-[10px] text-muted-foreground font-mono">
                                {stats ? occupancyLabel(stats) : `${mps.length} nariai`}
                            </span>
                        </div>
                        <SeimasMap mps={mps} compact />
                    </Card>
                </div>

                {/* Recent Votes Feed */}
                <div className="xl:col-span-2">
                    <Card className="p-0 h-full flex flex-col overflow-hidden">
                        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <Activity className="w-4 h-4 text-green-500" />
                                Naujausi balsavimai
                            </h2>
                            <button
                                onClick={() => navigate('/dashboard/votes')}
                                className="text-[10px] text-primary hover:underline font-medium"
                            >
                                Visi →
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto max-h-[420px]">
                            {voteEvents.map((evt, i) => (
                                <DataStripVote
                                    key={i}
                                    title={evt.title}
                                    outcome={evt.outcome}
                                    votesFor={evt.votesFor}
                                    votesAgainst={evt.votesAgainst}
                                    timestamp={evt.timestamp}
                                />
                            ))}
                        </div>
                    </Card>
                </div>
            </div>

            {/* Activity + System Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 p-0 overflow-hidden">
                    <div className="px-6 py-4 border-b border-border flex items-center gap-2">
                        <Activity className="w-4 h-4 text-primary" />
                        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                            Veiklos suvestinė
                        </h2>
                    </div>
                    <div className="divide-y divide-border">
                        {activity.length > 0 ? activity.map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group cursor-pointer"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center text-xs font-bold text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                        <Vote className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-medium text-foreground group-hover:text-primary transition-colors text-sm">{item.name}</span>
                                        <span className="text-xs text-muted-foreground">{item.action}: {item.context}</span>
                                    </div>
                                </div>
                                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded font-mono">{formatLtDateShort(item.time) ?? item.time}</span>
                            </motion.div>
                        )) : (
                            <p className="text-muted-foreground text-sm py-8 text-center">Nėra naujausios veiklos</p>
                        )}
                    </div>
                </Card>

                <Card className="flex flex-col gap-4 p-6">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        Sistemos būsena
                    </h2>
                    <div className="flex flex-col gap-3">
                        <StatusLine label="Duomenų bazė" status="CONNECTED" color="text-blue-400" />
                        <StatusLine label="API serveris" status="ONLINE" color="text-green-400" />
                        <StatusLine label="Sinchronizacija" status="AUTOMATINĖ" color="text-amber-400" />
                    </div>
                    <div className="mt-auto pt-4 border-t border-border">
                        <div className="grid grid-cols-2 gap-3">
                            <MiniStat label="Mandatą turi" value={activeCount(stats) !== null ? String(activeCount(stats)) : '—'} />
                            <MiniStat label="Posėdžių dienos" value={stats ? String(stats.sitting_days) : '—'} />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Absenteeism */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <AbsenteeismCard />
            </motion.div>
        </motion.div>
    );
};

function StatusLine({ label, status, color }: { label: string; status: string; color: string }) {
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className={`font-mono text-xs font-bold ${color}`}>{status}</span>
        </div>
    );
}

function MiniStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-foreground">{value}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
        </div>
    );
}
