import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, FileText, Gavel, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { cn } from './ui/utils';
import { Badge } from './ui/badge';

// --- Types ---

type EventType = 'submission' | 'hearing' | 'vote' | 'veto' | 'signature';
type EventStatus = 'passed' | 'blocked' | 'pending' | 'current';

interface TimelineEvent {
  id: string;
  type: EventType;
  status: EventStatus;
  date: string;
  title: string;
  description: string;
  progress: number; // 0 to 100
  thumbnail?: string; // Color or image placeholder
}

// --- Mock Data ---

const MOCK_TIMELINE: TimelineEvent[] = [
  {
    id: '1',
    type: 'submission',
    status: 'passed',
    date: 'Jan 10, 2025',
    title: 'Bill Registered',
    description: 'Initial submission to the Seimas secretariat.',
    progress: 0,
    thumbnail: 'bg-blue-500'
  },
  {
    id: '2',
    type: 'hearing',
    status: 'passed',
    date: 'Jan 15, 2025',
    title: 'Budget Committee',
    description: 'Review of financial impact and amendments.',
    progress: 25,
    thumbnail: 'bg-purple-500'
  },
  {
    id: '3',
    type: 'vote',
    status: 'passed',
    date: 'Feb 01, 2025',
    title: 'First Reading',
    description: 'Parliamentary debate and initial voting phase.',
    progress: 50,
    thumbnail: 'bg-green-500'
  },
  {
    id: '4',
    type: 'vote',
    status: 'passed',
    date: 'Feb 14, 2025',
    title: 'Final Adoption',
    description: 'Final vote: 84 For, 12 Against.',
    progress: 80,
    thumbnail: 'bg-yellow-500'
  },
  {
    id: '5',
    type: 'veto',
    status: 'current',
    date: 'Feb 20, 2025',
    title: 'Presidential Veto',
    description: 'President returns bill for reconsideration.',
    progress: 90,
    thumbnail: 'bg-red-500'
  },
  {
    id: '6',
    type: 'signature',
    status: 'pending',
    date: 'Est. Mar 01',
    title: 'Law Enactment',
    description: 'Final signature and publication.',
    progress: 100,
    thumbnail: 'bg-gray-700'
  }
];

// --- Sub-Components ---

function EventMarker({ 
  event, 
  onHover, 
  onLeave 
}: { 
  event: TimelineEvent; 
  onHover: (e: React.MouseEvent, event: TimelineEvent) => void; 
  onLeave: () => void;
}) {
  const isDiamond = event.type === 'vote' || event.type === 'veto';
  
  // Status Colors
  const getStatusColor = () => {
    switch (event.status) {
      case 'passed': return 'bg-green-500 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]';
      case 'blocked': return 'bg-red-500 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]';
      case 'current': return 'bg-blue-500 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-pulse';
      default: return 'bg-gray-700 border-gray-600';
    }
  };

  return (
    <div 
      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer group z-20"
      style={{ left: `${event.progress}%` }}
      onMouseEnter={(e) => onHover(e, event)}
      onMouseLeave={onLeave}
    >
      {/* The Marker Shape */}
      <div 
        className={cn(
          "transition-all duration-300 border-2",
          isDiamond ? "w-4 h-4 rotate-45" : "w-4 h-4 rounded-full",
          getStatusColor(),
          "group-hover:scale-150 group-hover:z-30"
        )}
      />
      
      {/* Pulse Effect for Current */}
      {event.status === 'current' && (
         <div className={cn(
             "absolute inset-0 rounded-full animate-ping opacity-75",
             isDiamond ? "rotate-45" : "",
             "bg-blue-400"
         )} />
      )}
    </div>
  );
}

