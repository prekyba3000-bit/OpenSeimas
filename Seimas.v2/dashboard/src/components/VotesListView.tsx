import React, { useState, useEffect } from 'react';
import { SearchInput } from './SearchInput';
import { VoteListCard } from './VoteListCard';
import { Filter, FileText, Download, Calendar } from 'lucide-react';

interface VoteData {
  id: string;
  title: string;
  date: string;
  status: string;
  resultType: 'Accepted' | 'Rejected' | 'Other';
}

const allVotes: VoteData[] = [
  {
    id: '1',
    title: 'Sveikatos draudimo įstatymo Nr. I-1343 2, 9, 15, 30 straipsnių pakeitimo įstatymo projektas',
    date: '2026-02-01',
    status: 'Priimta',
    resultType: 'Accepted',
  },
  {
    id: '2',
    title: 'Švietimo įstatymo Nr. I-1489 5, 14, 21, 29, 30, 34 ir 36 straipsnių pakeitimo įstatymas',
    date: '2026-01-28',
    status: 'Priimta',
    resultType: 'Accepted',
  },
  {
    id: '3',
    title: 'Pelno mokesčio įstatymo Nr. IX-675 2, 4, 12, 30 straipsnių pakeitimo ir papildymo įstatymas',
    date: '2026-01-25',
    status: 'Nepriimta',
    resultType: 'Rejected',
  },
  {
    id: '4',
    title: 'Aplinkos apsaugos įstatymo Nr. I-2223 1, 6, 7, 32 straipsnių pakeitimo įstatymas',
    date: '2026-01-20',
    status: 'Priimta',
    resultType: 'Accepted',
  },
  {
    id: '5',
    title: 'Elektroninių ryšių įstatymo Nr. IX-2135 pakeitimo įstatymo projektas',
    date: '2026-01-15',
    status: 'Atidėta',
    resultType: 'Other',
  },
];

interface VotesListViewProps {
  onVoteClick?: (voteId: string) => void;
}

export function VotesListView({ onVoteClick }: VotesListViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredVotes, setFilteredVotes] = useState<VoteData[]>(allVotes);
  const [isFiltering, setIsFiltering] = useState(false);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredVotes(allVotes);
      setIsFiltering(false);
      return;
    }

    setIsFiltering(true);

    const timer = setTimeout(() => {
      const filtered = allVotes.filter(vote =>
        vote.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vote.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vote.date.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredVotes(filtered);
      setIsFiltering(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Balsavimų Registras</h1>
          <p className="text-sm font-medium text-muted-foreground">
            Išsamus Seimo plenarinių posėdžių balsavimo rezultatų ir istorijos archyvas.
          </p>
        </div>
        <div className="flex items-center gap-3">
             <button className="flex items-center gap-2 px-3 py-2 bg-card border border-input rounded-lg text-sm font-semibold text-foreground hover:bg-accent hover:text-accent-foreground transition-colors shadow-sm">
                <Calendar size={16} />
                <span>Data</span>
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-card border border-input rounded-lg text-sm font-semibold text-foreground hover:bg-accent hover:text-accent-foreground transition-colors shadow-sm">
                <Download size={16} />
                <span>Ataskaita</span>
            </button>
            <span className="ml-2 px-3 py-1 rounded bg-muted text-xs font-bold text-muted-foreground uppercase tracking-wider border border-border">
                {filteredVotes.length} Įrašai
            </span>
        </div>
      </div>

      {/* Search Bar Area */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 bg-card p-1 rounded-lg border border-input shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
            <SearchInput
                placeholder="Ieškoti pagal teisės akto pavadinimą, numerį ar datą..."
                value={searchQuery}
                onChange={setSearchQuery}
                onClear={() => setSearchQuery('')}
            />
        </div>
        <button className="hidden md:flex items-center justify-center w-12 rounded-lg border border-input bg-card text-muted-foreground hover:text-primary hover:border-primary transition-colors">
            <Filter size={18} />
        </button>
      </div>

      {/* Filter Status Indicator */}
      {isFiltering && (
        <div className="flex items-center gap-2 text-xs font-semibold text-primary pl-1">
          <div className="w-2 h-2 rounded-full bg-primary"></div>
          <span>Atnaujinamas sąrašas...</span>
        </div>
      )}

      {/* Vote List */}
      <div className="space-y-3">
        {filteredVotes.length > 0 ? (
          filteredVotes.map((vote, index) => (
            <div
              key={vote.id}
              className="animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <VoteListCard
                title={vote.title}
                date={vote.date}
                status={vote.status}
                resultType={vote.resultType}
                onClick={() => onVoteClick?.(vote.id)}
              />
            </div>
          ))
        ) : (
          <div className="text-center py-20 bg-muted/20 border border-dashed border-border rounded-xl">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-muted border border-border flex items-center justify-center">
              <FileText className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">Rezultatų nerasta</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Pagal jūsų užklausą balsavimų nerasta. Pabandykite pakeisti paieškos kriterijus.
            </p>
          </div>
        )}
      </div>

      {/* Pagination / Load More */}
      {filteredVotes.length > 0 && filteredVotes.length >= 8 && (
        <div className="flex justify-center pt-6">
          <button className="px-8 py-2.5 rounded-lg bg-card border border-input text-foreground hover:bg-accent hover:text-accent-foreground transition-colors text-sm font-semibold shadow-sm">
            Rodyti Daugiau Rezultatų
          </button>
        </div>
      )}
    </div>
  );
}