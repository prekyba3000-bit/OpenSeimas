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
                    ${open ? 'bg-blue-500/10 border-blue-500' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'}
                `}
            >
                {selectedMp ? (
                    <>
                        <img src={selectedMp.photo_url} alt="" className="w-10 h-10 rounded-full object-cover bg-gray-800 ring-2 ring-black/40" />
                        <div className="flex flex-col flex-1">
                            <span className="text-sm font-bold text-white">{selectedMp.name}</span>
                            <span className="text-xs text-gray-400">{selectedMp.party}</span>
                        </div>
                        <Check className="w-4 h-4 text-blue-500" />
                    </>
                ) : (
                    <>
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                            <Users className="w-5 h-5 text-gray-500" />
                        </div>
                        <span className="text-gray-400 text-sm flex-1">{placeholder}</span>
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
                            className="absolute z-50 mt-2 w-full bg-[#1a1a1e] border border-white/10 rounded-xl shadow-2xl max-h-80 overflow-auto custom-scrollbar"
                        >
                            <div className="sticky top-0 bg-[#1a1a1e] p-2 border-b border-white/5">
                                <input
                                    type="text"
                                    placeholder={LT.comparisonView.searchMp}
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full p-2 bg-black/20 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    autoFocus
                                />
                            </div>

                            {filtered.map((mp) => (
                                <div
                                    key={mp.id}
                                    onClick={() => { onSelect(mp.id); setOpen(false); setSearch(''); }}
                                    className="p-3 flex items-center gap-3 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5 last:border-0"
                                >
                                    <img src={mp.photo_url} alt="" className="w-8 h-8 rounded-full object-cover bg-gray-700" />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-200">{mp.name}</span>
                                        <span className="text-xs text-gray-500">{mp.party}</span>
                                    </div>
                                </div>
                            ))}
                            {filtered.length === 0 && (
                                <div className="p-4 text-center text-xs text-gray-500">{LT.comparisonView.noResults}</div>
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
    const color = percentage >= 80 ? 'text-green-400' : percentage >= 50 ? 'text-secondary' : 'text-red-400';
    const ringColor = percentage >= 80 ? 'border-green-500' : percentage >= 50 ? 'border-border' : 'border-red-500';

    return (
        <div className="flex flex-col items-center gap-4 py-8">
            <div className={`relative w-40 h-40 rounded-full border-8 ${ringColor} border-opacity-20 flex items-center justify-center`}>
                <div className={`absolute inset-0 rounded-full border-8 ${ringColor} border-t-transparent animate-spin-slow opacity-50`} />
                <span className={`text-5xl font-bold ${color}`}>{percentage}%</span>
            </div>
            <span className="text-sm text-gray-400 uppercase tracking-widest font-semibold">{label}</span>
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
            <header className="flex flex-col gap-2 border-b border-white/5 pb-8">
                <h1 className="text-3xl font-bold flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-xl">
                        <GitCompare className="w-8 h-8 text-blue-500" />
                    </div>
                    {LT.comparisonView.title}
                </h1>
                <p className="text-gray-400 ml-[4.5rem]">{LT.comparisonView.subtitle}</p>
            </header>

            {/* Selector Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center relative">
                <MpSelector
                    mps={mps.filter(m => m.id !== selected[1])}
                    selected={selected[0]}
                    onSelect={(v) => updateSelected(0, v)}
                    placeholder={LT.comparisonView.selectFirst}
                />

                <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-blue-500 rounded-full items-center justify-center z-10 shadow-lg shadow-blue-500/50 text-white font-bold text-xs ring-4 ring-[#0a0a0c]">
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
                    <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mb-6" />
                    <span className="text-gray-400 animate-pulse">{LT.comparisonView.running}</span>
                </Card>
            )}

            {/* Error State */}
            {error && (
                <ProblemDetailsNotice
                    error={error}
                    className="p-4 border border-red-500/30 bg-red-500/10 rounded-xl flex items-center gap-3 text-red-400"
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
                        <div aria-live="polite" aria-atomic="true" className="text-center text-xs text-gray-500 -mb-2">
                            {LT.comparisonView.updating}
                        </div>
                    )}
                    {completeAnnouncement && (
                        <div role="status" aria-live="assertive" className="sr-only">
                            {completeAnnouncement}
                        </div>
                    )}
                    <Card className="text-center overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-secondary to-green-500" />
                        <AlignmentScore
                            score={comparison.alignment_matrix[0][1]}
                                label={LT.comparisonView.scoreLabel}
                        />
                        <p className="text-sm text-gray-500 pb-8 max-w-md mx-auto">
                            {LT.comparisonView.scoreBody}
                        </p>
                    </Card>

                    {comparison.divergent_votes.length > 0 && (
                        <Card className="p-0 overflow-hidden">
                            <div className="p-6 border-b border-white/5 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-purple-400" />
                                <h3 className="font-semibold text-white">{LT.comparisonView.divergences}</h3>
                            </div>

                            <div className="divide-y divide-white/5">
                                {comparison.divergent_votes.slice(0, 10).map((vote: any) => (
                                    <div key={vote.vote_id} className="p-6 hover:bg-white/5 transition-colors">
                                        <div className="text-base font-medium mb-4 pr-12">{vote.title}</div>

                                        <div className="grid grid-cols-2 gap-4">
                                            {comparison.mps.map((mp: any) => (
                                                <div key={mp.id} className="flex flex-col gap-1">
                                                    <span className="text-xs text-gray-500 uppercase">{mp.name.split(' ').slice(-1)[0]}</span>
                                                    <span className={`text-sm font-bold ${vote.votes[mp.id] === 'Už' ? 'text-green-400' :
                                                        vote.votes[mp.id] === 'Prieš' ? 'text-red-400' :
                                                            'text-secondary'
                                                        }`}>
                                                        {vote.votes[mp.id]}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-xs text-gray-500">
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
                <div className="p-20 text-center text-gray-500 flex flex-col items-center">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                        <Users className="w-10 h-10 opacity-30" />
                    </div>
                    <p className="text-lg font-medium text-gray-400">{LT.comparisonView.readyTitle}</p>
                    <p className="max-w-xs mx-auto mt-2">{LT.comparisonView.readyBody}</p>
                </div>
            )}
        </motion.div>
    );
};

export default ComparisonView;
