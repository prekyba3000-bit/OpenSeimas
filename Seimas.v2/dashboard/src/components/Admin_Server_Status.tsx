import React, { useState, useEffect } from 'react';
import { Card as UICard, CardContent as UICardContent, CardHeader as UICardHeader, CardTitle as UICardTitle } from './ui/card';
import { Terminal, Activity, Database, Server, AlertCircle, CheckCircle } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, CartesianGrid, YAxis, Tooltip } from 'recharts';

// Mock Data for Latency
const LATENCY_DATA = Array.from({ length: 20 }, (_, i) => ({
  time: i,
  latency: 45 + Math.random() * 30 + (i % 5 === 0 ? 50 : 0), // Random spikes
}));

// Mock Data for Logs
const LOGS = [
  { id: 1, type: 'info', msg: '[2026-02-07 14:00:01] Syncing MP vote records...', time: '14:00:01' },
  { id: 2, type: 'success', msg: '[2026-02-07 14:00:05] Successfully parsed 142 vote fragments.', time: '14:00:05' },
  { id: 3, type: 'error', msg: '[2026-02-07 14:00:12] Failed to parse asset declaration: ID_NULL', time: '14:00:12' },
  { id: 4, type: 'info', msg: '[2026-02-07 14:00:15] Retrying connection to Seimas API...', time: '14:00:15' },
  { id: 5, type: 'info', msg: '[2026-02-07 14:00:16] Connection established.', time: '14:00:16' },
  { id: 6, type: 'warning', msg: '[2026-02-07 14:00:22] Latency spike detected (120ms).', time: '14:00:22' },
  { id: 7, type: 'info', msg: '[2026-02-07 14:00:25] Indexing ElasticSearch clusters...', time: '14:00:25' },
  { id: 8, type: 'error', msg: '[2026-02-07 14:00:30] Timeout: Image asset /avatars/mp_45.jpg', time: '14:00:30' },
];

export function Admin_Server_Status() {
  // Panel C: Circular Progress Math
  const integrity = 98.4;
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (integrity / 100) * circumference;

  return (
    <div className="w-full bg-[#0B0C0E] border border-gray-800 rounded-xl p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Server className="text-gray-400" />
          <h2 className="text-xl font-bold text-white tracking-wide">SYSTEM_STATUS_CONSOLE</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-mono text-green-500">ONLINE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-[300px]">
        
        {/* Panel A: Ingestion Latency */}
        <UICard className="bg-[#141517] border-white/5 flex flex-col">
          <UICardHeader className="pb-2">
            <UICardTitle className="text-sm font-mono text-gray-400 flex items-center gap-2">
              <Activity size={14} className="text-green-500" />
              SEIMAS API LATENCY
            </UICardTitle>
          </UICardHeader>
          <UICardContent className="flex-1 min-h-[200px] relative">
            <div className="absolute top-0 right-6 text-2xl font-bold text-white font-mono">
              48<span className="text-sm text-gray-500 ml-1">ms</span>
            </div>
            <div className="w-full h-full pt-8">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={LATENCY_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <YAxis 
                    hide={true} 
                    domain={['dataMin - 10', 'dataMax + 10']} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }}
                    itemStyle={{ color: '#22c55e' }}
                    labelStyle={{ display: 'none' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="latency" 
                    stroke="#22c55e" 
                    strokeWidth={2} 
                    dot={false}
                    activeDot={{ r: 4, fill: '#22c55e' }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </UICardContent>
        </UICard>

        {/* Panel B: Error Logs */}
        <UICard className="bg-[#141517] border-white/5 flex flex-col overflow-hidden">
          <UICardHeader className="pb-2 bg-[#1A1B1E] border-b border-white/5">
            <UICardTitle className="text-sm font-mono text-gray-400 flex items-center gap-2">
              <Terminal size={14} className="text-blue-500" />
              SYSTEM_LOGS
            </UICardTitle>
          </UICardHeader>
          <UICardContent className="flex-1 p-0 overflow-hidden relative">
            <div className="absolute inset-0 overflow-y-auto p-4 space-y-2 font-mono text-[10px] scrollbar-thin scrollbar-thumb-gray-800">
              {LOGS.map((log) => (
                <div key={log.id} className="flex gap-2">
                  <span className={`flex-shrink-0 ${
                    log.type === 'error' ? 'text-red-500 font-bold' : 
                    log.type === 'success' ? 'text-green-500' : 
                    log.type === 'warning' ? 'text-yellow-500' : 'text-blue-500'
                  }`}>
                    {log.type === 'error' ? '>' : '$'}
                  </span>
                  <span className={`${
                    log.type === 'error' ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {log.msg}
                  </span>
                </div>
              ))}
              <div className="animate-pulse text-gray-600 mt-2">_</div>
            </div>
          </UICardContent>
        </UICard>

        {/* Panel C: Asset Integrity */}
        <UICard className="bg-[#141517] border-white/5 flex flex-col">
          <UICardHeader className="pb-2">
            <UICardTitle className="text-sm font-mono text-gray-400 flex items-center gap-2">
              <Database size={14} className="text-purple-500" />
              ASSET INTEGRITY
            </UICardTitle>
          </UICardHeader>
          <UICardContent className="flex-1 flex flex-col items-center justify-center">
            <div className="relative w-40 h-40 flex items-center justify-center">
              {/* Background Circle */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke="#1f2937"
                  strokeWidth="8"
                  fill="transparent"
                />
                {/* Progress Circle */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke="#8b5cf6"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              
              {/* Inner Text */}
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-bold text-white">{integrity}%</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Health</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full mt-6">
                <div className="flex flex-col items-center p-2 rounded bg-white/5">
                    <span className="text-xs text-gray-500">Corrupted</span>
                    <span className="text-sm font-bold text-red-400">14 Files</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded bg-white/5">
                    <span className="text-xs text-gray-500">Verified</span>
                    <span className="text-sm font-bold text-green-400">8.4k</span>
                </div>
            </div>
          </UICardContent>
        </UICard>

      </div>
    </div>
  );
}
