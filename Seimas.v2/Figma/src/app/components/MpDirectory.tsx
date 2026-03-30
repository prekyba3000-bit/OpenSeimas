import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Search, Filter, ChevronRight, User } from 'lucide-react';
import { MOCK_MPS } from '../../services/mocks';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { cn } from './ui/utils';

export function MpDirectory() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParty, setSelectedParty] = useState<string>('All');

  // Extract unique parties for filter
  const parties = useMemo(() => {
    const allParties = MOCK_MPS.map(mp => mp.party);
    return ['All', ...Array.from(new Set(allParties))];
  }, []);

  // Filter MPs
  const filteredMPs = useMemo(() => {
    return MOCK_MPS.filter(mp => {
      const matchesSearch = mp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            mp.party.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesParty = selectedParty === 'All' || mp.party === selectedParty;
      return matchesSearch && matchesParty;
    });
  }, [searchQuery, selectedParty]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Seimo Nariai</h1>
          <p className="text-muted-foreground text-sm mt-1">Visų aktyvių Seimo narių sąrašas</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-card border border-border rounded-xl shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input 
            type="text" 
            placeholder="Ieškoti narių..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background border border-input rounded-lg py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        
        <div className="relative w-full sm:w-64">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <select 
            value={selectedParty}
            onChange={(e) => setSelectedParty(e.target.value)}
            className="w-full appearance-none bg-background border border-input rounded-lg py-2 pl-10 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            {parties.map(party => (
              <option key={party} value={party}>{party === 'All' ? 'Visos Frakcijos' : party}</option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground bg-muted/50 uppercase tracking-wider text-xs">
                <th className="px-6 py-4 font-medium">Seimo Narys</th>
                <th className="px-6 py-4 font-medium">Frakcija</th>
                <th className="px-6 py-4 font-medium text-right">Veiksmai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredMPs.length > 0 ? (
                filteredMPs.map((mp) => (
                  <tr 
                    key={mp.id} 
                    onClick={() => navigate(`/dashboard/mps/${mp.id}`)}
                    className="group hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-muted overflow-hidden border border-border flex-shrink-0">
                          <ImageWithFallback 
                            src={mp.photo_url} 
                            alt={mp.name} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div>
                          <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                            {mp.name}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">ID: {mp.seimas_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2.5 h-2.5 rounded-full ring-1 ring-border" 
                          style={{ backgroundColor: mp.party_color || '#94a3b8' }}
                        />
                        <span className="text-card-foreground">{mp.party}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ChevronRight className="inline-block text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1" size={16} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground">
                    Narių nerasta pagal paieškos kriterijus.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
