import React, { useState, useRef, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { FileText, Search, Calendar, CheckCircle, XCircle, AlertCircle, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { api, VoteSummary } from '../services/api';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { ProblemDetailsNotice } from '../components/ProblemDetailsNotice';
import { LT } from '../i18n/lt';

const PAGE_SIZE = 50;

export const VoteCard = ({ vote, onClick }: { vote: VoteSummary; onClick: () => void }) => {
    const getResultIcon = (result: string | null) => {
        if (!result) return <AlertCircle className="w-5 h-5 text-primary" />;
        const r = result.toLowerCase();
        if (r.includes('priimta') || r.includes('pritarta')) return <CheckCircle className="w-5 h-5 text-green-500" />;
        if (r.includes('nepriimta') || r.includes('atmesta')) return <XCircle className="w-5 h-5 text-red-500" />;
        return <AlertCircle className="w-5 h-5 text-primary" />;
    };

    return (
        <Card
            hover
            onClick={onClick}
            className="cursor-pointer group border-l-4 border-l-transparent hover:border-l-blue-500 p-5"
        >
            <div className="flex items-start gap-4">
                <div className="mt-1">{getResultIcon(vote.result)}</div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-1.5">
                        <Calendar className="w-3 h-3" />
                        {vote.date}
                        {vote.result && (
                            <>
                                <span className="w-1 h-1 rounded-full bg-gray-700" />
                                <span className="uppercase tracking-wider text-[10px] font-semibold text-gray-500">
                                    {vote.result}
                                </span>
                            </>
                        )}
                    </div>
                    <h3 className="font-medium text-white group-hover:text-blue-400 transition-colors line-clamp-2 leading-relaxed">
                        {vote.title}
                    </h3>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-700 group-hover:text-blue-500 transition-colors self-center shrink-0" />
            </div>
        </Card>
    );
};

const VOTE_ROW_ESTIMATE_PX = 116;

const VotesListView = () => {
    const [search, setSearch] = useState('');
    const listParentRef = useRef<HTMLDivElement>(null);

    const {
        data,
        isLoading: loading,
        isFetchingNextPage: loadingMore,
        error,
        hasNextPage,
        fetchNextPage,
    } = useInfiniteQuery({
        queryKey: ['votes', 'list', PAGE_SIZE],
        initialPageParam: 0,
        queryFn: ({ pageParam }) => api.getVotes(PAGE_SIZE, pageParam as number),
        getNextPageParam: (lastPage, allPages) =>
            lastPage.length === PAGE_SIZE ? allPages.length * PAGE_SIZE : undefined,
    });

    const votes = useMemo(
        () => (data?.pages ?? []).flat() as VoteSummary[],
        [data?.pages],
    );

    const loadMore = () => {
        void fetchNextPage();
    };

    const filtered = votes.filter(v =>
        v.title.toLowerCase().includes(search.toLowerCase())
    );

    const virtualizer = useVirtualizer({
        count: filtered.length,
        getScrollElement: () => listParentRef.current,
        estimateSize: () => VOTE_ROW_ESTIMATE_PX,
        overscan: 8,
    });

    const handleVoteClick = (id: string) => {
        window.location.href = `#/dashboard/votes/${id}`;
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-6 max-w-5xl mx-auto"
        >
            {/* Header */}
            <div className="flex flex-col md:flex-row items-end md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold flex items-center gap-3 mb-2">
                        <FileText className="w-8 h-8 text-purple-500" />
                        {LT.votesView.title}
                    </h2>
                    <p className="text-gray-400">{LT.votesView.subtitle}</p>
                </div>

                <div className="px-4 py-2 bg-white/5 rounded-lg text-sm font-medium border border-white/5">
                    <span className="text-white">{filtered.length}</span>
                    <span className="text-gray-500 ml-1">{LT.votesView.results}</span>
                </div>
            </div>

            {/* Search */}
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-purple-500 transition-colors" />
                <input
                    type="text"
                    placeholder={LT.votesView.searchPlaceholder}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 glass rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-gray-600"
                />
            </div>

            {/* Error State */}
            {error && (
                <ProblemDetailsNotice error={error} className="p-4 border border-red-500/30 bg-red-500/10 rounded-xl flex items-center gap-3 text-red-400" />
            )}

            {/* List */}
            {loading ? (
                <Card className="p-20 text-center text-gray-400 flex flex-col items-center">
                    <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mb-4" />
                    {LT.votesView.syncing}
                </Card>
            ) : (
                <div className="flex flex-col gap-3">
                    {filtered.length === 0 && !error ? (
                        <div className="text-center py-20 text-gray-500 flex flex-col items-center gap-4">
                            <Search className="w-12 h-12 opacity-20" />
                            <p>{LT.votesView.noVotes} "{search}"</p>
                            <Button variant="ghost" onClick={() => setSearch('')}>{LT.votesView.clearSearch}</Button>
                        </div>
                    ) : (
                        <div
                            ref={listParentRef}
                            role="grid"
                            aria-rowcount={filtered.length}
                            aria-colcount={1}
                            className="max-h-[min(70vh,840px)] overflow-auto rounded-xl pr-1"
                            aria-label={LT.votesView.title}
                        >
                            <div
                                className="relative w-full"
                                style={{ height: `${virtualizer.getTotalSize()}px` }}
                                role="presentation"
                            >
                                {virtualizer.getVirtualItems().map((vi) => {
                                    const vote = filtered[vi.index];
                                    return (
                                        <div
                                            key={vote.id}
                                            role="row"
                                            aria-rowindex={vi.index + 1}
                                            className="absolute top-0 left-0 w-full pb-3"
                                            style={{ transform: `translateY(${vi.start}px)` }}
                                            data-index={vi.index}
                                            ref={virtualizer.measureElement}
                                        >
                                            <div role="gridcell" className="w-full">
                                                <VoteCard vote={vote} onClick={() => handleVoteClick(vote.id)} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {hasNextPage && !search && filtered.length > 0 && (
                        <div className="text-center pt-4">
                            <Button
                                variant="secondary"
                                onClick={loadMore}
                                disabled={loadingMore}
                            >
                                {loadingMore ? LT.votesView.loadingMore : LT.votesView.loadMore}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
};

export default VotesListView;
