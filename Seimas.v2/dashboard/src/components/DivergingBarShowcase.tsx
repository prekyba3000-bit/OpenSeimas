// ORPHANED(v4): not imported by any production route. Safe to delete in hygiene pass.
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { DivergingBar } from './DivergingBar';
import { Zap } from 'lucide-react';

export function DivergingBarShowcase() {
  return (
    <div className="space-y-8">
      {/* Component Overview */}
      <Card className="bg-[#141517] border-white/10">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl text-white">Data Viz: Diverging_Bar</CardTitle>
              <p className="text-sm text-gray-400 mt-2">
                Center-anchored comparison visualization with gradient power bars and synergy detection
              </p>
            </div>
            <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
              <Zap className="w-3 h-3 mr-1" />
              Power Viz
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Live Examples */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Live Examples - Standard Mode</h3>
            <div className="space-y-6 p-6 bg-[#0B0C0E] rounded-xl border border-white/10">
              <DivergingBar
                labelA="Andrius Kubilius"
                labelB="Gintautas Paluckas"
                valueA={35}
                valueB={65}
                title="Healthcare Reform Agreement"
              />
              
              <DivergingBar
                labelA="Opposition Bloc"
                labelB="Coalition Bloc"
                valueA={48}
                valueB={52}
                title="Budget Vote Distribution"
              />
              
              <DivergingBar
                labelA="Against"
                labelB="For"
                valueA={25}
                valueB={75}
                title="Education Amendment Outcome"
              />
              
              <DivergingBar
                labelA="Traditional"
                labelB="Progressive"
                valueA={60}
                valueB={40}
                title="Policy Alignment Spectrum"
              />
            </div>
          </div>

          {/* Synergy Overdrive Mode */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">
              Synergy Overdrive Mode (High Alignment &gt;80%)
            </h3>
            <div className="space-y-6 p-6 bg-[#0B0C0E] rounded-xl border border-cyan-500/20">
              <DivergingBar
                labelA="Viktorija Čmilytė-Nielsen"
                labelB="Saulius Skvernelis"
                valueA={85}
                valueB={85}
                title="Environmental Policy Consensus"
                synergy={true}
              />
              
              <DivergingBar
                labelA="Party A Votes"
                labelB="Party B Votes"
                valueA={92}
                valueB={88}
                title="Infrastructure Investment - Bipartisan Support"
                synergy={true}
              />
              
              <DivergingBar
                labelA="Urban MPs"
                labelB="Regional MPs"
                valueA={78}
                valueB={82}
                title="Digital Transformation Initiative"
                synergy={true}
              />
            </div>
          </div>

          {/* The Track Specifications */}
          <div className="p-6 rounded-xl bg-black/40 border border-white/10">
            <h4 className="text-sm font-semibold text-white mb-4">The Track Container</h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                  Structure
                </h5>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex justify-between">
                    <span>Height:</span>
                    <code className="text-gray-300 font-mono">64px (Fixed)</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Width:</span>
                    <code className="text-gray-300 font-mono">Fill Container</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Radius:</span>
                    <code className="text-gray-300 font-mono">Full (rounded-full)</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Fill:</span>
                    <code className="text-gray-300 font-mono">#000000</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Overflow:</span>
                    <code className="text-gray-300 font-mono">Hidden</code>
                  </li>
                </ul>
              </div>

              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                  Effects
                </h5>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex justify-between">
                    <span>Effect Type:</span>
                    <code className="text-gray-300 font-mono">Inner Shadow</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Y Offset:</span>
                    <code className="text-gray-300 font-mono">2px</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Blur:</span>
                    <code className="text-gray-300 font-mono">4px</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Color:</span>
                    <code className="text-gray-300 font-mono">Black/60</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Purpose:</span>
                    <span className="text-gray-300">Create depth</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-4 p-4 bg-[#0B0C0E] rounded-lg">
              <code className="text-xs text-gray-400 font-mono">
                box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.6);
              </code>
            </div>
          </div>

          {/* Neutral Zone Specs */}
          <div className="p-6 rounded-xl bg-black/40 border border-white/10">
            <h4 className="text-sm font-semibold text-white mb-4">The "Neutral" Zone (Center Line)</h4>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                  Line Element
                </h5>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex justify-between">
                    <span>Width:</span>
                    <code className="text-gray-300 font-mono">2px</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Height:</span>
                    <code className="text-gray-300 font-mono">100%</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Position:</span>
                    <code className="text-gray-300 font-mono">Absolute Center</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Color:</span>
                    <code className="text-gray-300 font-mono">White/20</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Z-Index:</span>
                    <code className="text-gray-300 font-mono">10</code>
                  </li>
                </ul>
              </div>

              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                  Label Element
                </h5>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex justify-between">
                    <span>Text:</span>
                    <code className="text-gray-300 font-mono">"50%"</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Font:</span>
                    <code className="text-gray-300 font-mono">Geist Mono</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Size:</span>
                    <code className="text-gray-300 font-mono">9px</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Color:</span>
                    <code className="text-gray-300 font-mono">White/40</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Position:</span>
                    <code className="text-gray-300 font-mono">Bottom Center</code>
                  </li>
                </ul>
              </div>

              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                  Visual Reference
                </h5>
                <div className="relative h-24 bg-black rounded-lg flex items-center justify-center">
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/20 -translate-x-1/2" />
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                    <span className="text-[9px] text-white/40 font-mono font-bold">50%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Power Bars Specifications */}
          <div className="p-6 rounded-xl bg-black/40 border border-white/10">
            <h4 className="text-sm font-semibold text-white mb-4">The "Power" Bars</h4>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left Bar */}
              <div>
                <div className="mb-3">
                  <Badge className="bg-red-500/10 text-red-400 border-red-500/20">
                    Left Bar (MP A)
                  </Badge>
                </div>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex justify-between">
                    <span>Fill:</span>
                    <code className="text-gray-300 font-mono text-xs">Gradient L→R</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Colors:</span>
                    <code className="text-gray-300 font-mono">#EF4444 → Transparent</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Anchor:</span>
                    <code className="text-gray-300 font-mono">Center (50%)</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Growth:</span>
                    <code className="text-gray-300 font-mono">Grows Left</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Width:</span>
                    <code className="text-gray-300 font-mono">Calculated % / 2</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Transform:</span>
                    <code className="text-gray-300 font-mono">translateX(-100%)</code>
                  </li>
                </ul>
                <div className="mt-4 relative h-16 bg-black rounded-lg overflow-hidden">
                  <div 
                    className="absolute left-1/2 top-0 bottom-0 w-1/2 origin-right"
                    style={{ 
                      transform: 'translateX(-100%)',
                      background: 'linear-gradient(to left, #EF4444, transparent)',
                    }}
                  />
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/20 -translate-x-1/2" />
                </div>
              </div>

              {/* Right Bar */}
              <div>
                <div className="mb-3">
                  <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                    Right Bar (MP B)
                  </Badge>
                </div>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex justify-between">
                    <span>Fill:</span>
                    <code className="text-gray-300 font-mono text-xs">Gradient R→L</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Colors:</span>
                    <code className="text-gray-300 font-mono">#22C55E → Transparent</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Anchor:</span>
                    <code className="text-gray-300 font-mono">Center (50%)</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Growth:</span>
                    <code className="text-gray-300 font-mono">Grows Right</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Width:</span>
                    <code className="text-gray-300 font-mono">Calculated % / 2</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Origin:</span>
                    <code className="text-gray-300 font-mono">origin-left</code>
                  </li>
                </ul>
                <div className="mt-4 relative h-16 bg-black rounded-lg overflow-hidden">
                  <div 
                    className="absolute left-1/2 top-0 bottom-0 w-1/2 origin-left"
                    style={{ 
                      background: 'linear-gradient(to right, #22C55E, transparent)',
                    }}
                  />
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/20 -translate-x-1/2" />
                </div>
              </div>
            </div>
          </div>

          {/* Synergy Overdrive Effect */}
          <div className="p-6 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
            <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              The "Synergy" Glow - Overdrive Effect
            </h4>
            <div className="space-y-6">
              <div className="p-4 bg-black/40 rounded-lg">
                <h5 className="text-sm font-semibold text-white mb-3">Activation Condition</h5>
                <div className="text-sm text-gray-400">
                  <p className="mb-2">
                    When <strong className="text-cyan-400">both MPs align with &gt;80% match</strong>, the visualization enters "Overdrive" mode.
                  </p>
                  <code className="text-xs text-cyan-300 font-mono bg-black/60 px-2 py-1 rounded">
                    if (alignmentScore &gt; 80) &#123; synergy = true &#125;
                  </code>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                    Visual Changes
                  </h5>
                  <ul className="text-sm text-gray-400 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      <span>Both bars change to Cyan (#06B6D4)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      <span>Gradient becomes Cyan → Transparent</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      <span>Value labels turn light cyan (#22D3EE)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      <span>"Synergy Overdrive" badge appears</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                    Glow Effect
                  </h5>
                  <ul className="text-sm text-gray-400 space-y-2">
                    <li className="flex justify-between">
                      <span>Layer:</span>
                      <code className="text-gray-300 font-mono">Behind bars</code>
                    </li>
                    <li className="flex justify-between">
                      <span>Effect:</span>
                      <code className="text-gray-300 font-mono">Layer Blur</code>
                    </li>
                    <li className="flex justify-between">
                      <span>Blur Amount:</span>
                      <code className="text-gray-300 font-mono">20px</code>
                    </li>
                    <li className="flex justify-between">
                      <span>Color:</span>
                      <code className="text-gray-300 font-mono">#06B6D4</code>
                    </li>
                    <li className="flex justify-between">
                      <span>Opacity:</span>
                      <code className="text-gray-300 font-mono">40%</code>
                    </li>
                    <li className="flex justify-between">
                      <span>Effect:</span>
                      <span className="text-cyan-300">Neon light</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Live Comparison */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-2">Standard Mode</p>
                  <div className="relative h-16 bg-black rounded-lg overflow-hidden">
                    <div 
                      className="absolute left-1/2 top-0 bottom-0 w-[35%] origin-right"
                      style={{ 
                        transform: 'translateX(-100%)',
                        background: 'linear-gradient(to left, #EF4444, transparent)',
                      }}
                    />
                    <div 
                      className="absolute left-1/2 top-0 bottom-0 w-[32.5%] origin-left"
                      style={{ 
                        background: 'linear-gradient(to right, #22C55E, transparent)',
                      }}
                    />
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/20 -translate-x-1/2" />
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-2">Synergy Overdrive Mode</p>
                  <div className="relative h-16 bg-black rounded-lg overflow-hidden">
                    <div 
                      className="absolute left-1/2 top-0 bottom-0 w-[42.5%] origin-right"
                      style={{ 
                        transform: 'translateX(-100%)',
                        background: 'linear-gradient(to left, #06B6D4, transparent)',
                      }}
                    />
                    <div 
                      className="absolute left-1/2 top-0 bottom-0 w-[42.5%] origin-left"
                      style={{ 
                        background: 'linear-gradient(to right, #06B6D4, transparent)',
                      }}
                    />
                    {/* Glow layers */}
                    <div 
                      className="absolute left-1/2 top-0 bottom-0 w-[42.5%] origin-right"
                      style={{ 
                        transform: 'translateX(-100%)',
                        background: '#06B6D4',
                        filter: 'blur(20px)',
                        opacity: 0.4,
                      }}
                    />
                    <div 
                      className="absolute left-1/2 top-0 bottom-0 w-[42.5%] origin-left"
                      style={{ 
                        background: '#06B6D4',
                        filter: 'blur(20px)',
                        opacity: 0.4,
                      }}
                    />
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/20 -translate-x-1/2 z-10" />
                  </div>
                </div>
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
                <h5 className="text-sm font-semibold text-white mb-2">Step 1: Create Track Frame</h5>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Name: "Diverging_Bar"</li>
                  <li>• Frame: 64px height, Fill container width</li>
                  <li>• Corner radius: Full (9999px or "rounded-full")</li>
                  <li>• Fill: #000000</li>
                  <li>• Effect: Inner Shadow (Y:2px, Blur:4px, Black/60)</li>
                  <li>• Clip content: Yes</li>
                </ul>
              </div>

              <div className="p-4 bg-black/40 rounded-lg">
                <h5 className="text-sm font-semibold text-white mb-2">Step 2: Add Center Line</h5>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Create rectangle: 2px × 64px</li>
                  <li>• Position: Absolute, Center (50%)</li>
                  <li>• Fill: White at 20% opacity</li>
                  <li>• Constraints: Center + Top & Bottom</li>
                  <li>• Name layer: "Neutral_Zone"</li>
                </ul>
              </div>

              <div className="p-4 bg-black/40 rounded-lg">
                <h5 className="text-sm font-semibold text-white mb-2">Step 3: Create Power Bars</h5>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Left Bar: Position at center, width variable, origin-right</li>
                  <li>• Fill: Linear gradient (Left to Right: #EF4444 → Transparent)</li>
                  <li>• Right Bar: Position at center, width variable, origin-left</li>
                  <li>• Fill: Linear gradient (Right to Left: #22C55E → Transparent)</li>
                  <li>• Both: Height 100%, constrained to parent</li>
                </ul>
              </div>

              <div className="p-4 bg-black/40 rounded-lg">
                <h5 className="text-sm font-semibold text-white mb-2">Step 4: Setup Variants</h5>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• <strong>Variant Property:</strong> "Mode" → Standard | Synergy</li>
                  <li>• <strong>Number Properties:</strong> "Value_A" (0-100), "Value_B" (0-100)</li>
                  <li>• <strong>Text Properties:</strong> "Label_A", "Label_B", "Title"</li>
                  <li>• Standard mode: Red/Green gradients</li>
                  <li>• Synergy mode: Both Cyan (#06B6D4), add blur layer (20px)</li>
                </ul>
              </div>

              <div className="p-4 bg-black/40 rounded-lg">
                <h5 className="text-sm font-semibold text-white mb-2">Step 5: Add Labels & Effects</h5>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• 50% label: Text 9px, Mono font, White/40, bottom-center</li>
                  <li>• Value labels: Text 12px, Mono bold, positioned on bars</li>
                  <li>• Synergy badge: Appears only in Synergy variant</li>
                  <li>• Badge: Cyan background, pulsing dot effect</li>
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
                  <li>• MP voting pattern comparisons</li>
                  <li>• Party bloc vote distributions</li>
                  <li>• Agreement/disagreement percentages</li>
                  <li>• Coalition vs opposition splits</li>
                  <li>• Policy alignment visualizations</li>
                  <li>• Binary outcome distributions</li>
                </ul>
              </div>
              <div>
                <h5 className="text-white font-semibold mb-2">Design Guidelines:</h5>
                <ul className="space-y-1">
                  <li>• Use synergy mode sparingly (high alignment only)</li>
                  <li>• Values should sum logically for context</li>
                  <li>• Left bar traditionally represents "against/opposition"</li>
                  <li>• Right bar represents "for/agreement"</li>
                  <li>• Labels should be concise (max 20 chars)</li>
                  <li>• Stack multiple bars with 16px gap for comparisons</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
