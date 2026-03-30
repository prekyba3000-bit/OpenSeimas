import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { CommandPalette } from './CommandPalette';
import { MenuTrigger } from './MenuTrigger';

export function ShellNavigationShowcase() {
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  return (
    <div className="space-y-8">
      {/* The Void Theme Tokens */}
      <Card className="bg-[#141517] border-white/10">
        <CardHeader>
          <CardTitle className="text-2xl text-white">The "Void" Theme - Base Physics</CardTitle>
          <p className="text-sm text-gray-400">
            Core design tokens for the Shell and Navigation system
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Color Swatches */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-6 rounded-xl bg-[#0B0C0E] border border-white/10">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-lg bg-[#0B0C0E] border border-white/10" />
                <div>
                  <h4 className="text-sm font-semibold text-white font-mono">#0B0C0E</h4>
                  <p className="text-xs text-gray-500">Background / Warm Black</p>
                </div>
              </div>
              <div className="space-y-2 text-xs text-gray-400">
                <div className="flex justify-between">
                  <span>Variable:</span>
                  <code className="text-gray-300 font-mono">--void-bg</code>
                </div>
                <div className="flex justify-between">
                  <span>Usage:</span>
                  <span className="text-gray-300">App background, main canvas</span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-[#0B0C0E] border border-white/10">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-lg bg-[#141517] border border-white/10" />
                <div>
                  <h4 className="text-sm font-semibold text-white font-mono">#141517</h4>
                  <p className="text-xs text-gray-500">Surface / Card Background</p>
                </div>
              </div>
              <div className="space-y-2 text-xs text-gray-400">
                <div className="flex justify-between">
                  <span>Variable:</span>
                  <code className="text-gray-300 font-mono">--void-surface</code>
                </div>
                <div className="flex justify-between">
                  <span>Usage:</span>
                  <span className="text-gray-300">Cards, modals, elevated UI</span>
                </div>
              </div>
            </div>
          </div>

          {/* Border Tokens */}
          <div className="p-6 rounded-xl bg-black/40 border border-white/10">
            <h4 className="text-sm font-semibold text-white mb-4">Border Specifications</h4>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <div className="h-16 rounded-lg border border-white/5 mb-2 flex items-center justify-center">
                  <span className="text-xs text-gray-600 font-mono">White/6%</span>
                </div>
                <p className="text-xs text-gray-500">Default State</p>
              </div>
              <div>
                <div className="h-16 rounded-lg border border-white/10 mb-2 flex items-center justify-center">
                  <span className="text-xs text-gray-500 font-mono">White/10%</span>
                </div>
                <p className="text-xs text-gray-500">Elevated State</p>
              </div>
              <div>
                <div className="h-16 rounded-lg border border-white/20 mb-2 flex items-center justify-center">
                  <span className="text-xs text-gray-400 font-mono">White/12%</span>
                </div>
                <p className="text-xs text-gray-500">Active State</p>
              </div>
            </div>
          </div>

          {/* Typography */}
          <div className="p-6 rounded-xl bg-black/40 border border-white/10">
            <h4 className="text-sm font-semibold text-white mb-4">Typography System</h4>
            <div className="space-y-3">
              <div className="p-3 bg-[#0B0C0E] rounded-lg">
                <p className="text-white mb-1" style={{ fontFamily: 'Inter, Geist Sans, sans-serif', letterSpacing: '-0.01em' }}>
                  The quick brown fox jumps over the lazy dog
                </p>
                <div className="text-xs text-gray-500 space-y-0.5">
                  <div>Font Family: Inter / Geist Sans</div>
                  <div>Letter Spacing: -0.01em (tighter tracking)</div>
                  <div>Usage: All interface text</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Command Palette Component */}
      <Card className="bg-[#141517] border-white/10">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Component: Command_Palette</CardTitle>
          <p className="text-sm text-gray-400">
            The new navigation paradigm - modal command center
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Interactive Demo */}
          <div className="relative">
            <button
              onClick={() => setIsPaletteOpen(true)}
              className="w-full p-8 rounded-xl bg-gradient-to-br from-[#0B0C0E] to-black border border-white/10 hover:border-white/20 transition-all"
            >
              <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <span className="text-sm text-blue-400 font-medium">Click to open Command Palette</span>
                  <kbd className="px-2 py-1 text-xs bg-blue-500/20 rounded border border-blue-500/30 font-mono text-blue-300">
                    ⌘K
                  </kbd>
                </div>
                <p className="text-xs text-gray-500">
                  Experience the modal navigation system
                </p>
              </div>
            </button>

            <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
          </div>

          {/* Specifications */}
          <div className="p-6 rounded-xl bg-black/40 border border-white/10">
            <h4 className="text-sm font-semibold text-white mb-4">Component Specifications</h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Container</h5>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex justify-between">
                    <span>Width:</span>
                    <code className="text-gray-300 font-mono">640px</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Background:</span>
                    <code className="text-gray-300 font-mono">#141517</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Border:</span>
                    <code className="text-gray-300 font-mono">White/10, 1px</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Radius:</span>
                    <code className="text-gray-300 font-mono">12px (rounded-xl)</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Shadow:</span>
                    <code className="text-gray-300 font-mono">Heavy Drop</code>
                  </li>
                </ul>
              </div>

              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Input Field</h5>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex justify-between">
                    <span>Height:</span>
                    <code className="text-gray-300 font-mono">48px</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Border:</span>
                    <code className="text-gray-300 font-mono">Bottom White/5</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Icon:</span>
                    <code className="text-gray-300 font-mono">Search (Left)</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Placeholder:</span>
                    <code className="text-gray-300 font-mono text-xs">Type a command...</code>
                  </li>
                </ul>
              </div>

              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">List Items</h5>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex justify-between">
                    <span>Height:</span>
                    <code className="text-gray-300 font-mono">40px</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Padding:</span>
                    <code className="text-gray-300 font-mono">12px</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Default:</span>
                    <code className="text-gray-300 font-mono">Text Gray-400</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Active:</span>
                    <code className="text-gray-300 font-mono">BG White/5</code>
                  </li>
                  <li className="flex justify-between">
                    <span>Active Border:</span>
                    <code className="text-gray-300 font-mono">Left 2px Blue-500</code>
                  </li>
                </ul>
              </div>

              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Sections</h5>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>Jump to...</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span>Active MPs</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <span>System</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Effect Specification */}
          <div className="p-6 rounded-xl bg-black/40 border border-white/10">
            <h4 className="text-sm font-semibold text-white mb-4">Effect: Drop Shadow "Heavy"</h4>
            <div className="grid md:grid-cols-4 gap-4 text-xs text-gray-400">
              <div>
                <span className="text-gray-500">Blur:</span>
                <code className="block text-gray-300 font-mono mt-1">40px</code>
              </div>
              <div>
                <span className="text-gray-500">Y Offset:</span>
                <code className="block text-gray-300 font-mono mt-1">20px</code>
              </div>
              <div>
                <span className="text-gray-500">Color:</span>
                <code className="block text-gray-300 font-mono mt-1">Black</code>
              </div>
              <div>
                <span className="text-gray-500">Opacity:</span>
                <code className="block text-gray-300 font-mono mt-1">50%</code>
              </div>
            </div>
            <div className="mt-4 p-4 bg-[#0B0C0E] rounded-lg">
              <code className="text-xs text-gray-400 font-mono">
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
              </code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Layout Assembly */}
      <Card className="bg-[#141517] border-white/10">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Layout Assembly - New Navigation Paradigm</CardTitle>
          <p className="text-sm text-gray-400">
            Minimal shell with command palette trigger
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Live Demo */}
          <div className="relative h-[500px] rounded-xl overflow-hidden border border-white/10">
            {/* Background */}
            <div className="absolute inset-0 bg-[#0B0C0E]">
              {/* Menu Trigger */}
              <div className="relative z-10">
                <MenuTrigger onClick={() => setIsPaletteOpen(true)} variant="command" />
              </div>

              {/* Main Content Area */}
              <div className="h-full flex items-center justify-center p-8">
                <div className="text-center space-y-4 max-w-xl">
                  <h3 className="text-2xl font-bold text-white" style={{ letterSpacing: '-0.01em' }}>
                    Clean, Minimal Shell
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    The top navigation bar has been completely removed. Access all navigation through the 
                    command palette (⌘K) triggered by the discrete menu button in the top-left corner.
                  </p>
                  <div className="flex justify-center gap-3 pt-4">
                    <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                      No Nav Bar
                    </Badge>
                    <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                      Modal-First
                    </Badge>
                    <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                      Keyboard-Driven
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Assembly Specs */}
          <div className="p-6 rounded-xl bg-black/40 border border-white/10">
            <h4 className="text-sm font-semibold text-white mb-4">Assembly Specifications</h4>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-[#0B0C0E] rounded-lg border border-blue-500/20">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white text-sm font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <h5 className="text-sm font-semibold text-white mb-1">Remove Top Navigation</h5>
                  <p className="text-xs text-gray-400">
                    Eliminate traditional horizontal nav bar entirely. Maximize vertical space for content.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-[#0B0C0E] rounded-lg border border-green-500/20">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white text-sm font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <h5 className="text-sm font-semibold text-white mb-1">Menu Trigger (Fixed Position)</h5>
                  <p className="text-xs text-gray-400">
                    Place discrete hamburger/command button in top-left corner. Position: Fixed, Top: 24px, Left: 24px.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-[#0B0C0E] rounded-lg border border-purple-500/20">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500 text-white text-sm font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <h5 className="text-sm font-semibold text-white mb-1">Command Palette (Overlay)</h5>
                  <p className="text-xs text-gray-400">
                    Center modal overlay with backdrop blur. Opens with ⌘K shortcut or menu button click.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="p-6 rounded-xl bg-black/40 border border-white/10">
            <h4 className="text-sm font-semibold text-white mb-4">Keyboard Shortcuts</h4>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="flex items-center gap-3 p-3 bg-[#0B0C0E] rounded-lg">
                <kbd className="px-2 py-1 text-sm bg-white/5 rounded border border-white/10 font-mono text-gray-300">
                  ⌘K
                </kbd>
                <span className="text-sm text-gray-400">Open Palette</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[#0B0C0E] rounded-lg">
                <kbd className="px-2 py-1 text-sm bg-white/5 rounded border border-white/10 font-mono text-gray-300">
                  ↑↓
                </kbd>
                <span className="text-sm text-gray-400">Navigate Items</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[#0B0C0E] rounded-lg">
                <kbd className="px-2 py-1 text-sm bg-white/5 rounded border border-white/10 font-mono text-gray-300">
                  Esc
                </kbd>
                <span className="text-sm text-gray-400">Close Palette</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
