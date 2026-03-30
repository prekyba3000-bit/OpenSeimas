import React, { useState, useEffect, useMemo } from 'react';
import { Users, Search, ChevronRight, ArrowUpDown, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import { api, MpSummary } from '../services/api';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { MpCard } from '../components/MpCard';
import { sortMps, SORT_OPTIONS, SortOption } from '../utils/sorting';

const MpsListView = () => {
    const [mps, setMps] = useState<MpSummary[]>([]);
    const [search, setSearch] = useState('');
    const [partyFilter, setPartyFilter] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<SortOption>('name_asc');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.getMps()
            .then(data => setMps(data))
            .catch(err => {
                console.error('Failed to load MPs', err);
                setError('Failed to load MP data. Please try again.');
            })
            .finally(() => setLoading(false));
    }, []);

    const processedMps = useMemo(() => {
        const filtered = mps.filter(mp => {
            const matchesSearch = (mp.name || '').toLowerCase().includes(search.toLowerCase());
            const matchesParty = !partyFilter || mp.party === partyFilter;
            const isActive = mp.is_active !== false;
            return matchesSearch && matchesParty && isActive;
        });
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
                        style={{ color: 'var(--text-primary)' }}
                    >
                        <Users className="w-8 h-8" style={{ color: 'var(--primary-500)' }} />
                        Seimas Members
                    </h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Current term representatives</p>
                </div>
                <div
                    className="px-4 py-2 rounded-lg text-sm font-medium border"
                    style={{
                        backgroundColor: 'var(--background-elevated)',
                        borderColor: 'var(--glass-border)',
                    }}
                >
                    <span style={{ color: 'var(--text-primary)' }}>{processedMps.length}</span>
                    <span className="ml-1" style={{ color: 'var(--text-secondary)' }}>members</span>
                </div>
            </div>

            {/* Smart Search & Filter Bar */}
            <Card className="p-4" style={{ backgroundColor: 'var(--background-elevated)' }}>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative group flex-1">
                        <Search
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors"
                            style={{ color: 'var(--text-secondary)' }}
                        />
                        <input
                            type="text"
                            placeholder="Search by name or party..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-1 transition-all"
                            style={{
                                backgroundColor: 'var(--background-surface)',
                                borderColor: 'var(--glass-border)',
                                color: 'var(--text-primary)',
                            }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--primary-500)'; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; }}
                        />
                    </div>

                    <div className="relative min-w-[200px]">
                        <ArrowUpDown
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
                            style={{ color: 'var(--text-secondary)' }}
                        />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            className="w-full pl-11 pr-8 py-3 border rounded-xl text-sm appearance-none focus:outline-none focus:ring-1 transition-all cursor-pointer"
                            style={{
                                backgroundColor: 'var(--background-surface)',
                                borderColor: 'var(--glass-border)',
                                color: 'var(--text-primary)',
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
                            style={{ color: 'var(--text-secondary)' }}
                        />
                    </div>
                </div>

                {(search || partyFilter) && (
                    <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            Filters active
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

            {/* Error State */}
            {error && (
                <div className="p-4 border rounded-xl flex items-center gap-3" style={{ borderColor: 'var(--status-danger)', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-danger)' }}>
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    {error}
                </div>
            )}

            {/* Loading State */}
            {loading ? (
                <div
                    className="p-20 text-center flex flex-col items-center"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    <div
                        className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mb-4"
                        style={{
                            borderColor: 'var(--primary-500)',
                            borderTopColor: 'transparent',
                        }}
                    />
                    Loading MP roster...
                </div>
            ) : !error && (
                <>
                    {/* MPs Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {processedMps.map(mp => (
                            <MpCard
                                key={mp.id}
                                mp={mp}
                                onClick={() => handleMpClick(mp.id)}
                            />
                        ))}
                    </div>

                    {/* Empty State */}
                    {processedMps.length === 0 && (
                        <div
                            className="text-center py-20 flex flex-col items-center gap-4"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            <Users className="w-12 h-12 opacity-20" />
                            <p>No MPs found matching criteria</p>
                            <Button variant="ghost" onClick={() => { setSearch(''); setPartyFilter(null); }}>
                                Clear Filters
                            </Button>
                        </div>
                    )}
                </>
            )}
        </motion.div>
    );
};

export default MpsListView;
