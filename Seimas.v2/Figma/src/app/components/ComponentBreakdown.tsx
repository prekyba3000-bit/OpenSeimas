import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { StatCard } from './StatCard';
import { ActivityItem } from './ActivityItem';
import { Users, FileText } from 'lucide-react';

export function ComponentBreakdown() {
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-2xl text-white">Component Breakdown</CardTitle>
        <p className="text-sm text-gray-400">
          Atomic design structure of the Dashboard Master Layout
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-8">
          {/* Atoms & Molecules */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Atoms & Molecules</h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-gray-800/30 rounded-lg border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-white">StatCard</h4>
                    <Badge variant="outline" className="text-xs">Molecule</Badge>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">
                    Statistics card with icon, title, value, and optional trend indicator
                  </p>
                  <div className="scale-75 origin-left">
                    <StatCard
                      title="Example Stat"
                      value="141"
                      icon={Users}
                      trend="+12%"
                    />
                  </div>
                </div>

                <div className="p-4 bg-gray-800/30 rounded-lg border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-white">ActivityItem</h4>
                    <Badge variant="outline" className="text-xs">Molecule</Badge>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">
                    Activity row with icon, title, description, and timestamp
                  </p>
                  <div className="scale-90 origin-left">
                    <ActivityItem
                      icon={FileText}
                      title="Sample Activity"
                      description="Example description text"
                      time="5m ago"
                      iconColor="text-blue-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Organisms */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Organisms & Templates</h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-gray-800/30 rounded-lg border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-white">ActivityFeed</h4>
                    <Badge variant="outline" className="text-xs">Organism</Badge>
                  </div>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>• Card container with header</li>
                    <li>• Multiple ActivityItem components</li>
                    <li>• "View All" action button</li>
                    <li>• Glass effect background</li>
                  </ul>
                </div>

                <div className="p-4 bg-gray-800/30 rounded-lg border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-white">SystemStatus</h4>
                    <Badge variant="outline" className="text-xs">Organism</Badge>
                  </div>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>• Health percentage display</li>
                    <li>• Animated progress bar</li>
                    <li>• Terminal-style log display</li>
                    <li>• Status icons (OK/Warning/Error)</li>
                  </ul>
                </div>

                <div className="p-4 bg-gray-800/30 rounded-lg border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-white">DashboardView</h4>
                    <Badge variant="outline" className="text-xs">Template</Badge>
                  </div>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>• 4-column stats grid (desktop)</li>
                    <li>• 2:1 main content layout</li>
                    <li>• Responsive transformations</li>
                    <li>• 1440px max-width container</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Layout Specifications */}
        <div className="mt-8 p-6 bg-gray-950 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Layout Grid Specifications</h3>
          <div className="grid md:grid-cols-3 gap-6 text-xs">
            <div>
              <h4 className="text-white font-semibold mb-2">Desktop (1440px)</h4>
              <ul className="text-gray-400 space-y-1">
                <li>• Columns: 12</li>
                <li>• Gutter: 24px</li>
                <li>• Margin: 80px horizontal</li>
                <li>• Padding: 40px vertical</li>
                <li>• Gap: 48px between sections</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">Mobile (375px)</h4>
              <ul className="text-gray-400 space-y-1">
                <li>• Single column layout</li>
                <li>• Padding: 16px horizontal</li>
                <li>• Padding: 24px vertical</li>
                <li>• Gap: 24px between sections</li>
                <li>• Full-width components</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">Grid Logic</h4>
              <ul className="text-gray-400 space-y-1">
                <li>• Stats: grid-cols-4 → grid-cols-1</li>
                <li>• Content: grid-cols-3 → grid-cols-1</li>
                <li>• Feed: col-span-2 (66%)</li>
                <li>• Status: col-span-1 (33%)</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
