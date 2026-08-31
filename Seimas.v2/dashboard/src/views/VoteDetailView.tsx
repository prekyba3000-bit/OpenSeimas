import React, { useState, useMemo } from 'react';
import { ltPlural } from '../utils/ltPlural';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, ThumbsUp, ThumbsDown, Minus, UserX, Search, PieChart, Calendar, AlertTriangle, BarChart3 } from 'lucide-react';
import { motion } from 'motion/react';
import { api, VoteDetail } from '../services/api';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { VoteBreakdown } from '../components/VoteBreakdown';
import { getPartyColor, getPartyShort } from '../utils/partyColors';
import { cn } from '../components/ui/utils';
import { ProblemDetailsNotice } from '../components/ProblemDetailsNotice';
import { formatLtDateLong } from '../utils/ltDate';
import { NoPerMemberData } from '../components/NoPerMemberData';
import {
    perMemberChoiceState,
    hasAggregateTallies,
    NO_CHOICE_RECORDED_LT,
} from '../utils/perMemberChoices';

const getChoiceIcon = (choice: string | null | undefined) => {
    switch (choice?.toLowerCase()) {
        case 'už': return <ThumbsUp className="w-4 h-4 text-vote-for" />;
        case 'prieš': return <ThumbsDown className="w-4 h-4 text-vote-against" />;
        case 'susilaikė': return <Minus className="w-4 h-4 text-vote-abstain" />;
        default: return <UserX className="w-4 h-4 text-muted-foreground" />;
    }
};

const getChoiceBg = (choice: string | null | undefined) => {
    switch (choice?.toLowerCase()) {
        case 'už': return 'bg-vote-for';
        case 'prieš': return 'bg-vote-against';
        case 'susilaikė': return 'bg-vote-abstain';
        default: return 'bg-muted-foreground';
    }
};

