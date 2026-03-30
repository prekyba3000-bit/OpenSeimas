import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from './ui/utils';

interface StatCardProps {
  title: string;
  value: string | React.ReactNode;
  icon: LucideIcon;
  trend?: string;
  trendLabel?: string;
  isPositive?: boolean;
  subtext?: string;
  colorTheme?: 'brand' | 'yellow' | 'gray';
}

export function StatCard({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    trendLabel, 
    isPositive, 
    subtext,
    colorTheme = 'brand' 
}: StatCardProps) {
  
  const themeStyles = {
    brand: "border-t-4 border-t-brand-green",
    yellow: "border-t-4 border-t-brand-yellow",
    gray: "border-t-4 border-t-slate-400",
  };
  
  const iconColorStyles = {
    brand: "text-brand-green bg-brand-green/10",
    yellow: "text-yellow-700 bg-brand-yellow/20",
    gray: "text-slate-600 bg-slate-100",
  };

  return (
    <div
      className={cn(
        "bg-white dark:bg-card relative flex flex-col justify-between p-6 rounded-xl shadow-sm border border-border/60 hover:shadow-lg hover:border-border transition-all duration-300 group",
        themeStyles[colorTheme]
      )}
    >
      {/* Header with Icon */}
      <div className="flex items-start justify-between mb-5">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-1">{title}</span>
        <div className={cn("p-2 rounded-lg transition-transform group-hover:scale-110 duration-300", iconColorStyles[colorTheme])}>
            <Icon className="w-5 h-5" strokeWidth={2} />
        </div>
      </div>

      {/* Value */}
      <div>
        <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">{value}</div>
        
        {trend && (
          <div className="flex items-center gap-2">
            <span className={cn(
                "flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded",
                isPositive === true ? "text-emerald-700 bg-emerald-50" : 
                isPositive === false ? "text-red-700 bg-red-50" : "text-slate-600 bg-slate-100"
            )}>
                {isPositive === true ? <TrendingUp size={12} /> : 
                 isPositive === false ? <TrendingDown size={12} /> : <Minus size={12} />}
                {trend}
            </span>
            {trendLabel && <span className="text-xs text-slate-400 font-medium truncate">{trendLabel}</span>}
          </div>
        )}
        
        {subtext && (
            <div className="text-xs text-slate-500 font-medium mt-1">{subtext}</div>
        )}
      </div>
    </div>
  );
}
