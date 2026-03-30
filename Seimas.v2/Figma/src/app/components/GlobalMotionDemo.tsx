import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { MpProfileView } from './MpProfileView';
import { DashboardView } from './DashboardView';
import { GlitchTransition } from './GlitchTransition';
import { Badge } from './ui/badge';
import { LayoutDashboard, User } from 'lucide-react';

export function GlobalMotionDemo() {
  const [view, setView] = useState<'profile' | 'dashboard'>('profile');

  return (
    <Card className="bg-gray-900 border-gray-800 overflow-hidden">
       <CardHeader className="flex flex-row items-center justify-between z-10 relative bg-gray-900/50 backdrop-blur-sm border-b border-white/5">
          <div>
            <CardTitle className="text-2xl text-white">Global Motion System</CardTitle>
            <p className="text-sm text-gray-400">
                Interactive demonstration of "The Glitch Wipe" transition and "The Scramble" data loading.
            </p>
          </div>
          <div className="flex gap-2 bg-black/40 p-1 rounded-lg border border-white/5">
              <Button 
                variant={view === 'dashboard' ? 'secondary' : 'ghost'} 
                size="sm"
                onClick={() => setView('dashboard')}
                className="gap-2"
              >
                 <LayoutDashboard size={14} /> Dashboard
              </Button>
              <Button 
                variant={view === 'profile' ? 'secondary' : 'ghost'} 
                size="sm"
                onClick={() => setView('profile')}
                className="gap-2"
              >
                 <User size={14} /> Profile
              </Button>
          </div>
       </CardHeader>
       <CardContent className="p-0 h-[800px] relative bg-black/80">
          <GlitchTransition itemKey={view} className="h-full">
              {view === 'profile' ? (
                  <div className="h-full overflow-y-auto bg-[#0a0a0c]">
                     <MpProfileView onBack={() => setView('dashboard')} />
                  </div>
              ) : (
                  <div className="h-full overflow-y-auto bg-gray-950 p-8">
                     {/* Dashboard View Wrapper */}
                     <div className="max-w-7xl mx-auto">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-3xl font-bold text-white">Executive Dashboard</h2>
                            <Badge variant="outline" className="text-green-400 border-green-500/30">Live System</Badge>
                        </div>
                        <DashboardView variant="desktop" />
                     </div>
                  </div>
              )}
          </GlitchTransition>
       </CardContent>
    </Card>
  );
}
