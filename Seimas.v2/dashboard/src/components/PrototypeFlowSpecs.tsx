import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ArrowRight, Clock, Zap } from 'lucide-react';

export function PrototypeFlowSpecs() {
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-2xl text-white">Prototype Flow Specifications</CardTitle>
        <p className="text-sm text-gray-400">
          Complete wiring logic for Figma Smart Animate transitions
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Flow Steps */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Interaction Flow</h3>
            
            {/* Step 1 */}
            <div className="flex items-start gap-4 p-4 bg-gray-950 rounded-lg border border-blue-500/20">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white text-sm font-bold flex-shrink-0">
                1
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-sm font-semibold text-white">Left MP Selector Click</h4>
                  <Badge variant="outline" className="text-xs">Smart Animate</Badge>
                </div>
                <p className="text-xs text-gray-400 mb-2">
                  Link "Empty_State" (Left Selector) → Navigate with Smart Animate → "Active_Selection"
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <Zap className="w-3 h-3 text-blue-400" />
                  <span className="text-gray-500">Trigger: On Click</span>
                  <ArrowRight className="w-3 h-3 text-gray-600" />
                  <span className="text-gray-500">Action: Smart Animate (300ms)</span>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-4 p-4 bg-gray-950 rounded-lg border border-blue-500/20">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white text-sm font-bold flex-shrink-0">
                2
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-sm font-semibold text-white">Right MP Selector Click</h4>
                  <Badge variant="outline" className="text-xs">Smart Animate</Badge>
                </div>
                <p className="text-xs text-gray-400 mb-2">
                  Link "Empty_State" (Right Selector) → Navigate with Smart Animate → "Active_Selection"
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <Zap className="w-3 h-3 text-blue-400" />
                  <span className="text-gray-500">Trigger: On Click</span>
                  <ArrowRight className="w-3 h-3 text-gray-600" />
                  <span className="text-gray-500">Action: Smart Animate (300ms)</span>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-4 p-4 bg-gray-950 rounded-lg border border-green-500/20">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white text-sm font-bold flex-shrink-0">
                3
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-sm font-semibold text-white">Trigger Comparison</h4>
                  <Badge variant="outline" className="text-xs bg-green-500/10 text-green-400 border-green-500/20">
                    Conditional
                  </Badge>
                </div>
                <p className="text-xs text-gray-400 mb-2">
                  When Both Selectors == "Active" → Navigate to Frame "State/Loading"
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <Clock className="w-3 h-3 text-green-400" />
                  <span className="text-gray-500">Condition: Both selected</span>
                  <ArrowRight className="w-3 h-3 text-gray-600" />
                  <span className="text-gray-500">Delay: 50ms</span>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex items-start gap-4 p-4 bg-gray-950 rounded-lg border border-amber-500/20">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500 text-white text-sm font-bold flex-shrink-0">
                4
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-sm font-semibold text-white">Loading Animation</h4>
                  <Badge variant="outline" className="text-xs">After Delay</Badge>
                </div>
                <p className="text-xs text-gray-400 mb-2">
                  Frame "State/Loading" shows spinner → Navigate to "State/Results" after 1500ms
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span className="text-gray-500">Display: Spinner animation</span>
                  <ArrowRight className="w-3 h-3 text-gray-600" />
                  <span className="text-gray-500">Delay: 1500ms</span>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex items-start gap-4 p-4 bg-gray-950 rounded-lg border border-purple-500/20">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500 text-white text-sm font-bold flex-shrink-0">
                5
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-sm font-semibold text-white">Results Display</h4>
                  <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/20">
                    Final State
                  </Badge>
                </div>
                <p className="text-xs text-gray-400 mb-2">
                  Frame "State/Results" shows alignment card with 85% score and divergence list
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <Zap className="w-3 h-3 text-purple-400" />
                  <span className="text-gray-500">Display: Full results with animations</span>
                </div>
              </div>
            </div>
          </div>

          {/* Animation Specs */}
          <div className="mt-8 p-6 bg-gray-950 rounded-lg border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-4">Animation Specifications</h3>
            <div className="grid md:grid-cols-3 gap-6 text-xs">
              <div>
                <h4 className="text-white font-semibold mb-2">Smart Animate</h4>
                <ul className="text-gray-400 space-y-1">
                  <li>• Easing: Ease Out</li>
                  <li>• Duration: 300ms</li>
                  <li>• Matches layer names automatically</li>
                  <li>• Morphs colors and positions</li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-2">Loading Spinner</h4>
                <ul className="text-gray-400 space-y-1">
                  <li>• Rotation: 360° continuous</li>
                  <li>• Animation: Linear</li>
                  <li>• Duration: 2s per rotation</li>
                  <li>• Gradient opacity: 50%</li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-2">Delays & Timing</h4>
                <ul className="text-gray-400 space-y-1">
                  <li>• Selection → Loading: 50ms</li>
                  <li>• Loading → Results: 1500ms</li>
                  <li>• Smart Animate: 300ms</li>
                  <li>• Fade In: 500ms</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Frame States */}
          <div className="mt-6 p-6 bg-gray-950 rounded-lg border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-4">Frame State Structure</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white">Frame: "State/Selection"</div>
                  <p className="text-xs text-gray-400 mt-1">
                    Contains: VS Badge + Left MpSelector (Empty) + Right MpSelector (Empty)
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5" />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white">Frame: "State/Loading"</div>
                  <p className="text-xs text-gray-400 mt-1">
                    Contains: AlignmentResultCard (isLoading=true, showDivergences=false)
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white">Frame: "State/Results"</div>
                  <p className="text-xs text-gray-400 mt-1">
                    Contains: AlignmentResultCard (score=85, showDivergences=true) + Vote_Diff_Row list
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
