import React, { useEffect, useMemo, useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Users, GitCompare, TrendingUp, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api, MpSummary } from '../services/api';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { ProblemDetailsNotice } from '../components/ProblemDetailsNotice';
import { LT } from '../i18n/lt';

const MpSelector = ({ mps, selected, onSelect, placeholder }: {
    mps: MpSummary[];
    selected: string | null;
    onSelect: (id: string) => void;
    placeholder: string;
}) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    const filtered = mps.filter((mp) =>
        mp.name.toLowerCase().includes(search.toLowerCase()) ||
        mp.party?.toLowerCase().includes(search.toLowerCase())
    );

    const selectedMp = mps.find((m) => m.id === selected);

    return (
        <div className="relative">
            <div
                onClick={() => setOpen(!open)}
                className={`
                    p-4 rounded-xl cursor-pointer flex items-center gap-4 transition-all duration-200 border
                    ${open ? 'bg-primary/10 border-primary' : 'bg-muted border-border hover:bg-muted hover:border-border'}
                `}
            >
                {selectedMp ? (
                    <>
                        <img src={selectedMp.photo_url} alt="" className="w-10 h-10 rounded-full object-cover bg-muted ring-2 ring-border" />
                        <div className="flex flex-col flex-1">
                            <span className="text-sm font-semibold text-foreground">{selectedMp.name}</span>
                            <span className="text-xs text-muted-foreground">{selectedMp.party}</span>
                        </div>
                        <Check className="w-4 h-4 text-primary" />
                    </>
                ) : (
                    <>
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <Users className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <span className="text-muted-foreground text-sm flex-1">{placeholder}</span>
                    </>
                )}
            </div>

            <AnimatePresence>
                {open && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute z-50 mt-2 w-full bg-popover border border-border rounded-xl shadow-raised max-h-80 overflow-auto custom-scrollbar"
                        >
                            <div className="sticky top-0 bg-popover p-2 border-b border-border">
                                <input
                                    type="text"
                                    placeholder={LT.comparisonView.searchMp}
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full p-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                    autoFocus
                                />
                            </div>

                            {filtered.map((mp) => (
                                <div
                                    key={mp.id}
                                    onClick={() => { onSelect(mp.id); setOpen(false); setSearch(''); }}
                                    className="p-3 flex items-center gap-3 hover:bg-muted cursor-pointer transition-colors border-b border-border last:border-0"
                                >
                                    <img src={mp.photo_url} alt="" className="w-8 h-8 rounded-full object-cover bg-muted" />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-foreground">{mp.name}</span>
                                        <span className="text-xs text-muted-foreground">{mp.party}</span>
                                    </div>
                                </div>
                            ))}
                            {filtered.length === 0 && (
                                <div className="p-4 text-center text-xs text-muted-foreground">{LT.comparisonView.noResults}</div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

const AlignmentScore = ({ score, label }: { score: number; label: string }) => {
    const percentage = Math.round(score * 100);
    const color = percentage >= 80 ? 'text-vote-for' : percentage >= 50 ? 'text-secondary' : 'text-destructive';
    const ringColor = percentage >= 80 ? 'border-vote-for' : percentage >= 50 ? 'border-border' : 'border-destructive';

    return (
        <div className="flex flex-col items-center gap-4 py-8">
            <div className={`relative w-40 h-40 rounded-full border-8 ${ringColor} border-opacity-20 flex items-center justify-center`}>
                <div className={`absolute inset-0 rounded-full border-8 ${ringColor} border-t-transparent animate-spin-slow opacity-50`} />
                <span className={`text-5xl font-bold ${color}`}>{percentage}%</span>
            </div>
            <span className="text-sm text-muted-foreground font-medium">{label}</span>
        </div>
    );
};

interface ComparisonViewProps {
    initialSelected?: (string | null)[];
}

const ComparisonView = ({ initialSelected = [null, null] }: ComparisonViewProps) => {
    const [selected, setSelected] = useState<(string | null)[]>(initialSelected);

    const { data: mps = [] } = useQuery({
        queryKey: ['mps', 'roster'],
        queryFn: () => api.getMps(),
    });

    const compareEnabled =
        Boolean(selected[0] && selected[1] && selected[0] !== selected[1]);
    const compareIds = useMemo(
        () => (compareEnabled ? ([selected[0], selected[1]] as [string, string]) : null),
        [compareEnabled, selected],
    );

    const {
        data: comparison = null,
        isFetching,
        isPlaceholderData,
        error,
    } = useQuery({
        queryKey: compareIds
            ? (['mps', 'compare', compareIds[0], compareIds[1]] as const)
            : (['mps', 'compare', 'idle'] as const),
        queryFn: () => api.compareMps([compareIds![0], compareIds![1]]),
        enabled: compareEnabled,
        placeholderData: keepPreviousData,
    });

    const loading = isFetching && !isPlaceholderData;
    // Previous pair's results stay visible while the new pair refetches (keepPreviousData)
    const comparisonStale = isPlaceholderData && isFetching;

    // Screen-reader announcement when a comparison finishes (cleared on new selection)
    const [completeAnnouncement, setCompleteAnnouncement] = useState<string | null>(null);
    useEffect(() => {
        setCompleteAnnouncement(null);
    }, [compareIds]);
    useEffect(() => {
        if (comparison && !comparisonStale) {
            setCompleteAnnouncement(LT.comparisonView.updatedAnnouncement);
        }
    }, [comparison, comparisonStale]);

    const updateSelected = (index: number, value: string) => {
        const newSelected = [...selected];
        newSelected[index] = value;
        setSelected(newSelected);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-8 max-w-5xl mx-auto"
        >
            {/* Header */}
            <header className="flex flex-col gap-2 border-b border-border pb-8">
                <h1 className="text-3xl font-bold flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl">
                        <GitCompare className="w-8 h-8 text-primary" />
                    </div>
                    {LT.comparisonView.title}
                </h1>
                <p className="text-muted-foreground ml-[4.5rem]">{LT.comparisonView.subtitle}</p>
            </header>

            {/* Selector Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center relative">
                <MpSelector
                    mps={mps.filter(m => m.id !== selected[1])}
                    selected={selected[0]}
                    onSelect={(v) => updateSelected(0, v)}
                    placeholder={LT.comparisonView.selectFirst}
                />

                <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-primary rounded-full items-center justify-center z-10 shadow-lg shadow-none text-white font-bold text-xs ring-4 ring-background">
                    VS
                </div>

                <MpSelector
                    mps={mps.filter(m => m.id !== selected[0])}
                    selected={selected[1]}
                    onSelect={(v) => updateSelected(1, v)}
                    placeholder={LT.comparisonView.selectSecond}
                />
            </div>

            {/* Loading State — only when no cached row yet (keepPreviousData keeps prior pair visible while refetching) */}
            {loading && !comparison && (
                <Card className="p-20 flex flex-col items-center justify-center">
                    <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mb-6" />
                    <span className="text-muted-foreground animate-pulse">{LT.comparisonView.running}</span>
                </Card>
            )}

            {/* Error State */}
            {error && (
                <ProblemDetailsNotice
                    error={error}
                    className="p-4 border border-destructive/30 bg-destructive/10 rounded-xl flex items-center gap-3 text-destructive"
                />
            )}

            {/* Results */}
            {comparison && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    aria-busy={comparisonStale}
                    className={`flex flex-col gap-8 ${comparisonStale ? 'ui-state-updating' : ''}`}
                >
                    {comparisonStale && (
                        <div aria-live="polite" aria-atomic="true" className="text-center text-xs text-muted-foreground -mb-2">
                            {LT.comparisonView.updating}
                        </div>
                    )}
                    {completeAnnouncement && (
                        <div role="status" aria-live="assertive" className="sr-only">
                            {completeAnnouncement}
                        </div>
                    )}
                    <Card className="text-center overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-vote-against via-secondary to-vote-for" />
                        <AlignmentScore
                            score={comparison.alignment_matrix[0][1]}
                                label={LT.comparisonView.scoreLabel}
                        />
                        <p className="text-sm text-muted-foreground pb-8 max-w-md mx-auto">
                            {LT.comparisonView.scoreBody}
                        </p>
                    </Card>

                    {comparison.divergent_votes.length > 0 && (
                        <Card className="p-0 overflow-hidden">
                            <div className="p-6 border-b border-border flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-primary" />
                                <h3 className="font-semibold text-foreground">{LT.comparisonView.divergences}</h3>
                            </div>

                            <div className="divide-y divide-white/5">
                                {comparison.divergent_votes.slice(0, 10).map((vote: any) => (
                                    <div key={vote.vote_id} className="p-6 hover:bg-muted transition-colors">
                                        <div className="text-base font-medium mb-4 pr-12">{vote.title}</div>

                                        <div className="grid grid-cols-2 gap-4">
                                            {comparison.mps.map((mp: any) => (
                                                <div key={mp.id} className="flex flex-col gap-1">
                                                    <span className="text-xs text-muted-foreground">{mp.name.split(' ').slice(-1)[0]}</span>
                                                    <span className={`text-sm font-bold ${vote.votes[mp.id] === 'Už' ? 'text-vote-for' :
                                                        vote.votes[mp.id] === 'Prieš' ? 'text-destructive' :
                                                            'text-secondary'
                                                        }`}>
                                                        {vote.votes[mp.id]}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-border flex justify-between items-center text-xs text-muted-foreground">
                                            <span>{vote.date}</span>
                                            <Button variant="ghost" size="sm" onClick={() => window.location.hash = `#/votes/${vote.vote_id}`}>{LT.comparisonView.viewVoteDetails}</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </motion.div>
            )}

            {/* Empty State */}
            {!comparison && !isFetching && !error && (
                <div className="p-20 text-center text-muted-foreground flex flex-col items-center">
                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                        <Users className="w-10 h-10 opacity-30" />
                    </div>
                    <p className="text-lg font-medium text-muted-foreground">{LT.comparisonView.readyTitle}</p>
                    <p className="max-w-xs mx-auto mt-2">{LT.comparisonView.readyBody}</p>
                </div>
            )}
        </motion.div>
    );
};

export default ComparisonView;
