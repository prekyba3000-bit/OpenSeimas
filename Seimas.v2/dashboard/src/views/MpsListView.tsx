import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Search, ChevronRight, ArrowUpDown } from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../services/api';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { MpCard } from '../components/MpCard';
import { sortMps, SORT_OPTIONS, SortOption } from '../utils/sorting';
import { SEIMAS_SEATS_TOTAL } from '../utils/mpCounts';
import { ConstituencyPicker } from '../components/ConstituencyPicker';
import { ConnectingNotice, ConnectionError, isConnectionProblem } from '../components/ConnectionState';
import { filterRoster } from '../utils/rosterSearch';

const MpsListView = () => {
    const rosterQuery = useQuery({
        queryKey: ['mps', 'roster'],
        queryFn: () => api.getMps(),
    });
    // The district picker needs every member, not only the sitting ones: a
    // district whose member left and was not replaced still exists, and its
    // reader deserves to be told the seat is vacant rather than find their
    // district absent. Nalšios šiaurinė (Nr. 52) is that case today.
    const allMpsQuery = useQuery({
        queryKey: ['mps', 'roster', 'all'],
        queryFn: () => api.getMps('all'),
    });
    const {
        data: mps = [],
        isLoading: loading,
        refetch: refetchRoster,
    } = rosterQuery;
    // Failed, or offline-paused with no data: nothing to browse, show the
    // connection screen with a retry.
    const rosterUnavailable = isConnectionProblem(rosterQuery);

    const [search, setSearch] = useState('');
    const [partyFilter, setPartyFilter] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<SortOption>('name_asc');

    const processedMps = useMemo(() => {
        // No active-filter here: the roster query asks the API for
        // ?status=active, so membership is decided once, server-side, from the
        // mandate dates. Search filters that same roster, so a searched member
        // shows the figures the list shows.
        const filtered = filterRoster(mps, search)
            .filter(mp => !partyFilter || mp.party === partyFilter);
        return sortMps(filtered, sortBy);
    }, [mps, search, partyFilter, sortBy]);

    const handleMpClick = (mpId: string) => {
        window.location.href = `#/dashboard/mps/${mpId}`;
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-8"
        >
            {/* Header */}
            <div className="flex flex-col md:flex-row items-end md:items-center justify-between gap-4">
                <div>
                    <h2
                        className="text-3xl font-bold flex items-center gap-3 mb-2"
                        style={{ color: 'hsl(var(--foreground))' }}
                    >
                        <Users className="w-8 h-8" style={{ color: 'var(--primary-500)' }} />
                        Seimo nariai
                    </h2>
                    <p style={{ color: 'hsl(var(--muted-foreground))' }}>
                        Šiuo metu mandatą turintys nariai
                    </p>
                </div>
                <div
                    className="px-4 py-2 rounded-lg text-sm font-medium border"
                    style={{
                        backgroundColor: 'hsl(var(--muted))',
                        borderColor: 'hsl(var(--border))',
                    }}
                >
                    {/* "N iš 141 vietų", not a bare count: the list holds the
                        members with a mandate today, and the Seimas is a
                        141-seat body whether or not every seat is filled. */}
                    <span style={{ color: 'hsl(var(--foreground))' }}>{processedMps.length}</span>
                    <span className="ml-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        iš {SEIMAS_SEATS_TOTAL} vietų
                    </span>
                </div>
            </div>

            {/* Before the browse-everyone controls: most readers want one
                member — theirs — and this is the shortest path to them. */}
            <ConstituencyPicker
                mps={allMpsQuery.data ?? []}
                onSelect={(mp) => handleMpClick(mp.id)}
            />

            {/* Smart Search & Filter Bar */}
            <Card className="p-4" style={{ backgroundColor: 'hsl(var(--muted))' }}>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative group flex-1">
                        <Search
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors"
                            style={{ color: 'hsl(var(--muted-foreground))' }}
                        />
                        <input
                            type="text"
                            placeholder="Ieškoti pagal vardą ar frakciją..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-1 transition-all"
                            style={{
                                backgroundColor: 'hsl(var(--card))',
                                borderColor: 'hsl(var(--border))',
                                color: 'hsl(var(--foreground))',
                            }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--primary-500)'; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = 'hsl(var(--border))'; }}
                        />
                    </div>

                    <div className="relative min-w-[200px]">
                        <ArrowUpDown
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
                            style={{ color: 'hsl(var(--muted-foreground))' }}
                        />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            className="w-full pl-11 pr-8 py-3 border rounded-xl text-sm appearance-none focus:outline-none focus:ring-1 transition-all cursor-pointer"
                            style={{
                                backgroundColor: 'hsl(var(--card))',
                                borderColor: 'hsl(var(--border))',
                                color: 'hsl(var(--foreground))',
                            }}
                        >
                            {SORT_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        <ChevronRight
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rotate-90 pointer-events-none"
                            style={{ color: 'hsl(var(--muted-foreground))' }}
                        />
                    </div>
                </div>

                {(search || partyFilter) && (
                    <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            Filtrai aktyvūs
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setSearch(''); setPartyFilter(null); }}
                        >
                            Clear
                        </Button>
                    </div>
                )}
            </Card>

            {/* The roster is the primary load. When it fails or the device is
                offline, show the connection screen with a retry — not a small
                inline notice — because there is nothing else to show. */}
            {rosterUnavailable ? (
                <ConnectionError onRetry={() => refetchRoster()} />
            ) : (
                <>
                    {loading ? (
                        <ConnectingNotice />
                    ) : (
                        <>
                            {/* MPs Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {processedMps.map(mp => (
                                    <MpCard
                                        key={mp.id}
                                        mp={mp}
                                        to={`/dashboard/mps/${mp.id}`}
                                    />
                                ))}
                            </div>

                            {/* Empty State */}
                            {processedMps.length === 0 && (
                        <div
                            className="text-center py-20 flex flex-col items-center gap-4"
                            style={{ color: 'hsl(var(--muted-foreground))' }}
                        >
                            <Users className="w-12 h-12 opacity-20" />
                            <p>Pagal šiuos kriterijus Seimo narių nerasta</p>
                            <Button variant="ghost" onClick={() => { setSearch(''); setPartyFilter(null); }}>
                                Išvalyti filtrus
                            </Button>
                        </div>
                            )}
                        </>
                    )}
                </>
            )}
        </motion.div>
    );
};

export default MpsListView;