const VoteDetailView = ({ voteId }: { voteId: string }) => {
    const {
        data: vote = null,
        isLoading: loading,
        error,
    } = useQuery({
        queryKey: ['votes', 'detail', voteId],
        queryFn: () => api.getVote(voteId),
        enabled: Boolean(voteId),
    });
    const [search, setSearch] = useState('');
    const [filterChoice, setFilterChoice] = useState<string | null>(null);

    const filteredVotes = useMemo(() => {
        if (!vote) return [];
        return vote.votes.filter(v => {
            const matchSearch = v.name.toLowerCase().includes(search.toLowerCase()) || v.party.toLowerCase().includes(search.toLowerCase());
            const matchChoice = !filterChoice || v.choice === filterChoice;
            return matchSearch && matchChoice;
        });
    }, [vote, search, filterChoice]);

    const partyBreakdown = useMemo(() => {
        if (!vote?.party_stats) return [];
        return Object.entries(vote.party_stats)
            .map(([party, stats]) => ({
                party,
                short: getPartyShort(party),
                color: getPartyColor(party),
                ...stats,
                total: Object.values(stats).reduce((a, b) => a + b, 0),
            }))
            .sort((a, b) => b.total - a.total);
    }, [vote]);

    if (loading) {
        return (
            <Card className="p-20 flex flex-col items-center justify-center text-muted-foreground">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mb-4" />
                Kraunami duomenys...
            </Card>
        );
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto space-y-4">
                <Button variant="ghost" className="pl-0 gap-2 text-muted-foreground hover:text-foreground" onClick={() => window.location.hash = '#/dashboard/votes'}>
                    <ArrowLeft className="w-4 h-4" /> Grįžti
                </Button>
                <div className="p-4 border border-destructive/30 bg-destructive/10 rounded-xl flex items-center gap-3 text-destructive">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <ProblemDetailsNotice error={error} className="text-sm" />
                </div>
            </div>
        );
    }

    if (!vote) {
        return <Card className="p-20 text-center text-muted-foreground">Balsavimas nerastas</Card>;
    }

    // `stats` for a vote with no per-member data is `{ null: 140 }` — 140 rows
    // that carry no choice. Summing it gave „140 balsų" for a vote where nobody
    // is recorded as having voted.
    const choiceState = perMemberChoiceState(vote.votes);
    const showTallies = hasAggregateTallies(vote.stats);
    const breakdownStats = {
        for: vote.stats['Už'] ?? 0,
        against: vote.stats['Prieš'] ?? 0,
        abstain: vote.stats['Susilaikė'] ?? 0,
    };
    const totalVotes = breakdownStats.for + breakdownStats.against + breakdownStats.abstain;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto space-y-6">
            <Button variant="ghost" className="pl-0 gap-2 text-muted-foreground hover:text-foreground" onClick={() => window.location.hash = '#/dashboard/votes'}>
                <ArrowLeft className="w-4 h-4" /> Grįžti
            </Button>

            {/* Header */}
            <Card className="p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                    <h1 className="text-xl font-bold leading-tight">{vote.title}</h1>
                    {vote.url && (
                        <Button variant="secondary" size="sm" icon={ExternalLink} onClick={() => window.open(vote.url!, '_blank')}>
                            Šaltinis
                        </Button>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted">
                        <Calendar className="w-4 h-4" /> {formatLtDateLong(vote.date) ?? vote.date}
                    </span>
                    {vote.result_type && (
                        <span className={cn(
                            'px-3 py-1 rounded-full font-bold text-xs',
                            vote.result_type.toLowerCase().includes('priimta')
                                ? 'bg-vote-for/10 text-vote-for'
                                : 'bg-vote-against/10 text-vote-against',
                        )}>
                            {vote.result_type}
                        </span>
                    )}
                    {showTallies && (
                        <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted">
                            <PieChart className="w-4 h-4" /> {totalVotes} {ltPlural(totalVotes, 'balsas', 'balsai', 'balsų')}
                        </span>
                    )}
                </div>
                {vote.description && (
                    <p className="text-muted-foreground text-sm leading-relaxed border-t border-border pt-4 mt-4">{vote.description}</p>
                )}
            </Card>

            {/* The aggregate tallies and the per-member list are separate
                fields from separate parts of the source, so each is gated on
                its own data rather than on the other's. Today they always agree
                — 3,626 votes have both, 1,653 have neither — but coupling them
                would hide a tally the moment that stops being true. */}
            {showTallies && <VoteBreakdown stats={breakdownStats} totalVotes={totalVotes} />}

            {choiceState !== 'present' && <NoPerMemberData />}

            {/* Party Breakdown */}
            {choiceState === 'present' && partyBreakdown.length > 0 && (
                <Card className="p-6">
                    <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Balsavimas pagal frakciją
                    </h3>
                    <div className="space-y-3">
                        {partyBreakdown.map(p => {
                            const forPct = p.total > 0 ? ((p['Už'] ?? 0) / p.total) * 100 : 0;
                            const againstPct = p.total > 0 ? ((p['Prieš'] ?? 0) / p.total) * 100 : 0;
                            const abstainPct = p.total > 0 ? ((p['Susilaikė'] ?? 0) / p.total) * 100 : 0;

                            return (
                                <div key={p.party} className="flex items-center gap-3">
                                    <div className="w-16 text-right">
                                        <span
                                            className="text-xs font-bold px-1.5 py-0.5 rounded text-white"
                                            style={{ backgroundColor: p.color }}
                                        >
                                            {p.short}
                                        </span>
                                    </div>
                                    <div className="flex-1 flex h-5 rounded-full overflow-hidden bg-muted">
                                        {forPct > 0 && <div className="h-full bg-vote-for" style={{ width: `${forPct}%` }} />}
                                        {againstPct > 0 && <div className="h-full bg-vote-against" style={{ width: `${againstPct}%` }} />}
                                        {abstainPct > 0 && <div className="h-full bg-vote-abstain" style={{ width: `${abstainPct}%` }} />}
                                    </div>
                                    <div className="text-xs text-muted-foreground w-8 text-right">{p.total}</div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}

            {/* Individual Votes — the whole card, not just its rows. A search
                box and three filter chips over an empty list invite a reader to
                go looking for data that was never published. */}
            {choiceState === 'present' && (
            <Card className="p-0 overflow-hidden">
                <div className="flex flex-col md:flex-row items-center justify-between p-5 border-b border-border gap-3">
                    <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                        <UserX className="w-4 h-4 text-primary" />
                        Individualūs balsai
                    </h3>
                    <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                            {['Už', 'Prieš', 'Susilaikė'].map(choice => (
                                <button
                                    key={choice}
                                    onClick={() => setFilterChoice(filterChoice === choice ? null : choice)}
                                    className={cn(
                                        'px-2 py-1 text-xs font-bold rounded transition-all',
                                        filterChoice === choice
                                            ? `${getChoiceBg(choice)} text-white`
                                            : 'bg-muted text-muted-foreground hover:bg-muted/80',
                                    )}
                                >
                                    {choice}
                                </button>
                            ))}
                        </div>
                        <div className="relative w-48">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Ieškoti..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full bg-muted border-none rounded-lg pl-8 pr-3 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
                    {filteredVotes.map((v, i) => (
                        <div key={i} className="py-2.5 px-5 flex items-center justify-between hover:bg-muted/20 transition-colors group">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                    style={{ backgroundColor: getPartyColor(v.party) }}
                                >
                                    {v.name.charAt(0)}
                                </div>
                                <div>
                                    <div className="font-medium text-sm group-hover:text-primary transition-colors">{v.name}</div>
                                    <div className="text-xs text-muted-foreground">{getPartyShort(v.party)}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted border border-border text-xs font-medium w-28 justify-center">
                                {getChoiceIcon(v.choice)}
                                {/* A member with no recorded choice on an
                                    otherwise-published vote rendered an empty
                                    chip. Say what it is instead — and not
                                    „Nedalyvavo", which asserts an absence the
                                    source did not record. */}
                                <span className={v.choice ? undefined : 'text-muted-foreground'}>
                                    {v.choice ?? NO_CHOICE_RECORDED_LT}
                                </span>
                            </div>
                        </div>
                    ))}
                    {filteredVotes.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
                            <Search className="w-8 h-8 opacity-20 mb-2" />
                            Nieko nerasta
                        </div>
                    )}
                </div>
                <div className="p-2 border-t border-border bg-muted/20 text-center text-xs text-muted-foreground">
                    Rodoma {filteredVotes.length} įrašų
                </div>
            </Card>
            )}
        </motion.div>
    );
};

export default VoteDetailView;
