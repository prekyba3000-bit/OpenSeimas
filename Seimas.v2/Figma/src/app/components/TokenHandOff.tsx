import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Copy, Terminal } from 'lucide-react';
import { toast } from 'sonner';

export function TokenHandOff() {
  const cssBlock = `:root {
  /* Variable Collection: 'System_Physics' */
  --color-bg-base: #0B0C0E;        /* sys.bg.void */
  --color-bg-surface: #141517;     /* sys.bg.surface */
  --border-dim: rgba(255,255,255,0.06); /* sys.border.dim */

  /* Variable Collection: 'Data_Spectrum' */
  --color-data-win: #22C55E;       /* data.win */
  --color-data-loss: #EF4444;      /* data.loss */
  --color-data-meh: #EAB308;       /* data.neutral */
}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(cssBlock);
    toast.success('CSS tokens copied to clipboard');
  };

  return (
    <Card className="bg-[#0B0C0E] border-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Terminal className="text-purple-400" />
            <CardTitle className="text-2xl text-white">Hand-off/Tokens</CardTitle>
          </div>
          <Badge variant="outline" className="border-purple-500/20 text-purple-400 bg-purple-500/10">
            Figma Sync
          </Badge>
        </div>
        <p className="text-sm text-gray-400">
          Generated CSS variables from Figma Collections: <strong>System_Physics</strong> & <strong>Data_Spectrum</strong>
        </p>
      </CardHeader>
      <CardContent>
        <div className="relative group">
          <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={copyToClipboard}
              className="p-2 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Copy to clipboard"
            >
              <Copy size={16} />
            </button>
          </div>
          <pre className="bg-[#141517] p-6 rounded-lg border border-white/5 overflow-x-auto">
            <code className="text-sm font-mono text-gray-300">
              {cssBlock.split('\n').map((line, i) => {
                if (line.trim().startsWith('/*')) {
                  return <div key={i} className="text-gray-500">{line}</div>;
                }
                if (line.includes(':')) {
                    const [prop, val] = line.split(':');
                    return (
                        <div key={i}>
                            <span className="text-blue-400">{prop}</span>:
                            <span className="text-green-400">{val}</span>
                        </div>
                    )
                }
                 return <div key={i}>{line}</div>;
              })}
            </code>
          </pre>
        </div>
        
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
           {/* Color Visualizations */}
           <div className="space-y-2">
              <div className="w-full h-12 rounded border border-white/10" style={{ background: '#0B0C0E' }}></div>
              <div className="text-xs text-gray-500 font-mono">--color-bg-base</div>
           </div>
           <div className="space-y-2">
              <div className="w-full h-12 rounded border border-white/10" style={{ background: '#141517' }}></div>
              <div className="text-xs text-gray-500 font-mono">--color-bg-surface</div>
           </div>
            <div className="space-y-2">
              <div className="w-full h-12 rounded border border-white/10" style={{ background: '#22C55E' }}></div>
              <div className="text-xs text-gray-500 font-mono">--color-data-win</div>
           </div>
            <div className="space-y-2">
              <div className="w-full h-12 rounded border border-white/10" style={{ background: '#EF4444' }}></div>
              <div className="text-xs text-gray-500 font-mono">--color-data-loss</div>
           </div>
        </div>

      </CardContent>
    </Card>
  );
}
