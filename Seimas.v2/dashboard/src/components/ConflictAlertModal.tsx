import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, AlertTriangle, FileText, Briefcase, ChevronRight, X } from 'lucide-react';
import { cn } from './ui/utils';
import { Button } from './ui/button';

interface ConflictAlertProps {
  isOpen: boolean;
  onClose: () => void;
  data?: {
    politicianName: string;
    voteTitle: string;
    assetName: string;
    riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE';
  };
}

const DEFAULT_DATA = {
  politicianName: "MP Jonas Vaitkus",
  voteTitle: "Agricultural Subsidies Act 2025 (Amendment XIV-20)",
  assetName: "Owner, UAB 'AgroTech Solutions'",
  riskLevel: "CRITICAL" as const
};

export function ConflictAlertModal({ isOpen, onClose, data = DEFAULT_DATA }: ConflictAlertProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.3 }}
            className="relative w-full max-w-2xl bg-[#0f0f11] border-2 border-red-500/50 rounded-lg overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.2)]"
          >
            {/* "Anti-Cheat" Scanline Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(255,0,0,0.02),rgba(255,0,0,0.06))] bg-[length:100%_4px,6px_100%]" />
            
            {/* Header */}
            <div className="bg-red-500/10 border-b border-red-500/30 p-6 flex items-start justify-between relative overflow-hidden">
               {/* Flashing Background Element */}
               <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse" />
               
               <div className="flex items-center gap-4 z-10">
                  <div className="relative">
                     <div className="absolute inset-0 bg-red-500 blur-lg opacity-40 animate-pulse" />
                     <ShieldAlert size={48} className="text-red-500 relative z-10" />
                  </div>
                  <div>
                     <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic flex items-center gap-2">
                        Conflict Detected
                        <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-ping" />
                     </h2>
                     <p className="text-red-400 font-mono text-sm uppercase tracking-widest">
                        Security Protocol: Breach_Level_01
                     </p>
                  </div>
               </div>

               <Button 
                 variant="ghost" 
                 size="icon" 
                 onClick={onClose}
                 className="text-gray-500 hover:text-white hover:bg-white/10"
               >
                 <X size={24} />
               </Button>
            </div>

            {/* Body */}
            <div className="p-8 space-y-8 relative">
               
               {/* Context Info */}
               <div className="flex items-center justify-between text-sm text-gray-400 font-mono border-b border-white/5 pb-4">
                  <span>SUBJECT: <span className="text-white font-bold">{data.politicianName}</span></span>
                  <span>TIMESTAMP: {new Date().toLocaleTimeString()}</span>
               </div>

               {/* The Evidence Block */}
               <div className="relative flex flex-col md:flex-row items-stretch gap-8">
                  
                  {/* Connector Line (Desktop) */}
                  <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-[2px] z-0">
                      <div className="w-full h-full border-t-2 border-dashed border-red-500/50" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0f0f11] px-2 text-red-500">
                         <AlertTriangle size={16} />
                      </div>
                  </div>

                  {/* Left: The Vote */}
                  <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-5 relative group hover:border-white/20 transition-colors z-10">
                     <div className="absolute -top-3 left-4 bg-[#0f0f11] px-2 text-xs font-mono text-gray-500 uppercase tracking-wider border border-white/10 rounded">
                        Evidence A: The Vote
                     </div>
                     <div className="flex items-start gap-4 mt-2">
                        <div className="bg-blue-500/20 p-3 rounded-lg text-blue-400">
                           <FileText size={24} />
                        </div>
                        <div>
                           <h4 className="font-bold text-white text-lg leading-tight mb-1">{data.voteTitle}</h4>
                           <div className="text-xs text-gray-400 space-y-1">
                              <p>Type: <span className="text-gray-300">Parliamentary Amendment</span></p>
                              <p>Action: <span className="text-green-400">Voted FOR</span></p>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Right: The Asset */}
                  <div className="flex-1 bg-red-500/5 border border-red-500/30 rounded-xl p-5 relative group hover:bg-red-500/10 transition-colors z-10">
                     <div className="absolute -top-3 right-4 bg-[#0f0f11] px-2 text-xs font-mono text-red-500 uppercase tracking-wider border border-red-500/30 rounded shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                        Evidence B: The Asset
                     </div>
                     <div className="flex items-start gap-4 mt-2">
                         <div className="bg-red-500/20 p-3 rounded-lg text-red-500">
                           <Briefcase size={24} />
                        </div>
                        <div>
                           <h4 className="font-bold text-white text-lg leading-tight mb-1">{data.assetName}</h4>
                           <div className="text-xs text-gray-400 space-y-1">
                              <p>Value: <span className="text-gray-300">Est. €2.5M / Year</span></p>
                              <p>Relation: <span className="text-red-400">Direct Beneficiary</span></p>
                           </div>
                        </div>
                     </div>
                  </div>

               </div>

               {/* Verdict Section */}
               <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                     <div className="w-2 h-12 bg-red-500 rounded-sm" />
                     <div>
                        <div className="text-xs font-mono text-red-400 uppercase tracking-widest mb-0.5">Automated Verdict</div>
                        <div className="text-2xl font-black text-white italic tracking-tighter">
                           RISK LEVEL: <span className="text-red-500">{data.riskLevel}</span>
                        </div>
                     </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                      <div className="text-right hidden md:block">
                         <div className="text-xs text-gray-400">Recommended Action</div>
                         <div className="text-sm font-bold text-white">Flag for Ethics Committee</div>
                      </div>
                      <Button className="bg-red-600 hover:bg-red-700 text-white font-bold border border-red-400 shadow-[0_0_15px_rgba(220,38,38,0.5)]">
                         INVESTIGATE
                      </Button>
                  </div>
               </div>

            </div>
            
            {/* Footer / Decorative Bar */}
            <div className="h-2 w-full bg-gradient-to-r from-red-600 via-red-500 to-red-900" />
            
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
