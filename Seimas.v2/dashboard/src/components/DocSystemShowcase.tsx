// ORPHANED(v4): not imported by any production route. Safe to delete in hygiene pass.
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { DocCard } from './DocCard';
import { Badge } from './ui/badge';
import { FileText } from 'lucide-react';

export function DocSystemShowcase() {
  return (
    <Card className="bg-[#0B0C0E] border-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl text-white flex items-center gap-3">
              <FileText className="text-blue-500" />
              Generated Documentation
            </CardTitle>
            <p className="text-sm text-gray-400">
              Live "Tech_Spec" documentation generated from component metadata
            </p>
          </div>
          <Badge variant="outline" className="border-blue-500/20 text-blue-400 bg-blue-500/10">
            System V2.0
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          
          {/* Data_Strip_Vote Spec */}
          <div className="space-y-4">
             <div className="text-xs uppercase tracking-widest text-gray-600 font-mono mb-2">Component ID: DS-01</div>
             <DocCard
                name="Data_Strip_Vote"
                type="Molecule"
                rarity="Common"
                color="#22C55E"
                props={[
                    { name: 'title', type: 'string', description: 'The bill or motion title' },
                    { name: 'outcome', type: "'PASSED' | 'FAILED' | ...", default: 'PASSED' },
                    { name: 'votesFor', type: 'number', description: 'Affirmative vote count' },
                    { name: 'votesAgainst', type: 'number', description: 'Negative vote count' },
                    { name: 'timestamp', type: 'string', description: 'Time of vote (HH:MM)' },
                ]}
                notes={[
                    'The "Outcome Edge" is a critical 4px indicator on the left border.',
                    'Uses "Geist Mono" for timestamps to ensure tabular alignment.',
                    'Falls back to "PASSED" config if outcome is undefined.',
                    'Hover state lightens background to #1C1D21.'
                ]}
            />
          </div>

          {/* Ticker_Tape Spec */}
          <div className="space-y-4">
             <div className="text-xs uppercase tracking-widest text-gray-600 font-mono mb-2">Component ID: TT-04</div>
             <DocCard
                name="Ticker_Tape"
                type="Organism"
                rarity="Legendary"
                color="#3B82F6"
                props={[
                    { name: 'items', type: 'TickerItem[]', description: 'Array of news items' },
                    { name: 'speed', type: 'number', default: '20', description: 'Scroll speed (seconds)' },
                    { name: 'direction', type: "'left' | 'right'", default: "'left'" },
                    { name: 'pauseOnHover', type: 'boolean', default: 'true' },
                ]}
                notes={[
                    'Implements infinite auto-scrolling using CSS animations.',
                    'Must handle variable width content gracefully.',
                    'Performance: Uses translate3d for hardware acceleration.',
                    'Z-Index: Must be lower than overlay navigation.'
                ]}
            />
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
