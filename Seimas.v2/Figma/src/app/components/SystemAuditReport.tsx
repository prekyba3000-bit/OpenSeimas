import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { AlertTriangle, CheckCircle, XCircle, Search, Grid, Eye } from 'lucide-react';
import { Progress } from './ui/progress';

interface AuditItemProps {
  severity: 'high' | 'medium' | 'low';
  message: string;
  context: string;
  value: string;
}

function AuditItem({ severity, message, context, value }: AuditItemProps) {
  const colors = {
    high: 'text-magenta-500 border-magenta-500/20 bg-magenta-500/10', // Glitch color
    medium: 'text-orange-400 border-orange-500/20 bg-orange-500/10',
    low: 'text-blue-400 border-blue-500/20 bg-blue-500/10',
  };

  const icons = {
    high: <AlertTriangle className="w-4 h-4 text-[#FF00FF]" />, // Magenta
    medium: <AlertTriangle className="w-4 h-4 text-orange-400" />,
    low: <CheckCircle className="w-4 h-4 text-blue-400" />,
  };

  return (
    <div className="flex items-start gap-4 p-3 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
      <div className="mt-1">{icons[severity]}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-gray-200 truncate">{message}</p>
          <code className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${severity === 'high' ? 'border-[#FF00FF]/30 text-[#FF00FF]' : 'border-white/10 text-gray-400'}`}>
            {value}
          </code>
        </div>
        <p className="text-xs text-gray-500 mt-1 font-mono">{context}</p>
      </div>
    </div>
  );
}

export function SystemAuditReport() {
  return (
    <div className="space-y-6">
      
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#0B0C0E] border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-[#FF00FF]/10 text-[#FF00FF]">
                <Search size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Color Violations</p>
                <h3 className="text-2xl font-bold text-white">12</h3>
              </div>
            </div>
            <Progress value={85} className="h-1 mt-4 bg-gray-800" indicatorClassName="bg-[#FF00FF]" />
          </CardContent>
        </Card>

        <Card className="bg-[#0B0C0E] border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-500/10 text-orange-400">
                <Grid size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Grid Errors</p>
                <h3 className="text-2xl font-bold text-white">5</h3>
              </div>
            </div>
            <Progress value={92} className="h-1 mt-4 bg-gray-800" indicatorClassName="bg-orange-500" />
          </CardContent>
        </Card>

        <Card className="bg-[#0B0C0E] border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10 text-blue-400">
                <Eye size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Low Contrast</p>
                <h3 className="text-2xl font-bold text-white">3</h3>
              </div>
            </div>
            <Progress value={98} className="h-1 mt-4 bg-gray-800" indicatorClassName="bg-blue-500" />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Color Audit */}
        <Card className="bg-[#0B0C0E] border-gray-800">
          <CardHeader>
             <CardTitle className="text-lg text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#FF00FF] animate-pulse"/>
                Color Audit (Strict)
             </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
             <AuditItem 
                severity="high" 
                message="Untokenized Hex Found" 
                context="src/app/components/MpCard.tsx:32" 
                value="#6b7280" 
             />
             <AuditItem 
                severity="high" 
                message="Untokenized Hex Found" 
                context="src/app/components/DataStripVote.tsx:38" 
                value="#1C1D21" 
             />
             <AuditItem 
                severity="medium" 
                message="Hardcoded Alpha Shadow" 
                context="src/app/components/MpCard.tsx:44" 
                value="rgba(0,0,0,0.3)" 
             />
              <AuditItem 
                severity="low" 
                message="Party Color (Excluded)" 
                context="src/app/components/MpCard.tsx:7" 
                value="#3b82f6" 
             />
          </CardContent>
        </Card>

        {/* Grid & Layout Audit */}
        <Card className="bg-[#0B0C0E] border-gray-800">
           <CardHeader>
             <CardTitle className="text-lg text-white flex items-center gap-2">
                <Grid size={16} className="text-orange-400"/>
                Grid Enforcement (4px System)
             </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <AuditItem 
                severity="medium" 
                message="Non-4px Width (3.5 = 14px)" 
                context="src/app/components/MpCard.tsx:81" 
                value="w-3.5" 
             />
             <AuditItem 
                severity="medium" 
                message="Non-4px Gap (1.5 = 6px)" 
                context="src/app/components/MpCard.tsx:80" 
                value="gap-1.5" 
             />
             <AuditItem 
                severity="medium" 
                message="Odd Text Size (11px)" 
                context="src/app/components/DataStripVote.tsx:53" 
                value="text-[11px]" 
             />
          </CardContent>
        </Card>

         {/* Contrast & A11y Audit */}
         <Card className="bg-[#0B0C0E] border-gray-800 col-span-1 lg:col-span-2">
           <CardHeader>
             <CardTitle className="text-lg text-white flex items-center gap-2">
                <Eye size={16} className="text-blue-400"/>
                Accessibility & Contrast (WCAG)
             </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
             <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded bg-gray-800 flex items-center justify-center text-gray-500 font-bold">
                        Aa
                    </div>
                    <div>
                        <h4 className="text-white font-medium">Text Gray-500 on Gray-800</h4>
                        <p className="text-xs text-red-400">Ratio: 2.8:1 (FAIL AA)</p>
                    </div>
                </div>
                <Badge variant="destructive">FAIL</Badge>
             </div>

              <div className="flex items-center justify-between p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded bg-[#141517] flex items-center justify-center text-[#22C55E] font-bold">
                        Aa
                    </div>
                    <div>
                        <h4 className="text-white font-medium">Neon Green on Surface</h4>
                        <p className="text-xs text-yellow-400">Ratio: 4.1:1 (WARN AA Small)</p>
                    </div>
                </div>
                <Badge className="bg-yellow-500 text-black hover:bg-yellow-600">WARN</Badge>
             </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