function TooltipPreview({ event, position }: { event: TimelineEvent; position: { x: number } }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 5, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="absolute bottom-full mb-4 z-50 pointer-events-none"
      style={{ left: position.x, transform: 'translateX(-50%)' }}
    >
      <div className="w-64 bg-gray-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl shadow-black/50">
        {/* Header / Mini Video Area */}
        <div className={cn("h-32 relative flex items-center justify-center", event.thumbnail || 'bg-gray-800')}>
           {/* Play Overlay */}
           <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg">
                 <Play size={16} className="text-white fill-white ml-0.5" />
              </div>
           </div>
           
           {/* Live Badge if current */}
           {event.status === 'current' && (
              <Badge className="absolute top-2 right-2 bg-red-500/90 text-white border-none animate-pulse">
                LIVE
              </Badge>
           )}
        </div>

        {/* Content */}
        <div className="p-3 bg-gray-900">
           <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono text-blue-400 uppercase">{event.type}</span>
              <span className="text-[10px] text-gray-500">{event.date}</span>
           </div>
           <h4 className="font-bold text-white text-sm mb-1 leading-tight">{event.title}</h4>
           <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
             {event.description}
           </p>
        </div>
        
        {/* Footer Status Bar */}
        <div className={cn(
            "h-1 w-full",
            event.status === 'passed' ? 'bg-green-500' :
            event.status === 'blocked' ? 'bg-red-500' :
            event.status === 'current' ? 'bg-blue-500' : 'bg-gray-700'
        )} />
      </div>

      {/* Arrow */}
      <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-gray-900" />
    </motion.div>
  );
}

export function BillTimelineScrubber() {
  const [hoveredEvent, setHoveredEvent] = useState<TimelineEvent | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0 });

  // Find progress for playhead
  const currentEvent = MOCK_TIMELINE.find(e => e.status === 'current');
  const playheadProgress = currentEvent ? currentEvent.progress : 0;

  const handleHover = (e: React.MouseEvent, event: TimelineEvent) => {
    // Calculate position relative to container
    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
    if (rect) {
        // e.currentTarget is the marker div. We want center of marker relative to container.
        // Actually simplest is just use event.progress% since container is relative.
        // But for tooltip pixel positioning we might want pixels or just use style left.
        
        // Let's use the event.progress to position the tooltip wrapper in CSS,
        // but we need to pass that down.
        // Actually, we can just render the tooltip INSIDE the map loop but outside the marker if we want,
        // OR render it once at the parent level and update 'left'.
        
        // Let's update state with a pixel value or percentage for smooth movement?
        // Percentage is easier.
    }
    setHoveredEvent(event);
  };

  return (
    <div className="w-full py-16 px-4 select-none">
      <div className="max-w-4xl mx-auto relative h-12 flex items-center group/container">
        
        {/* Tooltip Layer */}
        <AnimatePresence>
          {hoveredEvent && (
            <div 
                className="absolute top-0 h-full pointer-events-none z-50"
                style={{ left: `${hoveredEvent.progress}%` }}
            >
                <TooltipPreview event={hoveredEvent} position={{ x: 0 }} />
            </div>
          )}
        </AnimatePresence>

        {/* 1. The Track (Rail) */}
        <div className="absolute left-0 right-0 h-1 bg-white/10 rounded-full overflow-hidden">
           {/* Progress Fill (Grayed out past history) */}
           <div 
             className="h-full bg-white/20" 
             style={{ width: `${playheadProgress}%` }}
           />
        </div>

        {/* 2. The Playhead (Current Status) */}
        <motion.div 
           className="absolute top-1/2 -translate-y-1/2 z-30 flex flex-col items-center"
           style={{ left: `${playheadProgress}%` }}
           initial={{ opacity: 0, scale: 0 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: 0.5, type: 'spring' }}
        >
           {/* The Line */}
           <div className="h-16 w-[2px] bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,1)] relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-2 w-max pointer-events-none">
                 <div className="bg-blue-500/10 border border-blue-500/50 text-blue-400 text-[10px] font-mono px-2 py-0.5 rounded uppercase tracking-wider backdrop-blur-sm">
                    Current Stage
                 </div>
              </div>
           </div>
           
           {/* Grip Handle */}
           <div className="w-4 h-8 rounded-sm bg-blue-500 border-2 border-white shadow-lg -mt-8 flex items-center justify-center gap-[2px]">
              <div className="w-[1px] h-3 bg-black/40" />
              <div className="w-[1px] h-3 bg-black/40" />
           </div>
        </motion.div>

        {/* 3. Event Markers */}
        <div className="absolute inset-0 w-full h-full">
            {MOCK_TIMELINE.map((event) => (
                <EventMarker 
                    key={event.id} 
                    event={event} 
                    onHover={handleHover}
                    onLeave={() => setHoveredEvent(null)}
                />
            ))}
        </div>
        
      </div>
      
      {/* Legend / Footer context */}
      <div className="max-w-4xl mx-auto flex justify-between mt-4 text-xs text-gray-500 font-mono">
         <div>START: Jan 10</div>
         <div>EST. END: Mar 01</div>
      </div>
    </div>
  );
}
