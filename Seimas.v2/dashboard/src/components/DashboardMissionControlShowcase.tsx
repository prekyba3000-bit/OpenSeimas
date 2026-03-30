import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { DashboardMissionControl } from './DashboardMissionControl';
import { Monitor } from 'lucide-react';

export function DashboardMissionControlShowcase() {
  return (
    <div className="space-y-8">
      {/* Component Overview */}
      <Card className="bg-[#141517] border-white/10">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl text-white">Layout: Dashboard_Mission_Control</CardTitle>
              <p className="text-sm text-gray-400 mt-2">
                Primary landing view with bento box grid, live command center aesthetic
              </p>
            </div>
            <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
              <Monitor className="w-3 h-3 mr-1" />
              HUD Layout
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Live Demo */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Live Dashboard - Full Screen View</h3>
            <div className="relative rounded-xl overflow-hidden border border-cyan-500/20" style={{ height: '800px' }}>
              <DashboardMissionControl />
            </div>
          </div>

          {/* Grid Architecture */}
          <div className="p-6 rounded-xl bg-black/40 border border-white/10">
            <h4 className="text-sm font-semibold text-white mb-4">Grid Architecture - Bento Box Layout</h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                  Layout Structure
                </h5>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex justify-between">
                    <span>Grid Type:</span>
                    <code className="text-gray-300 font-mono">CSS Grid (2×2)</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Gap:</span>
                    <code className="text-gray-300 font-mono">24px (gap-6)</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Container:</span>
                    <code className="text-gray-300 font-mono">100vh height</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Padding:</span>
                    <code className="text-gray-300 font-mono">24px (p-6)</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Background:</span>
                    <code className="text-gray-300 font-mono">#0B0C0E (Void)</code>
                  </li>
                </ul>
              </div>

              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                  Zone Distribution
                </h5>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex justify-between">
                    <span>Zone A (Top-Left):</span>
                    <code className="text-gray-300 font-mono">25% (1 cell)</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Zone B (Bottom-Left):</span>
                    <code className="text-gray-300 font-mono">25% (1 cell)</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Zone C (Right):</span>
                    <code className="text-gray-300 font-mono">50% (2 cells)</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Grid Config:</span>
                    <code className="text-gray-300 font-mono">grid-cols-2 grid-rows-2</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Zone C Span:</span>
                    <code className="text-gray-300 font-mono">row-span-2</code>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 bg-[#0B0C0E] rounded-lg">
              <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                Visual Grid Reference
              </h5>
              <div className="grid grid-cols-2 grid-rows-2 gap-4 h-48">
                <div className="bg-blue-500/10 border-2 border-blue-500/30 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-xs font-bold text-blue-400 font-mono">ZONE A</div>
                    <div className="text-[10px] text-gray-500">Ticker Tape</div>
                  </div>
                </div>
                <div className="bg-cyan-500/10 border-2 border-cyan-500/30 rounded-lg row-span-2 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-xs font-bold text-cyan-400 font-mono">ZONE C</div>
                    <div className="text-[10px] text-gray-500">The Map</div>
                    <div className="text-[10px] text-gray-600 mt-1">(50% - Double Height)</div>
                  </div>
                </div>
                <div className="bg-green-500/10 border-2 border-green-500/30 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-xs font-bold text-green-400 font-mono">ZONE B</div>
                    <div className="text-[10px] text-gray-500">Kill Feed</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Zone A: Live Metrics Ticker Tape */}
          <div className="p-6 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20">
            <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              Zone A: Live Metrics Ticker Tape
            </h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                  Component Structure
                </h5>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex justify-between">
                    <span>Base Component:</span>
                    <code className="text-gray-300 font-mono">TickerTape</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Layout:</span>
                    <code className="text-gray-300 font-mono">Horizontal Scroll</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Item Type:</span>
                    <code className="text-gray-300 font-mono">StatCard (Stripped)</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Background:</span>
                    <code className="text-gray-300 font-mono">Transparent</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Divider:</span>
                    <code className="text-gray-300 font-mono">Border-right White/10</code>
                  </li>
                </ul>
              </div>

              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                  Ticker Item Specs
                </h5>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex justify-between">
                    <span>Min Width:</span>
                    <code className="text-gray-300 font-mono">200px</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Padding:</span>
                    <code className="text-gray-300 font-mono">16px horizontal</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Icon Size:</span>
                    <code className="text-gray-300 font-mono">32px container</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Value Font:</span>
                    <code className="text-gray-300 font-mono">Mono, Bold, 20px</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Trend Indicator:</span>
                    <code className="text-gray-300 font-mono">↑/↓ with color</code>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 bg-black/40 rounded-lg">
              <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                Design Rationale
              </h5>
              <p className="text-sm text-gray-400">
                The ticker tape strips away decorative backgrounds from traditional StatCards, 
                presenting raw data streams in monospaced fonts. This creates a "command center terminal" 
                aesthetic where information flows continuously across the viewport. The horizontal scroll 
                allows for unlimited metrics without vertical space constraints.
              </p>
            </div>
          </div>

          {/* Zone B: Kill Feed */}
          <div className="p-6 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-600/10 border border-green-500/20">
            <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Zone B: Recent Events Kill Feed
            </h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                  Component Structure
                </h5>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex justify-between">
                    <span>Base Component:</span>
                    <code className="text-gray-300 font-mono">KillFeed</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Item Component:</span>
                    <code className="text-gray-300 font-mono">Data_Strip_Vote</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Layout:</span>
                    <code className="text-gray-300 font-mono">Vertical Scroll</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Max Items:</span>
                    <code className="text-gray-300 font-mono">8 visible</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Gap:</span>
                    <code className="text-gray-300 font-mono">8px (space-y-2)</code>
                  </li>
                </ul>
              </div>

              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                  Animation Details
                </h5>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex justify-between">
                    <span>Entry:</span>
                    <code className="text-gray-300 font-mono">Fade-in</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Stagger:</span>
                    <code className="text-gray-300 font-mono">50ms per item</code>
                  </li>
                  <li className="flex justify-between">
                    <span>New Item:</span>
                    <code className="text-gray-300 font-mono">Top insertion</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Old Item:</span>
                    <code className="text-gray-300 font-mono">Fade out bottom</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Update Rate:</span>
                    <code className="text-gray-300 font-mono">Real-time (live)</code>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 bg-black/40 rounded-lg">
              <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                Design Rationale
              </h5>
              <p className="text-sm text-gray-400">
                Inspired by esports "kill feeds," this component presents recent voting outcomes in 
                a compact, vertically-stacked format. New events enter from the top and push older 
                events down, creating a sense of continuous activity. The Data_Strip_Vote component 
                provides outcome indicators (PASSED/FAILED/DEFERRED) at a glance.
              </p>
            </div>
          </div>

          {/* Zone C: The Map */}
          <div className="p-6 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border border-cyan-500/20">
            <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-500" />
              Zone C: The Map - Seimas Chamber View
            </h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                  Map Structure
                </h5>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex justify-between">
                    <span>Base Component:</span>
                    <code className="text-gray-300 font-mono">SeatingMap</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Aspect Ratio:</span>
                    <code className="text-gray-300 font-mono">16:9</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Layout Type:</span>
                    <code className="text-gray-300 font-mono">Semicircular Seating</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Total Seats:</span>
                    <code className="text-gray-300 font-mono">141 (3 arcs)</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Background:</span>
                    <code className="text-gray-300 font-mono">Grid pattern</code>
                  </li>
                </ul>
              </div>

              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                  Hotspot System
                </h5>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex justify-between">
                    <span>High Activity:</span>
                    <code className="text-gray-300 font-mono">Red #EF4444</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Medium Activity:</span>
                    <code className="text-gray-300 font-mono">Amber #F59E0B</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Low Activity:</span>
                    <code className="text-gray-300 font-mono">Blue #3B82F6</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Animation:</span>
                    <code className="text-gray-300 font-mono">Pulsing ring</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Tooltip:</span>
                    <code className="text-gray-300 font-mono">On hover</code>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 bg-black/40 rounded-lg">
              <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                Design Rationale
              </h5>
              <p className="text-sm text-gray-400">
                The semicircular seating layout represents the actual Lithuanian Seimas chamber geometry. 
                Hotspots indicate areas of high debate activity, allowing operators to quickly identify 
                where attention is focused. The pulsing animation creates urgency for high-priority areas, 
                while the grid background reinforces the tactical command center aesthetic.
              </p>
            </div>
          </div>

          {/* Atmospheric Effects */}
          <div className="p-6 rounded-xl bg-black/40 border border-white/10">
            <h4 className="text-sm font-semibold text-white mb-4">Atmospheric Effects - HUD Aesthetics</h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                  Scanline Overlay
                </h5>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex justify-between">
                    <span>Pattern:</span>
                    <code className="text-gray-300 font-mono">Horizontal Lines</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Height:</span>
                    <code className="text-gray-300 font-mono">3px repeat</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Opacity:</span>
                    <code className="text-gray-300 font-mono">2% (White)</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Layer:</span>
                    <code className="text-gray-300 font-mono">Fixed overlay</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Purpose:</span>
                    <span className="text-gray-300">CRT monitor effect</span>
                  </li>
                </ul>
                
                <div className="mt-4 p-4 bg-[#0B0C0E] rounded-lg relative h-24 overflow-hidden">
                  <div 
                    className="absolute inset-0"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0px, transparent 1px, transparent 2px, rgba(255,255,255,0.02) 3px)',
                    }}
                  />
                  <div className="relative text-xs text-gray-500 font-mono">
                    Sample scanline effect
                  </div>
                </div>
              </div>

              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                  Corner Accents
                </h5>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex justify-between">
                    <span>Shape:</span>
                    <code className="text-gray-300 font-mono">L-brackets</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Size:</span>
                    <code className="text-gray-300 font-mono">16-20px</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Thickness:</span>
                    <code className="text-gray-300 font-mono">2px stroke</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Color:</span>
                    <code className="text-gray-300 font-mono">Blue-500/40</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Purpose:</span>
                    <span className="text-gray-300">HUD framing</span>
                  </li>
                </ul>
                
                <div className="mt-4 relative p-4 bg-[#0B0C0E] rounded-lg h-24 border border-white/10">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-500/40" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-500/40" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-500/40" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-500/40" />
                  <div className="text-xs text-gray-500 font-mono">
                    Corner accents example
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-[#0B0C0E] rounded-lg">
              <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                Implementation Notes
              </h5>
              <div className="space-y-2 text-sm text-gray-400">
                <p>
                  <strong className="text-gray-300">Scanlines:</strong> Applied globally as a fixed overlay 
                  using repeating linear gradients. The 2% opacity is subtle enough to not interfere with 
                  content readability while providing the vintage CRT aesthetic.
                </p>
                <p>
                  <strong className="text-gray-300">Corner Brackets:</strong> SVG-based components positioned 
                  absolutely at container corners. These create "targeting reticle" effects that reinforce 
                  the tactical/military HUD visual language.
                </p>
              </div>
            </div>
          </div>

          {/* Figma Component Setup */}
          <div className="p-6 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20">
            <h4 className="text-sm font-semibold text-white mb-4">
              Figma Layout Setup Instructions
            </h4>
            <div className="space-y-4">
              <div className="p-4 bg-black/40 rounded-lg">
                <h5 className="text-sm font-semibold text-white mb-2">Step 1: Create Master Frame</h5>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Name: "Dashboard_Mission_Control"</li>
                  <li>• Frame: 1440px × 1024px (Desktop HD)</li>
                  <li>• Fill: #0B0C0E (Void background)</li>
                  <li>• Padding: 24px all sides</li>
                  <li>• Layout: Auto-layout vertical</li>
                </ul>
              </div>

              <div className="p-4 bg-black/40 rounded-lg">
                <h5 className="text-sm font-semibold text-white mb-2">Step 2: Build Bento Grid</h5>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Create 3 container frames: Zone_A, Zone_B, Zone_C</li>
                  <li>• Use Layout Grid: 2 columns, 2 rows, 24px gutter</li>
                  <li>• Zone A: Top-left cell, background #141517</li>
                  <li>• Zone B: Bottom-left cell, background #141517</li>
                  <li>• Zone C: Full right column (span 2 rows), background #141517</li>
                  <li>• All zones: 12px radius, 1px stroke White/10</li>
                </ul>
              </div>

              <div className="p-4 bg-black/40 rounded-lg">
                <h5 className="text-sm font-semibold text-white mb-2">Step 3: Add Corner Accents</h5>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Create L-bracket component (16×16px)</li>
                  <li>• Use Vector tool: 2px stroke, Blue-500/40</li>
                  <li>• Instance at all 4 corners of each zone</li>
                  <li>• Position: Absolute, aligned to edges</li>
                  <li>• Zone C: Use 20×20px brackets for prominence</li>
                </ul>
              </div>

              <div className="p-4 bg-black/40 rounded-lg">
                <h5 className="text-sm font-semibold text-white mb-2">Step 4: Zone A - Ticker Tape</h5>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Insert header bar (Blue-400 title "Live Metrics")</li>
                  <li>• Create horizontal scrolling frame</li>
                  <li>• Insert 4+ instances of simplified StatCard</li>
                  <li>• Strip StatCard backgrounds (transparent)</li>
                  <li>• Add White/10 vertical dividers between cards</li>
                  <li>• Set fixed min-width 200px per card</li>
                </ul>
              </div>

              <div className="p-4 bg-black/40 rounded-lg">
                <h5 className="text-sm font-semibold text-white mb-2">Step 5: Zone B - Kill Feed</h5>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Insert header bar (Green-400 title "Recent Events")</li>
                  <li>• Create vertical scrolling frame (clip content)</li>
                  <li>• Insert 8 instances of Data_Strip_Vote (small)</li>
                  <li>• Set auto-layout: Vertical, 8px gap</li>
                  <li>• Apply staggered fade-in animation (After Delay)</li>
                </ul>
              </div>

              <div className="p-4 bg-black/40 rounded-lg">
                <h5 className="text-sm font-semibold text-white mb-2">Step 6: Zone C - The Map</h5>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Insert header bar (Cyan-400 title "Seimas Chamber")</li>
                  <li>• Create map frame (16:9 aspect ratio)</li>
                  <li>• Add grid pattern background (Blue-500/10, 40px)</li>
                  <li>• Draw semicircular seating with 3 arcs</li>
                  <li>• Add 141 seat dots (Blue-500/40, 2px radius)</li>
                  <li>• Place hotspot components (pulsing circles)</li>
                  <li>• Hotspot colors: Red (high), Amber (medium), Blue (low)</li>
                  <li>• Add status indicator (top-right, "LIVE" badge)</li>
                  <li>• Add legend (bottom-left, activity levels)</li>
                </ul>
              </div>

              <div className="p-4 bg-black/40 rounded-lg">
                <h5 className="text-sm font-semibold text-white mb-2">Step 7: Apply Atmospheric Effects</h5>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Create scanline overlay frame (full screen)</li>
                  <li>• Fill: Repeating linear gradient (White/2%, 3px repeat)</li>
                  <li>• Layer order: Above all content</li>
                  <li>• Pointer events: None (pass-through)</li>
                  <li>• Add system status bar (bottom, 32px height)</li>
                  <li>• Status bar: Black/80, White/10 top border</li>
                </ul>
              </div>

              <div className="p-4 bg-black/40 rounded-lg">
                <h5 className="text-sm font-semibold text-white mb-2">Step 8: Component Properties & Variants</h5>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• <strong>Boolean Property:</strong> "ShowScanlines" (default: true)</li>
                  <li>• <strong>Boolean Property:</strong> "ShowCornerAccents" (default: true)</li>
                  <li>• <strong>Number Property:</strong> "ActiveHotspots" (bind to counter)</li>
                  <li>• Create variant: "Loading_State" (skeleton screens)</li>
                  <li>• Create variant: "Error_State" (connection lost overlay)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Usage Context */}
          <div className="p-6 rounded-xl bg-black/40 border border-white/10">
            <h4 className="text-sm font-semibold text-white mb-4">Usage Context & Best Practices</h4>
            <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-400">
              <div>
                <h5 className="text-white font-semibold mb-2">Ideal Use Cases:</h5>
                <ul className="space-y-1">
                  <li>• Primary dashboard landing page</li>
                  <li>• Real-time monitoring interfaces</li>
                  <li>• Operations control centers</li>
                  <li>• Live event tracking dashboards</li>
                  <li>• Parliamentary session overview</li>
                  <li>• Administrative command panels</li>
                </ul>
              </div>
              <div>
                <h5 className="text-white font-semibold mb-2">Design Guidelines:</h5>
                <ul className="space-y-1">
                  <li>• Minimum viewport: 1440×900px (desktop only)</li>
                  <li>• Update ticker every 5 seconds</li>
                  <li>• Limit kill feed to 8 most recent events</li>
                  <li>• Hotspot colors indicate urgency levels</li>
                  <li>• Maintain 2% scanline opacity (subtlety)</li>
                  <li>• Use monospaced fonts for data streams</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
