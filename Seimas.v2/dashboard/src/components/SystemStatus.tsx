import React from 'react';
import { CheckCircle, AlertCircle, Activity } from 'lucide-react';

interface SystemLog {
  status: 'ok' | 'warning' | 'error';
  message: string;
  timestamp: string;
}

interface SystemStatusProps {
  health: number; // 0-100
  logs?: SystemLog[];
}

export function SystemStatus({ health, logs = [] }: SystemStatusProps) {
  const defaultLogs: SystemLog[] = [
    { status: 'ok', message: 'Engine: OK', timestamp: '14:32:01' },
    { status: 'ok', message: 'Database: Connected', timestamp: '14:32:02' },
    { status: 'ok', message: 'API: Responsive', timestamp: '14:32:03' },
    { status: 'warning', message: 'Cache: 78% full', timestamp: '14:32:04' },
  ];

  const displayLogs = logs.length > 0 ? logs : defaultLogs;

  const getHealthColor = () => {
    if (health >= 90) return 'bg-green-500';
    if (health >= 70) return 'bg-blue-500';
    if (health >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="w-3 h-3 text-green-400" />;
      case 'warning':
        return <AlertCircle className="w-3 h-3 text-yellow-400" />;
      case 'error':
        return <AlertCircle className="w-3 h-3 text-red-400" />;
      default:
        return <Activity className="w-3 h-3 text-gray-400" />;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 rounded-xl bg-gray-800/30 backdrop-blur-xl border border-white/5">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4">System Health</h3>
        
        {/* Progress Bar */}
        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full ${getHealthColor()} transition-all duration-1000`}
            style={{ width: `${health}%` }}
          />
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500">System Performance</span>
          <span className="text-xs text-gray-400 font-semibold">{health}%</span>
        </div>
      </div>

      {/* Terminal Logs */}
      <div className="bg-black/20 rounded-lg p-4 font-mono text-xs space-y-2">
        {displayLogs.map((log, index) => (
          <div key={index} className="flex items-start gap-2 text-green-400">
            {getStatusIcon(log.status)}
            <span className="text-gray-500">{log.timestamp}</span>
            <span className="flex-1">➜ {log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
