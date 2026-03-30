import React from 'react';
import { Calendar, ChevronRight, CheckCircle2, XCircle, Clock, FileText } from 'lucide-react';
import { cn } from './ui/utils';

type VoteResultVariant = 'Accepted' | 'Rejected' | 'Other';

interface VoteListCardProps {
  title: string;
  date: string;
  status: string;
  resultType: VoteResultVariant;
  onClick?: () => void;
}

export function VoteListCard({
  title,
  date,
  status,
  resultType,
  onClick,
}: VoteListCardProps) {
  
  // Refined Status Theme
  const theme = resultType === 'Accepted' 
    ? { 
        icon: CheckCircle2, 
        text: 'text-emerald-600 dark:text-emerald-500', 
        bg: 'bg-emerald-100/50 dark:bg-emerald-900/20', 
        border: 'border-emerald-200 dark:border-emerald-900/50',
        badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
        stripe: 'bg-emerald-500'
      }
    : resultType === 'Rejected'
    ? { 
        icon: XCircle, 
        text: 'text-red-600 dark:text-red-500', 
        bg: 'bg-red-100/50 dark:bg-red-900/20', 
        border: 'border-red-200 dark:border-red-900/50',
        badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        stripe: 'bg-red-500'
      }
    : { 
        icon: Clock, 
        text: 'text-muted-foreground', 
        bg: 'bg-muted', 
        border: 'border-border',
        badge: 'bg-muted text-muted-foreground',
        stripe: 'bg-muted-foreground'
      };

  const Icon = theme.icon;

  return (
    <button
      className="group w-full text-left p-0 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all duration-200 flex overflow-hidden relative"
      onClick={onClick}
    >
        {/* Status Stripe */}
        <div className={cn("w-1.5 absolute left-0 top-0 bottom-0 transition-colors", theme.stripe)}></div>

        <div className="flex-1 flex items-start gap-4 p-5 pl-7">
            {/* Icon Box */}
            <div className={cn(
                "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center mt-0.5 transition-colors", 
                theme.bg
            )}>
                <Icon className={cn("w-5 h-5", theme.text)} strokeWidth={2} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Įstatymo Projektas</span>
                    {resultType === 'Other' && <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>}
                </div>
                
                <h3 className="text-base font-bold text-card-foreground mb-3 leading-snug group-hover:text-primary transition-colors line-clamp-2">
                {title}
                </h3>
                
                <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-medium text-muted-foreground">
                    <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{date}</span>
                    </div>
                    
                    <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold",
                        theme.badge
                    )}>
                        {status}
                    </span>
                    
                    <div className="flex items-center gap-1 ml-auto text-muted-foreground/70 group-hover:text-primary transition-colors text-[11px]">
                        <FileText size={12} />
                        <span className="hidden sm:inline">Peržiūrėti detales</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Action Arrow (Subtle) */}
        <div className="hidden sm:flex w-12 items-center justify-center border-l border-border bg-muted/20 group-hover:bg-primary/5 transition-colors">
            <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
        </div>
    </button>
  );
}
