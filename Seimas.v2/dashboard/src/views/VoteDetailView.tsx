import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, ExternalLink, ThumbsUp, ThumbsDown, Minus, UserX, Search, PieChart, Calendar, AlertTriangle, BarChart3 } from 'lucide-react';
import { motion } from 'motion/react';
import { api, VoteDetail } from '../services/api';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { VoteBreakdown } from '../components/VoteBreakdown';
import { getPartyColor, getPartyShort } from '../utils/partyColors';
import { cn } from '../components/ui/utils';

const getChoiceIcon = (choice: string) => {
    switch (choice.toLowerCase()) {
        case 'už': return <ThumbsUp className="w-4 h-4 text-green-500" />;
        case 'prieš': return <ThumbsDown className="w-4 h-4 text-red-500" />;
        case 'susilaikė': return <Minus className="w-4 h-4 text-amber-500" />;
        default: return <UserX className="w-4 h-4 text-gray-500" />;
    }
};

const getChoiceBg = (choice: string) => {
    switch (choice.toLowerCase()) {
        case 'už': return 'bg-green-500';
        case 'prieš': return 'bg-red-500';
        case 'susilaikė': return 'bg-amber-500';
        default: return 'bg-gray-500';
    }
};

const VoteDetailView = ({ voteId }: { voteId: string }) => {
    const [vote, setVote] = useState<VoteDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [filterChoice, setFilterChoice] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        api.getVote(voteId)
            .then(setVote)
            .catch(err => {
                console.error('Failed to load vote details', err);
                setError('Nepavyko užkrauti balsavimo duomenų.');
            })
            .finally(() => setLoading(false));
    }, [voteId]);

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
                    <AlertTriangle className="w-5 h-5 shrink-0" /> {error}
                </div>
            </div>
        );
    }

    if (!vote) {
        return <Card className="p-20 text-center text-muted-foreground">Balsavimas nerastas</Card>;
    }

    const totalVotes = Object.values(vote.stats).reduce((a, b) => a + b, 0);
    const breakdownStats = {
        for: vote.stats['Už'] ?? 0,
        against: vote.stats['Prieš'] ?? 0,
        abstain: vote.stats['Susilaikė'] ?? 0,
    };

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
                        <Calendar className="w-4 h-4" /> {vote.date}
                    </span>
                    {vote.result_type && (
                        <span className={cn(
                            'px-3 py-1 rounded-full font-bold text-xs',
                            vote.result_type.toLowerCase().includes('priimta')
                                ? 'bg-green-500/10 text-green-500'
                                : 'bg-red-500/10 text-red-500',
                        )}>
                            {vote.result_type}
                        </span>
                    )}
                    <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted">
                        <PieChart className="w-4 h-4" /> {totalVotes} balsų
                    </span>
                </div>
                {vote.description && (
                    <p className="text-muted-foreground text-sm leading-relaxed border-t border-border pt-4 mt-4">{vote.description}</p>
                )}
            </Card>

            {/* Vote Breakdown (Figma component) */}
            <VoteBreakdown stats={breakdownStats} totalVotes={totalVotes} />

            {/* Party Breakdown */}
            {partyBreakdown.length > 0 && (
                <Card className="p-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
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
                                            className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
                                            style={{ backgroundColor: p.color }}
                                        >
                                            {p.short}
                                        </span>
                                    </div>
                                    <div className="flex-1 flex h-5 rounded-full overflow-hidden bg-muted">
                                        {forPct > 0 && <div className="h-full bg-green-500" style={{ width: `${forPct}%` }} />}
                                        {againstPct > 0 && <div className="h-full bg-red-500" style={{ width: `${againstPct}%` }} />}
                                        {abstainPct > 0 && <div className="h-full bg-amber-500" style={{ width: `${abstainPct}%` }} />}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground w-8 text-right">{p.total}</div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}

            {/* Individual Votes */}
            <Card className="p-0 overflow-hidden">
                <div className="flex flex-col md:flex-row items-center justify-between p-5 border-b border-border gap-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
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
                                        'px-2 py-1 text-[10px] font-bold rounded transition-all',
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
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                                    style={{ backgroundColor: getPartyColor(v.party) }}
                                >
                                    {v.name.charAt(0)}
                                </div>
                                <div>
                                    <div className="font-medium text-sm group-hover:text-primary transition-colors">{v.name}</div>
                                    <div className="text-[10px] text-muted-foreground">{getPartyShort(v.party)}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted border border-border text-xs font-medium w-28 justify-center">
                                {getChoiceIcon(v.choice)}
                                <span>{v.choice}</span>
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
                <div className="p-2 border-t border-border bg-muted/20 text-center text-[10px] text-muted-foreground">
                    Rodoma {filteredVotes.length} įrašų
                </div>
            </Card>
        </motion.div>
    );
};

export default VoteDetailView;
