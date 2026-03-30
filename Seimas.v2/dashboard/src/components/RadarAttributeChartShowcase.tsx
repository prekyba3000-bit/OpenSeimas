import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { RadarAttributeChart } from './RadarAttributeChart';
import { Activity } from 'lucide-react';

export function RadarAttributeChartShowcase() {
  // Sample data sets
  const mpData1 = [
    { label: 'Loyalty', value: 85 },
    { label: 'Attendance', value: 92 },
    { label: 'Rebellion', value: 15 },
    { label: 'Activity', value: 78 },
    { label: 'Tenure', value: 65 },
  ];

  const mpData2 = [
    { label: 'Loyalty', value: 45 },
    { label: 'Attendance', value: 68 },
    { label: 'Rebellion', value: 75 },
    { label: 'Activity', value: 88 },
    { label: 'Tenure', value: 92 },
  ];

  const mpData3 = [
    { label: 'Loyalty', value: 95 },
    { label: 'Attendance', value: 98 },
    { label: 'Rebellion', value: 5 },
    { label: 'Activity', value: 85 },
    { label: 'Tenure', value: 88 },
  ];

  return (
    <div className="space-y-8">
      {/* Component Overview */}
      <Card className="bg-[#141517] border-white/10">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl text-white">Data Viz: Radar_Attribute_Chart</CardTitle>
              <p className="text-sm text-gray-400 mt-2">
                Pentagonal spider chart for visualizing MP parliamentary performance attributes
              </p>
            </div>
            <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
              <Activity className="w-3 h-3 mr-1" />
              5-Axis Viz
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Live Examples */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Live Chart Examples</h3>
            <div className="grid md:grid-cols-3 gap-8 p-8 bg-[#0B0C0E] rounded-xl border border-white/10">
              <div className="text-center">
                <RadarAttributeChart data={mpData1} size={280} />
                <div className="mt-4">
                  <p className="text-sm font-medium text-white mb-1">Party Loyalist</p>
                  <p className="text-xs text-gray-500">High loyalty, low rebellion</p>
                </div>
              </div>

              <div className="text-center">
                <RadarAttributeChart data={mpData2} size={280} />
                <div className="mt-4">
                  <p className="text-sm font-medium text-white mb-1">Independent Activist</p>
                  <p className="text-xs text-gray-500">High rebellion, high activity</p>
                </div>
              </div>

              <div className="text-center">
                <RadarAttributeChart data={mpData3} size={280} />
                <div className="mt-4">
                  <p className="text-sm font-medium text-white mb-1">Senior Member</p>
                  <p className="text-xs text-gray-500">Maximum loyalty and attendance</p>
                </div>
              </div>
            </div>
          </div>

          {/* Color Variants */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Color Variants</h3>
            <div className="grid md:grid-cols-4 gap-6 p-8 bg-[#0B0C0E] rounded-xl border border-white/10">
              <div className="text-center">
                <RadarAttributeChart data={mpData1} size={200} color="#22C55E" />
                <p className="text-xs text-gray-500 mt-2">Green (Default)</p>
                <code className="text-[10px] text-green-400 font-mono">#22C55E</code>
              </div>

              <div className="text-center">
                <RadarAttributeChart data={mpData1} size={200} color="#3B82F6" />
                <p className="text-xs text-gray-500 mt-2">Blue (Party)</p>
                <code className="text-[10px] text-blue-400 font-mono">#3B82F6</code>
              </div>

              <div className="text-center">
                <RadarAttributeChart data={mpData1} size={200} color="#EF4444" />
                <p className="text-xs text-gray-500 mt-2">Red (Alert)</p>
                <code className="text-[10px] text-red-400 font-mono">#EF4444</code>
              </div>

              <div className="text-center">
                <RadarAttributeChart data={mpData1} size={200} color="#8B5CF6" />
                <p className="text-xs text-gray-500 mt-2">Purple (Custom)</p>
                <code className="text-[10px] text-purple-400 font-mono">#8B5CF6</code>
              </div>
            </div>
          </div>

          {/* The Grid (The Web) Specifications */}
          <div className="p-6 rounded-xl bg-black/40 border border-white/10">
            <h4 className="text-sm font-semibold text-white mb-4">The Grid (The Web) - Structure</h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                  Concentric Pentagons
                </h5>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex justify-between">
                    <span>Layers:</span>
                    <code className="text-gray-300 font-mono">3 pentagons</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Scale:</span>
                    <code className="text-gray-300 font-mono">33%, 66%, 100%</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Stroke:</span>
                    <code className="text-gray-300 font-mono">White/10, 1px</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Fill:</span>
                    <code className="text-gray-300 font-mono">None (transparent)</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Purpose:</span>
                    <span className="text-gray-300">Scale reference</span>
                  </li>
                </ul>
              </div>

              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                  Axis Lines
                </h5>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex justify-between">
                    <span>Count:</span>
                    <code className="text-gray-300 font-mono">5 lines</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Origin:</span>
                    <code className="text-gray-300 font-mono">Center point</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Angle:</span>
                    <code className="text-gray-300 font-mono">72° apart (360/5)</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Stroke:</span>
                    <code className="text-gray-300 font-mono">White/10, 1px</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Length:</span>
                    <span className="text-gray-300">Full radius</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 bg-[#0B0C0E] rounded-lg">
              <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                Vertex Labels (5 Attributes)
              </h5>
              <div className="grid grid-cols-5 gap-3 text-center">
                <div>
                  <div className="w-2 h-2 rounded-full bg-white/20 mx-auto mb-1" />
                  <span className="text-xs text-gray-400 font-medium">Loyalty</span>
                </div>
                <div>
                  <div className="w-2 h-2 rounded-full bg-white/20 mx-auto mb-1" />
                  <span className="text-xs text-gray-400 font-medium">Attendance</span>
                </div>
                <div>
                  <div className="w-2 h-2 rounded-full bg-white/20 mx-auto mb-1" />
                  <span className="text-xs text-gray-400 font-medium">Rebellion</span>
                </div>
                <div>
                  <div className="w-2 h-2 rounded-full bg-white/20 mx-auto mb-1" />
                  <span className="text-xs text-gray-400 font-medium">Activity</span>
                </div>
                <div>
                  <div className="w-2 h-2 rounded-full bg-white/20 mx-auto mb-1" />
                  <span className="text-xs text-gray-400 font-medium">Tenure</span>
                </div>
              </div>
            </div>
          </div>

          {/* The Data Shape (The Polymer) */}
          <div className="p-6 rounded-xl bg-black/40 border border-white/10">
            <h4 className="text-sm font-semibold text-white mb-4">The Data Shape (The Polymer)</h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                  Shape Properties
                </h5>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex justify-between">
                    <span>Geometry:</span>
                    <code className="text-gray-300 font-mono">Irregular Pentagon</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Data Points:</span>
                    <code className="text-gray-300 font-mono">5 values (0-100)</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Fill:</span>
                    <code className="text-gray-300 font-mono">#22C55E @ 20%</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Stroke:</span>
                    <code className="text-gray-300 font-mono">#22C55E, 2px</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Line Join:</span>
                    <code className="text-gray-300 font-mono">Round</code>
                  </li>
                </ul>
              </div>

              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                  Vertex Markers
                </h5>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex justify-between">
                    <span>Shape:</span>
                    <code className="text-gray-300 font-mono">Circle</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Size:</span>
                    <code className="text-gray-300 font-mono">4px radius</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Fill:</span>
                    <code className="text-gray-300 font-mono">White</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Stroke:</span>
                    <code className="text-gray-300 font-mono">Primary color, 2px</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Position:</span>
                    <span className="text-gray-300">Data value points</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 bg-[#0B0C0E] rounded-lg">
              <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                Data Scaling Logic
              </h5>
              <div className="space-y-2 text-sm text-gray-400">
                <p>Each attribute value (0-100) is mapped to a radius percentage:</p>
                <ul className="space-y-1 ml-4">
                  <li>• <code className="text-gray-300 font-mono">0</code> → Center point (0% radius)</li>
                  <li>• <code className="text-gray-300 font-mono">50</code> → Middle pentagon (50% radius)</li>
                  <li>• <code className="text-gray-300 font-mono">100</code> → Outer pentagon (100% radius)</li>
                </ul>
                <div className="mt-3 p-3 bg-black/60 rounded border border-green-500/20">
                  <code className="text-xs text-green-400 font-mono">
                    radius = maxRadius × (value / 100)
                  </code>
                </div>
              </div>
            </div>
          </div>

          {/* Background Atmosphere */}
          <div className="p-6 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
            <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-400" />
              Background Atmosphere - The Glow Effect
            </h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                  Gradient Configuration
                </h5>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex justify-between">
                    <span>Type:</span>
                    <code className="text-gray-300 font-mono">Radial Gradient</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Center:</span>
                    <code className="text-gray-300 font-mono">Chart center</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Radius:</span>
                    <code className="text-gray-300 font-mono">80% of max</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Color Start:</span>
                    <code className="text-gray-300 font-mono">Green-500 @ 10%</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Color End:</span>
                    <code className="text-gray-300 font-mono">Transparent</code>
                  </li>
                </ul>
              </div>

              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                  Blend Mode Settings
                </h5>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex justify-between">
                    <span>Blend Mode:</span>
                    <code className="text-gray-300 font-mono">Screen</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Layer Order:</span>
                    <code className="text-gray-300 font-mono">Behind data shape</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Opacity:</span>
                    <code className="text-gray-300 font-mono">10%</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Purpose:</span>
                    <span className="text-gray-300">Atmospheric depth</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Effect:</span>
                    <span className="text-gray-300">Subtle halo glow</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-6 grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-2">Without Atmosphere</p>
                <div className="bg-[#0B0C0E] rounded-lg p-4 flex justify-center border border-white/5">
                  <RadarAttributeChart data={mpData1} size={160} showAtmosphere={false} />
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">With Atmosphere (Screen Blend)</p>
                <div className="bg-[#0B0C0E] rounded-lg p-4 flex justify-center border border-green-500/20">
                  <RadarAttributeChart data={mpData1} size={160} showAtmosphere={true} />
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
                <h5 className="text-sm font-semibold text-white mb-2">Step 1: Create Base Frame</h5>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Name: "Radar_Attribute_Chart"</li>
                  <li>• Frame: 300px × 300px square</li>
                  <li>• Fill: Transparent (or match background)</li>
                  <li>• Clip content: Yes</li>
                </ul>
              </div>

              <div className="p-4 bg-black/40 rounded-lg">
                <h5 className="text-sm font-semibold text-white mb-2">Step 2: Draw The Grid</h5>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Use Polygon tool with 5 sides</li>
                  <li>• Create 3 concentric pentagons at 33%, 66%, 100% scale</li>
                  <li>• Stroke: White at 10% opacity, 1px width</li>
                  <li>• Fill: None</li>
                  <li>• Add 5 lines from center to each vertex (White/10, 1px)</li>
                </ul>
              </div>

              <div className="p-4 bg-black/40 rounded-lg">
                <h5 className="text-sm font-semibold text-white mb-2">Step 3: Create Data Shape Layer</h5>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Draw irregular pentagon using Pen tool</li>
                  <li>• Each vertex position represents a data value (0-100 scale)</li>
                  <li>• Fill: #22C55E at 20% opacity</li>
                  <li>• Stroke: #22C55E, 2px width</li>
                  <li>• Corner Radius: 0 (Sharp angles with round join)</li>
                </ul>
              </div>

              <div className="p-4 bg-black/40 rounded-lg">
                <h5 className="text-sm font-semibold text-white mb-2">Step 4: Add Vertex Markers</h5>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Create 5 circles (8px diameter = 4px radius)</li>
                  <li>• Fill: White (#FFFFFF)</li>
                  <li>• Stroke: #22C55E, 2px width</li>
                  <li>• Position: At each vertex of data shape</li>
                  <li>• Group markers with data shape</li>
                </ul>
              </div>

              <div className="p-4 bg-black/40 rounded-lg">
                <h5 className="text-sm font-semibold text-white mb-2">Step 5: Add Atmosphere Effect</h5>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Create circle behind data shape (80% of max radius)</li>
                  <li>• Fill: Radial gradient (Green-500 @ 10% → Transparent)</li>
                  <li>• Blend Mode: Screen</li>
                  <li>• Layer order: Below data shape, above grid</li>
                </ul>
              </div>

              <div className="p-4 bg-black/40 rounded-lg">
                <h5 className="text-sm font-semibold text-white mb-2">Step 6: Add Axis Labels</h5>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Create 5 text labels: "Loyalty", "Attendance", "Rebellion", "Activity", "Tenure"</li>
                  <li>• Font: Inter/Geist Sans, 11px, Medium (500)</li>
                  <li>• Color: White at 60% opacity</li>
                  <li>• Position: 15% beyond outer pentagon at each vertex</li>
                  <li>• Text align: Center</li>
                </ul>
              </div>

              <div className="p-4 bg-black/40 rounded-lg">
                <h5 className="text-sm font-semibold text-white mb-2">Step 7: Setup Component Properties</h5>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• <strong>Number Properties:</strong> "Loyalty", "Attendance", "Rebellion", "Activity", "Tenure" (0-100 range)</li>
                  <li>• <strong>Color Property:</strong> "PrimaryColor" (default: #22C55E)</li>
                  <li>• <strong>Boolean Property:</strong> "ShowVertices" (default: true)</li>
                  <li>• <strong>Boolean Property:</strong> "ShowAtmosphere" (default: true)</li>
                  <li>• Bind number properties to vertex positions using constraints</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Attribute Definitions */}
          <div className="p-6 rounded-xl bg-black/40 border border-white/10">
            <h4 className="text-sm font-semibold text-white mb-4">Attribute Definitions & Metrics</h4>
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-3">
                <div className="p-3 bg-[#0B0C0E] rounded-lg border-l-2 border-green-500">
                  <h5 className="text-white font-semibold mb-1">Loyalty</h5>
                  <p className="text-xs text-gray-400">Percentage of votes aligned with party position</p>
                </div>
                <div className="p-3 bg-[#0B0C0E] rounded-lg border-l-2 border-blue-500">
                  <h5 className="text-white font-semibold mb-1">Attendance</h5>
                  <p className="text-xs text-gray-400">Percentage of voting sessions attended</p>
                </div>
                <div className="p-3 bg-[#0B0C0E] rounded-lg border-l-2 border-red-500">
                  <h5 className="text-white font-semibold mb-1">Rebellion</h5>
                  <p className="text-xs text-gray-400">Percentage of votes against party position</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-[#0B0C0E] rounded-lg border-l-2 border-yellow-500">
                  <h5 className="text-white font-semibold mb-1">Activity</h5>
                  <p className="text-xs text-gray-400">Overall parliamentary engagement level (speeches, proposals)</p>
                </div>
                <div className="p-3 bg-[#0B0C0E] rounded-lg border-l-2 border-purple-500">
                  <h5 className="text-white font-semibold mb-1">Tenure</h5>
                  <p className="text-xs text-gray-400">Years in parliament normalized to 0-100 scale</p>
                </div>
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
                  <li>• MP profile pages (performance overview)</li>
                  <li>• Comparison view (overlay 2 charts)</li>
                  <li>• Party average visualizations</li>
                  <li>• Historical trend comparisons</li>
                  <li>• Screening/filtering interfaces</li>
                </ul>
              </div>
              <div>
                <h5 className="text-white font-semibold mb-2">Design Guidelines:</h5>
                <ul className="space-y-1">
                  <li>• Maintain 300×300px minimum size for legibility</li>
                  <li>• Use party colors for MP-specific charts</li>
                  <li>• Green for positive/aggregate metrics</li>
                  <li>• Ensure adequate label spacing (15% buffer)</li>
                  <li>• Consider 2-chart overlays for direct comparison</li>
                  <li>• Animate data shape transitions (300ms ease)</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
