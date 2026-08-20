import React, { useState, useRef, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { FileText, Search, Calendar, CheckCircle, XCircle, AlertCircle, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { api, VoteSummary } from '../services/api';
import { flattenVotes, outcomesVary, VoteListItem } from '../utils/voteGrouping';
import { formatLtDateLong } from '../utils/ltDate';
import { ltPlural } from '../utils/ltPlural';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { ProblemDetailsNotice } from '../components/ProblemDetailsNotice';
import { LT } from '../i18n/lt';
import { cn } from '../components/ui/utils';
import { formatLtDateShort } from '../utils/ltDate';

const PAGE_SIZE = 50;

export const VoteCard = ({
    vote,
    onClick,
    base,
    suffix,
    clustered = false,
    showOutcome = true,
    showDate = true,
}: {
    vote: VoteSummary;
    onClick: () => void;
    /** The wordy opening. Clamped to two lines. Empty on a clustered row,
     *  where the opening is already stated once in the header above. */
    base?: string;
    /** The identifier. Rendered on its own line and never clamped — it is the
     *  only thing telling two otherwise identical rows apart. */
    suffix?: string | null;
    clustered?: boolean;
    /** Off when every row in the list carries the same outcome: a badge that
     *  never differs costs a glance and discriminates nothing. */
    showOutcome?: boolean;
    /** Off inside a date-grouped list, where the header already said the date. */
    showDate?: boolean;
}) => {
    const getResultIcon = (result: string | null) => {
        if (!result) return <AlertCircle className="w-5 h-5 text-primary" />;
        const r = result.toLowerCase();
        if (r.includes('priimta') || r.includes('pritarta')) return <CheckCircle className="w-5 h-5 text-vote-for" />;
        if (r.includes('nepriimta') || r.includes('atmesta')) return <XCircle className="w-5 h-5 text-destructive" />;
        return <AlertCircle className="w-5 h-5 text-primary" />;
    };

    return (
        <Card
            hover
            onClick={onClick}
            className={cn(
                'cursor-pointer group border-l-4 border-l-transparent hover:border-l-primary p-5',
                clustered && 'ml-4 sm:ml-8',
            )}
        >
            <div className="flex items-start gap-4">
                <div className="mt-1">{getResultIcon(vote.result)}</div>
                <div className="flex-1 min-w-0">
                    {(showDate || (showOutcome && vote.result)) && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                            {showDate && (
                                <>
                                    <Calendar className="w-3 h-3" aria-hidden />
                                    {formatLtDateShort(vote.date) ?? vote.date}
                                </>
                            )}
                            {showOutcome && vote.result && (
                                <>
                                    {showDate && <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />}
                                    <span className="text-xs font-semibold text-muted-foreground">
                                        {vote.result}
                                    </span>
                                </>
                            )}
                        </div>
                    )}
                    {/* The clamp applies to the opening only. The identifier
                        gets its own line and is never clamped: it was being
                        cut mid-token („…projektas (Nr. XVP-17“), which removed
                        the one part of the row a reader needs. */}
                    {base ? (
                        <h3 className="text-base font-semibold text-card-foreground group-hover:text-primary transition-colors leading-relaxed line-clamp-2">
                            {base}
                        </h3>
                    ) : null}
                    {suffix && (
                        <p
                            className={cn(
                                'font-mono text-sm text-muted-foreground',
                                base ? 'mt-1' : 'text-card-foreground',
                            )}
                        >
                            {suffix}
                        </p>
                    )}
                    {!base && !suffix && (
                        <h3 className="text-base font-semibold text-card-foreground line-clamp-2">
                            {vote.title}
                        </h3>
                    )}
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors self-center shrink-0" />
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

    const filtered = useMemo(
        () => votes.filter(v => v.title.toLowerCase().includes(search.toLowerCase())),
        [votes, search],
    );

    // Date headers and cluster headers are rows in the same virtual list, so
    // they scroll with the votes they head instead of floating above them.
    const items: VoteListItem[] = useMemo(() => flattenVotes(filtered), [filtered]);
    const showOutcome = useMemo(() => outcomesVary(filtered), [filtered]);

    const virtualizer = useVirtualizer({
        count: items.length,
        getScrollElement: () => listParentRef.current,
        estimateSize: (i) => (items[i]?.kind === 'vote' ? VOTE_ROW_ESTIMATE_PX : 48),
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
                        <FileText className="w-8 h-8 text-primary" />
                        {LT.votesView.title}
                    </h2>
                    <p className="text-muted-foreground">{LT.votesView.subtitle}</p>
                </div>

                <div className="px-4 py-2 bg-muted rounded-lg text-sm font-medium border border-border">
                    <span className="text-foreground">{filtered.length}</span>
                    <span className="text-muted-foreground ml-1">{LT.votesView.results}</span>
                </div>
            </div>

            {/* Search */}
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                    type="text"
                    placeholder={LT.votesView.searchPlaceholder}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-xl border border-input bg-card text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground"
                />
            </div>

            {/* Error State */}
            {error && (
                <ProblemDetailsNotice error={error} className="p-4 border border-destructive/30 bg-destructive/10 rounded-xl flex items-center gap-3 text-destructive" />
            )}

            {/* List */}
            {loading ? (
                <Card className="p-20 text-center text-muted-foreground flex flex-col items-center">
                    <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mb-4" />
                    {LT.votesView.syncing}
                </Card>
            ) : (
                <div className="flex flex-col gap-3">
                    {filtered.length === 0 && !error ? (
                        <div className="text-center py-20 text-muted-foreground flex flex-col items-center gap-4">
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
                                    const item = items[vi.index];
                                    if (!item) return null;
                                    return (
                                        <div
                                            key={item.key}
                                            role="row"
                                            aria-rowindex={vi.index + 1}
                                            className="absolute top-0 left-0 w-full pb-3"
                                            style={{ transform: `translateY(${vi.start}px)` }}
                                            data-index={vi.index}
                                            ref={virtualizer.measureElement}
                                        >
                                            <div role="gridcell" className="w-full">
                                                {item.kind === 'date' && (
                                                    <h2 className="pt-4 pb-1 text-base font-semibold text-foreground">
                                                        {formatLtDateLong(item.date) ?? item.date}
                                                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                                                            {item.count}{' '}
                                                            {ltPlural(item.count, 'balsavimas', 'balsavimai', 'balsavimų')}
                                                        </span>
                                                    </h2>
                                                )}
                                                {item.kind === 'cluster' && (
                                                    <p className="pt-2 pb-1 pl-4 sm:pl-8 text-sm text-muted-foreground">
                                                        {item.base}
                                                        <span className="ml-2">
                                                            — {item.count}{' '}
                                                            {ltPlural(item.count, 'balsavimas', 'balsavimai', 'balsavimų')}
                                                        </span>
                                                    </p>
                                                )}
                                                {item.kind === 'vote' && (
                                                    <VoteCard
                                                        vote={item.vote}
                                                        base={item.base}
                                                        suffix={item.suffix}
                                                        clustered={item.clustered}
                                                        showOutcome={showOutcome}
                                                        showDate={false}
                                                        onClick={() => handleVoteClick(item.vote.id)}
                                                    />
                                                )}
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
