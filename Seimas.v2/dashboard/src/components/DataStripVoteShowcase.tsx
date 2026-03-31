// ORPHANED(v4): not imported by any production route. Safe to delete in hygiene pass.
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { DataStripVote } from './DataStripVote';

export function DataStripVoteShowcase() {
  return (
    <div className="space-y-8">
      {/* Component Overview */}
      <Card className="bg-[#141517] border-white/10">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl text-white">Component: Data_Strip_Vote</CardTitle>
              <p className="text-sm text-gray-400 mt-2">
                High-density list item representing parliamentary vote outcome with esports-inspired edge indicator
              </p>
            </div>
            <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">
              Esports Style
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Live Component Examples */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Component Variants - Live Demo</h3>
            <div className="bg-[#0B0C0E] rounded-xl overflow-hidden border border-white/10">
              <DataStripVote
                title="Healthcare Reform Bill 2026-A: Universal Coverage Amendment"
                outcome="PASSED"
                votesFor={84}
                votesAgainst={42}
                timestamp="2m ago"
              />
              <DataStripVote
                title="Tax Reform Proposal LR-2026-003: Corporate Tax Rate Adjustment"
                outcome="FAILED"
                votesFor={48}
                votesAgainst={78}
                timestamp="15m ago"
              />
              <DataStripVote
                title="Digital Infrastructure Investment Package"
                outcome="DEFERRED"
                votesFor={65}
                votesAgainst={65}
                timestamp="35m ago"
              />
              <DataStripVote
                title="Environmental Protection Act Amendment - Extended Debate Period"
                outcome="PASSED"
                votesFor={105}
                votesAgainst={28}
                timestamp="1h ago"
              />
              <DataStripVote
                title="Education Budget Amendment 2026: Increased Funding Allocation"
                outcome="FAILED"
                votesFor={52}
                votesAgainst={82}
                timestamp="2h ago"
              />
              <DataStripVote
                title="Transportation Infrastructure Modernization Bill"
                outcome="PASSED"
                votesFor={96}
                votesAgainst={38}
                timestamp="3h ago"
              />
            </div>
          </div>

          {/* Container Structure Specs */}
          <div className="p-6 rounded-xl bg-black/40 border border-white/10">
            <h4 className="text-sm font-semibold text-white mb-4">Container Structure</h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Dimensions</h5>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex justify-between">
                    <span>Height:</span>
                    <code className="text-gray-300 font-mono">56px (Fixed)</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Width:</span>
                    <code className="text-gray-300 font-mono">Fill Container</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Layout:</span>
                    <code className="text-gray-300 font-mono">Auto-layout Horizontal</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Gap:</span>
                    <code className="text-gray-300 font-mono">16px</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Padding:</span>
                    <code className="text-gray-300 font-mono">16px horizontal</code>
                  </li>
                </ul>
              </div>

              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Visual Style</h5>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex justify-between">
                    <span>Fill:</span>
                    <code className="text-gray-300 font-mono">#141517</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Hover Fill:</span>
                    <code className="text-gray-300 font-mono">#1C1D21</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Bottom Border:</span>
                    <code className="text-gray-300 font-mono">1px White/5</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Outer Borders:</span>
                    <code className="text-gray-300 font-mono">None (Flat)</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Shadows:</span>
                    <code className="text-gray-300 font-mono">None</code>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* The "Outcome Edge" - Critical Indicator */}
          <div className="p-6 rounded-xl bg-black/40 border border-white/10">
            <h4 className="text-sm font-semibold text-white mb-4">
              The "Outcome Edge" - Critical Indicator
            </h4>
            <div className="grid md:grid-cols-3 gap-6">
              {/* Success Variant */}
              <div>
                <div className="mb-3">
                  <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                    Variant: Success (Už)
                  </Badge>
                </div>
                <div className="relative h-14 bg-[#141517] rounded-lg overflow-hidden border border-white/5">
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1"
                    style={{
                      backgroundColor: '#22C55E',
                      boxShadow: '0 0 8px rgba(34, 197, 94, 0.5)',
                    }}
                  />
                  <div className="h-full flex items-center justify-center">
                    <span className="text-xs text-gray-500 font-mono">4px Neon Green + Glow</span>
                  </div>
                </div>
                <ul className="mt-3 text-xs text-gray-400 space-y-1">
                  <li>• Width: 4px</li>
                  <li>• Fill: <code className="text-green-400 font-mono">#22C55E</code></li>
                  <li>• Effect: Glow (Blur 8px)</li>
                  <li>• Position: Absolute Left</li>
                </ul>
              </div>

              {/* Failure Variant */}
              <div>
                <div className="mb-3">
                  <Badge className="bg-red-500/10 text-red-400 border-red-500/20">
                    Variant: Failure (Prieš)
                  </Badge>
                </div>
                <div className="relative h-14 bg-[#141517] rounded-lg overflow-hidden border border-white/5">
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1"
                    style={{
                      backgroundColor: '#EF4444',
                      boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)',
                    }}
                  />
                  <div className="h-full flex items-center justify-center">
                    <span className="text-xs text-gray-500 font-mono">4px Neon Red + Glow</span>
                  </div>
                </div>
                <ul className="mt-3 text-xs text-gray-400 space-y-1">
                  <li>• Width: 4px</li>
                  <li>• Fill: <code className="text-red-400 font-mono">#EF4444</code></li>
                  <li>• Effect: Glow (Blur 8px)</li>
                  <li>• Position: Absolute Left</li>
                </ul>
              </div>

              {/* Abstain Variant */}
              <div>
                <div className="mb-3">
                  <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                    Variant: Abstain
                  </Badge>
                </div>
                <div className="relative h-14 bg-[#141517] rounded-lg overflow-hidden border border-white/5">
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1"
                    style={{
                      backgroundColor: '#EAB308',
                    }}
                  />
                  <div className="h-full flex items-center justify-center">
                    <span className="text-xs text-gray-500 font-mono">4px Neon Yellow</span>
                  </div>
                </div>
                <ul className="mt-3 text-xs text-gray-400 space-y-1">
                  <li>• Width: 4px</li>
                  <li>• Fill: <code className="text-yellow-400 font-mono">#EAB308</code></li>
                  <li>• Effect: None</li>
                  <li>• Position: Absolute Left</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Data Columns Specifications */}
          <div className="p-6 rounded-xl bg-black/40 border border-white/10">
            <h4 className="text-sm font-semibold text-white mb-4">Data Columns (Mono-Spaced Layout)</h4>
            <div className="space-y-6">
              {/* Column 1 - Date */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                    Column 1: Date
                  </h5>
                  <div className="p-4 bg-[#0B0C0E] rounded-lg border border-white/5 mb-3">
                    <span
                      className="text-[11px] text-gray-500"
                      style={{ fontFamily: 'Geist Mono, monospace' }}
                    >
                      2026-02-04
                    </span>
                  </div>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>• Font: Geist Mono (monospace)</li>
                    <li>• Size: 11px</li>
                    <li>• Color: Gray-500</li>
                    <li>• Width: 96px (fixed)</li>
                    <li>• Format: YYYY-MM-DD</li>
                  </ul>
                </div>

                <div>
                  <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                    Column 3: Result Badge
                  </h5>
                  <div className="p-4 bg-[#0B0C0E] rounded-lg border border-white/5 mb-3 flex justify-center">
                    <div className="h-5 px-2 flex items-center justify-center rounded-md bg-white/5 bg-green-500/5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-green-400">
                        ACCEPTED
                      </span>
                    </div>
                  </div>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>• Height: 20px</li>
                    <li>• Padding: 8px horizontal</li>
                    <li>• Radius: 4px (rounded-md)</li>
                    <li>• Fill: White/5 + Outcome/5</li>
                    <li>• Text: 10px Bold Uppercase</li>
                  </ul>
                </div>
              </div>

              {/* Column 2 - Title */}
              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                  Column 2: Title (Flex-1)
                </h5>
                <div className="p-4 bg-[#0B0C0E] rounded-lg border border-white/5 mb-3">
                  <p className="text-sm font-medium text-white truncate">
                    Healthcare Reform Bill 2026-A: Universal Coverage Amendment
                  </p>
                </div>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Font: Inter / Geist Sans</li>
                  <li>• Size: 14px</li>
                  <li>• Weight: Medium (500)</li>
                  <li>• Color: White</li>
                  <li>• Width: Flex-1 (Fill remaining space)</li>
                  <li>• Truncate: Single line with ellipsis</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Physics & Stacking Behavior */}
          <div className="p-6 rounded-xl bg-black/40 border border-white/10">
            <h4 className="text-sm font-semibold text-white mb-4">Physics & Stacking Behavior</h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                  Separation & Borders
                </h5>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span>Bottom border: 1px solid White/5</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span>Last item: <code className="text-gray-300 font-mono">border-b-0</code></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span>No outer borders (flat design)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span>No shadows (stackable strips)</span>
                  </li>
                </ul>
              </div>

              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                  Interaction States
                </h5>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">•</span>
                    <span>Hover: Background #141517 → #1C1D21</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">•</span>
                    <span>Cursor: Pointer (button element)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">•</span>
                    <span>Transition: 150ms ease-in-out</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">•</span>
                    <span>Click: Navigate or expand details</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Figma Component Setup */}
          <div className="p-6 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20">
            <h4 className="text-sm font-semibold text-white mb-4">
              Figma Component Setup Instructions
            </h4>
            <div className="space-y-4">
              <div className="p-4 bg-black/40 rounded-lg">
                <h5 className="text-sm font-semibold text-white mb-2">Step 1: Create Master Component</h5>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Name: "Data_Strip_Vote"</li>
                  <li>• Frame: 56px height, Fill container width</li>
                  <li>• Auto-layout: Horizontal, Gap 16px, Padding 16px</li>
                  <li>• Fill: #141517</li>
                </ul>
              </div>

              <div className="p-4 bg-black/40 rounded-lg">
                <h5 className="text-sm font-semibold text-white mb-2">Step 2: Add Outcome Edge Rectangle</h5>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Create rectangle: 4px × 56px</li>
                  <li>• Position: Absolute, Left 0, Top 0</li>
                  <li>• Constraints: Left + Top & Bottom</li>
                  <li>• Name layer: "Outcome_Edge"</li>
                </ul>
              </div>

              <div className="p-4 bg-black/40 rounded-lg">
                <h5 className="text-sm font-semibold text-white mb-2">Step 3: Setup Component Properties</h5>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• <strong>Text Property:</strong> "Title" → Title text content</li>
                  <li>• <strong>Text Property:</strong> "Timestamp" → Time ago text</li>
                  <li>• <strong>Number Property:</strong> "VotesFor" → Green vote count</li>
                  <li>• <strong>Number Property:</strong> "VotesAgainst" → Red vote count</li>
                  <li>• <strong>Variant Property:</strong> "Outcome" → PASSED | FAILED | DEFERRED</li>
                </ul>
              </div>

              <div className="p-4 bg-black/40 rounded-lg">
                <h5 className="text-sm font-semibold text-white mb-2">Step 4: Create Variants</h5>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• PASSED: Edge fill #22C55E, Effect "Glow/Green", Badge Green-400</li>
                  <li>• FAILED: Edge fill #EF4444, Effect "Glow/Red", Badge Red-400</li>
                  <li>• DEFERRED: Edge fill #EAB308, No effect, Badge Yellow-400</li>
                </ul>
              </div>

              <div className="p-4 bg-black/40 rounded-lg">
                <h5 className="text-sm font-semibold text-white mb-2">Step 5: Add Interactive Hover</h5>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Create component variant: "State=Hover"</li>
                  <li>• Change fill: #1C1D21</li>
                  <li>• Wire interaction: On Mouse Enter → Change to Hover state</li>
                  <li>• Wire interaction: On Mouse Leave → Change to Default state</li>
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
                  <li>• Parliamentary voting record lists</li>
                  <li>• High-density data tables</li>
                  <li>• Activity feeds with status</li>
                  <li>• Match history displays (esports style)</li>
                  <li>• Timeline events with outcomes</li>
                </ul>
              </div>
              <div>
                <h5 className="text-white font-semibold mb-2">Design Guidelines:</h5>
                <ul className="space-y-1">
                  <li>• Stack strips vertically without gaps</li>
                  <li>• Maximum 100 items per view (pagination)</li>
                  <li>• Date format: ISO 8601 (YYYY-MM-DD)</li>
                  <li>• Result text: Always UPPERCASE</li>
                  <li>• Truncate titles at one line</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}