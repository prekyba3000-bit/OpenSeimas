// ORPHANED(v4): not imported by any production route. Safe to delete in hygiene pass.
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { HexagonFAB } from './HexagonFAB';
import { MobileVoteStrip } from './MobileVoteStrip';
import { VerticalPowerMeter } from './VerticalPowerMeter';
import { SwipeableVoteItem } from './SwipeableVoteItem';
import { Smartphone, Command, Info, Bookmark } from 'lucide-react';

export function MobileCompactShowcase() {
  const [lastAction, setLastAction] = useState<string>('');
  
  const mockVotes = [
    { id: 1, title: 'Healthcare Reform Bill 2026-A', outcome: 'PASSED' as const, votesFor: 84, votesAgainst: 42 },
    { id: 2, title: 'Tax Reform Proposal LR-2026-003', outcome: 'FAILED' as const, votesFor: 48, votesAgainst: 78 },
    { id: 3, title: 'Digital Infrastructure Package', outcome: 'DEFERRED' as const, votesFor: 65, votesAgainst: 65 },
    { id: 4, title: 'Environmental Protection Act', outcome: 'PASSED' as const, votesFor: 105, votesAgainst: 28 },
  ];
  
  return (
    <div className="space-y-8">
      {/* Component Overview */}
      <Card className="bg-[#141517] border-white/10">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl text-white">Mobile Compact Design System</CardTitle>
              <p className="text-sm text-gray-400 mt-2">
                Responsive mobile-first components with gesture support and data compression
              </p>
            </div>
            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
              <Smartphone className="w-3 h-3 mr-1" />
              Mobile View
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Hexagon FAB */}
          <div className="p-6 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
            <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              Navigation: Hexagonal Floating Action Button
            </h4>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                  Live Demo
                </h5>
                <div className="relative h-64 bg-[#0B0C0E] rounded-xl border border-white/10 overflow-hidden">
                  {/* Mock mobile screen */}
                  <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm">
                    Mobile Screen Area
                  </div>
                  
                  {/* FAB */}
                  <HexagonFAB 
                    onClick={() => setLastAction('Command Palette opened')}
                    icon={Command}
                    label="Command Palette"
                  />
                </div>
                {lastAction && (
                  <div className="mt-3 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-xs text-green-400">Action: {lastAction}</p>
                  </div>
                )}
              </div>
              
              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                  Specifications
                </h5>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex justify-between">
                    <span>Shape:</span>
                    <code className="text-gray-300 font-mono">Hexagon (6 sides)</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Size:</span>
                    <code className="text-gray-300 font-mono">64px × 64px</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Position:</span>
                    <code className="text-gray-300 font-mono">Fixed Bottom-Right</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Offset:</span>
                    <code className="text-gray-300 font-mono">24px from edges</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Glow Color:</span>
                    <code className="text-gray-300 font-mono">Blue-500 #3B82F6</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Effect:</span>
                    <code className="text-gray-300 font-mono">Blur 12px, Pulse</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Icon:</span>
                    <code className="text-gray-300 font-mono">Command (28px)</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Z-Index:</span>
                    <code className="text-gray-300 font-mono">50</code>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-black/40 rounded-lg">
              <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                Design Rationale
              </h5>
              <p className="text-sm text-gray-400">
                The hexagonal FAB creates a distinctive, futuristic touch point that stands out from 
                standard circular FABs. The neon blue glow and pulsing animation draw attention without 
                being intrusive. Positioned in the bottom-right corner, it's easily accessible for 
                right-handed thumb interaction while avoiding common bottom navigation zones.
              </p>
            </div>
          </div>

          {/* Mobile Vote Strip */}
          <div className="p-6 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
            <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Data Compression: Mobile Vote Strip
            </h4>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                  Live Demo
                </h5>
                <div className="bg-[#0B0C0E] rounded-xl border border-white/10 overflow-hidden">
                  {mockVotes.map((vote) => (
                    <MobileVoteStrip
                      key={vote.id}
                      title={vote.title}
                      outcome={vote.outcome}
                      votesFor={vote.votesFor}
                      votesAgainst={vote.votesAgainst}
                      onClick={() => setLastAction(`Clicked: ${vote.title}`)}
                    />
                  ))}
                </div>
              </div>
              
              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                  Compression Strategy
                </h5>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">✕</span>
                    <span><strong className="text-white">Removed:</strong> Date column (save ~96px)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">✕</span>
                    <span><strong className="text-white">Removed:</strong> Vote ID (save ~64px)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">✕</span>
                    <span><strong className="text-white">Removed:</strong> Result badge (redundant with edge)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span><strong className="text-white">Kept:</strong> Outcome edge (critical indicator)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span><strong className="text-white">Kept:</strong> Truncated title (primary info)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span><strong className="text-white">Kept:</strong> Compact vote counts (84:42)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">+</span>
                    <span><strong className="text-white">Added:</strong> Chevron for navigation</span>
                  </li>
                </ul>
                
                <div className="mt-4 p-3 bg-black/40 rounded-lg">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Height Reduction:</span>
                    <span className="text-white font-mono">56px → 48px <span className="text-green-400">(-14%)</span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Vertical Power Meter */}
          <div className="p-6 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
            <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              Comparison Bar: Vertical Power Meter
            </h4>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                  Live Demo - Normal
                </h5>
                <div className="h-80">
                  <VerticalPowerMeter
                    nameA="Gabrielius Landsbergis"
                    nameB="Gintautas Paluckas"
                    valueA={68}
                    valueB={54}
                    labelA="TS-LKD"
                    labelB="LSDP"
                    colorA="#3B82F6"
                    colorB="#8B5CF6"
                  />
                </div>
              </div>
              
              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                  Live Demo - Overdrive
                </h5>
                <div className="h-80">
                  <VerticalPowerMeter
                    nameA="Ingrida Šimonytė"
                    nameB="Ramūnas Karbauskis"
                    valueA={92}
                    valueB={21}
                    labelA="TS-LKD"
                    labelB="LVŽS"
                    colorA="#22C55E"
                    colorB="#EF4444"
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-6 grid md:grid-cols-2 gap-6">
              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                  Rotation Transform
                </h5>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex justify-between">
                    <span>Desktop Orientation:</span>
                    <code className="text-gray-300 font-mono">Horizontal</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Mobile Orientation:</span>
                    <code className="text-gray-300 font-mono">Vertical</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Rotation:</span>
                    <code className="text-gray-300 font-mono">90° Clockwise</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Layout:</span>
                    <code className="text-gray-300 font-mono">Column (Top/Bottom)</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Bar Width:</span>
                    <code className="text-gray-300 font-mono">64px</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Min Height:</span>
                    <code className="text-gray-300 font-mono">320px</code>
                  </li>
                </ul>
              </div>
              
              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                  Synergy Overdrive Effect
                </h5>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex justify-between">
                    <span>Trigger:</span>
                    <code className="text-gray-300 font-mono">&gt;60% dominance</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Effect:</span>
                    <code className="text-gray-300 font-mono">Enhanced glow</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Animation:</span>
                    <code className="text-gray-300 font-mono">Pulse overlay</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Label:</span>
                    <code className="text-gray-300 font-mono">"Overdrive" (rotated)</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Glow Radius:</span>
                    <code className="text-gray-300 font-mono">40px (doubled)</code>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-black/40 rounded-lg">
              <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                Design Rationale
              </h5>
              <p className="text-sm text-gray-400">
                Rotating the comparison bar 90° transforms it into a "power meter" that fits naturally 
                in narrow mobile viewports. The vertical orientation mimics fighting game life bars or 
                esports stats, creating immediate visual understanding. Player A at top, Player B at bottom, 
                with the dominant side "pushing" into opponent territory. The Synergy Overdrive effect 
                activates when dominance exceeds 80%, signaling decisive advantage.
              </p>
            </div>
          </div>

          {/* Swipe Gestures */}
          <div className="p-6 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
            <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-500" />
              Card Gestures: Swipe Actions
            </h4>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                  Live Demo - Try Swiping!
                </h5>
                <div className="bg-[#0B0C0E] rounded-xl border border-white/10 overflow-hidden">
                  {mockVotes.slice(0, 3).map((vote) => (
                    <SwipeableVoteItem
                      key={vote.id}
                      title={vote.title}
                      outcome={vote.outcome}
                      votesFor={vote.votesFor}
                      votesAgainst={vote.votesAgainst}
                      onDetails={() => setLastAction(`📄 View details: ${vote.title}`)}
                      onBookmark={() => setLastAction(`🔖 Bookmarked: ${vote.title}`)}
                      onClick={() => setLastAction(`👆 Tapped: ${vote.title}`)}
                    />
                  ))}
                </div>
                {lastAction && (
                  <div className="mt-3 px-3 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                    <p className="text-xs text-cyan-400">{lastAction}</p>
                  </div>
                )}
              </div>
              
              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                  Gesture Configuration
                </h5>
                
                <div className="space-y-4">
                  {/* Swipe Left */}
                  <div className="p-3 bg-gray-700/20 border border-gray-600/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-gray-700/50 rounded">
                        <Info className="w-4 h-4 text-gray-300" />
                      </div>
                      <span className="text-sm font-semibold text-white">Swipe Left → Details</span>
                    </div>
                    <ul className="text-xs text-gray-400 space-y-1 ml-8">
                      <li>• Background: Gray-700/50</li>
                      <li>• Icon: Info (Gray-300)</li>
                      <li>• Action: View full vote details</li>
                      <li>• Threshold: 60px left swipe</li>
                    </ul>
                  </div>
                  
                  {/* Swipe Right */}
                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-blue-500/20 rounded">
                        <Bookmark className="w-4 h-4 text-blue-400" />
                      </div>
                      <span className="text-sm font-semibold text-white">Swipe Right → Bookmark</span>
                    </div>
                    <ul className="text-xs text-gray-400 space-y-1 ml-8">
                      <li>• Background: Blue-500/10</li>
                      <li>• Icon: Bookmark (Blue-400)</li>
                      <li>• Border: Left 2px Blue-400</li>
                      <li>• Effect: Neon glow (20px blur)</li>
                      <li>• Action: Add to bookmarks</li>
                      <li>• Threshold: 60px right swipe</li>
                    </ul>
                  </div>
                </div>
                
                <div className="mt-4">
                  <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">
                    Physics Parameters
                  </h5>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>• Max Swipe Distance: <code className="text-gray-300 font-mono">100px</code></li>
                    <li>• Activation Threshold: <code className="text-gray-300 font-mono">60px</code></li>
                    <li>• Snap Back Duration: <code className="text-gray-300 font-mono">200ms</code></li>
                    <li>• Easing: <code className="text-gray-300 font-mono">ease-out</code></li>
                    <li>• Action Delay: <code className="text-gray-300 font-mono">300ms</code></li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-black/40 rounded-lg">
              <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                Design Rationale
              </h5>
              <p className="text-sm text-gray-400">
                Swipe gestures leverage mobile-native interaction patterns made popular by apps like 
                Gmail and iOS Mail. The left swipe reveals gray for "view details" (informational, 
                non-destructive), while right swipe shows neon blue outline for "bookmark" (positive 
                action, save for later). The 60px threshold prevents accidental triggers while still 
                feeling responsive. Subtle arrow hints at the edges guide first-time users.
              </p>
            </div>
          </div>

          {/* Figma Mobile Component Setup */}
          <div className="p-6 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20">
            <h4 className="text-sm font-semibold text-white mb-4">
              Figma Mobile Component Setup
            </h4>
            <div className="space-y-4">
              <div className="p-4 bg-black/40 rounded-lg">
                <h5 className="text-sm font-semibold text-white mb-2">Step 1: Create Mobile Frame</h5>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Frame: iPhone 15 Pro (393 × 852px) or Android equivalent</li>
                  <li>• Background: #0a0a0c</li>
                  <li>• Safe area insets: 44px top, 34px bottom</li>
                </ul>
              </div>

              <div className="p-4 bg-black/40 rounded-lg">
                <h5 className="text-sm font-semibold text-white mb-2">Step 2: Build Hexagon FAB Component</h5>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Create hexagon polygon: 64×64px, 6 vertices</li>
                  <li>• Stroke: 2px Blue-500 #3B82F6</li>
                  <li>• Fill: #0a0a0c (match background)</li>
                  <li>• Effect: Layer blur 12px, opacity 60%, Blue-500</li>
                  <li>• Add animation: Pulse effect (opacity 40-60%, 2s loop)</li>
                  <li>• Position: Fixed, bottom-right, 24px offset</li>
                  <li>• Icon: Command symbol, 28px, Blue-400 center</li>
                  <li>• Interaction: Tap → Open command palette</li>
                </ul>
              </div>

              <div className="p-4 bg-black/40 rounded-lg">
                <h5 className="text-sm font-semibold text-white mb-2">Step 3: Create Mobile Vote Strip</h5>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Component name: "Mobile_Vote_Strip"</li>
                  <li>• Frame: 48px height, fill container width</li>
                  <li>• Remove date and ID text layers</li>
                  <li>• Keep outcome edge (4px absolute left)</li>
                  <li>• Title: Single line, truncate with ellipsis</li>
                  <li>• Vote counts: Compact format "84:42" (12px mono)</li>
                  <li>• Add chevron icon (16px, gray-600, right)</li>
                  <li>• Variants: PASSED | FAILED | DEFERRED</li>
                </ul>
              </div>

              <div className="p-4 bg-black/40 rounded-lg">
                <h5 className="text-sm font-semibold text-white mb-2">Step 4: Build Vertical Power Meter</h5>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Component name: "Vertical_Power_Meter"</li>
                  <li>• Frame: 120px width, 320px+ height</li>
                  <li>• Layout: Vertical auto-layout, gap 16px</li>
                  <li>• Player A section: Top (name + value)</li>
                  <li>• Meter: Center (64px wide, rounded full)</li>
                  <li>• Player B section: Bottom (name + value)</li>
                  <li>• Meter fill: Gradient top (A color) + bottom (B color)</li>
                  <li>• Center divider: White/20, 2px height</li>
                  <li>• Overdrive variant: Add pulsing glow overlay</li>
                  <li>• Property: ValueA (0-100), ValueB (0-100)</li>
                </ul>
              </div>

              <div className="p-4 bg-black/40 rounded-lg">
                <h5 className="text-sm font-semibold text-white mb-2">Step 5: Design Swipe Actions</h5>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Cannot fully prototype in Figma (use prototype hints)</li>
                  <li>• Create 3 states: Default, SwipeLeft, SwipeRight</li>
                  <li>• SwipeLeft: Show gray background with Info icon</li>
                  <li>• SwipeRight: Show blue background with Bookmark icon</li>
                  <li>• Add interaction: Drag (horizontal) → Snap to state</li>
                  <li>• Include reset: Drag back → Return to default</li>
                  <li>• Note: Real implementation requires code for physics</li>
                </ul>
              </div>

              <div className="p-4 bg-black/40 rounded-lg">
                <h5 className="text-sm font-semibold text-white mb-2">Step 6: Assemble Mobile View</h5>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Header: 56px height, title + status</li>
                  <li>• Content: Scrollable list of Mobile_Vote_Strip</li>
                  <li>• No bottom navigation (replaced by FAB)</li>
                  <li>• FAB: Overlays content, fixed position</li>
                  <li>• Padding: 16px horizontal margins</li>
                  <li>• Safe areas: Account for notch and home indicator</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Usage Context */}
          <div className="p-6 rounded-xl bg-black/40 border border-white/10">
            <h4 className="text-sm font-semibold text-white mb-4">Mobile Design Principles</h4>
            <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-400">
              <div>
                <h5 className="text-white font-semibold mb-2">Touch Targets:</h5>
                <ul className="space-y-1">
                  <li>• Minimum: 44×44px (iOS HIG standard)</li>
                  <li>• FAB: 64×64px (oversized for emphasis)</li>
                  <li>• List items: 48px height (comfortable tapping)</li>
                  <li>• Spacing: 16px minimum between interactive elements</li>
                </ul>
              </div>
              <div>
                <h5 className="text-white font-semibold mb-2">Performance:</h5>
                <ul className="space-y-1">
                  <li>• Use CSS transforms (hardware accelerated)</li>
                  <li>• Limit animations to opacity and transform</li>
                  <li>• Virtual scrolling for lists &gt;100 items</li>
                  <li>• Debounce swipe events (60fps target)</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
