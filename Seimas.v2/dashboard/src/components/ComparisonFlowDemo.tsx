import React, { useState, useEffect } from 'react';
import { MpSelector } from './MpSelector';
import { AlignmentResultCard } from './AlignmentResultCard';
import { RotateCcw } from 'lucide-react';

type FlowState = 'selection' | 'loading' | 'results';

interface ComparisonFlowDemoProps {
  autoPlay?: boolean;
}

export function ComparisonFlowDemo({ autoPlay = false }: ComparisonFlowDemoProps) {
  const [flowState, setFlowState] = useState<FlowState>('selection');
  const [mp1, setMp1] = useState<any>(null);
  const [mp2, setMp2] = useState<any>(null);

  const mp1Data = {
    name: 'Andrius Kubilius',
    party: 'Tėvynės sąjunga',
  };

  const mp2Data = {
    name: 'Gintautas Paluckas',
    party: 'LSDP',
  };

  // Handle flow progression
  useEffect(() => {
    if (mp1 && mp2 && flowState === 'selection') {
      // Step 3: After delay, move to loading
      const timer = setTimeout(() => {
        setFlowState('loading');
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [mp1, mp2, flowState]);

  useEffect(() => {
    if (flowState === 'loading') {
      // Step 4: After loading delay, show results
      const timer = setTimeout(() => {
        setFlowState('results');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [flowState]);

  const handleSelectMp1 = () => {
    if (!mp1 && flowState === 'selection') {
      setMp1(mp1Data);
    }
  };

  const handleSelectMp2 = () => {
    if (!mp2 && flowState === 'selection') {
      setMp2(mp2Data);
    }
  };

  const handleReset = () => {
    setMp1(null);
    setMp2(null);
    setFlowState('selection');
  };

  const getStateLabel = () => {
    switch (flowState) {
      case 'selection':
        return 'State 1: Selection';
      case 'loading':
        return 'State 2: Loading';
      case 'results':
        return 'State 3: Results';
    }
  };

  return (
    <div className="space-y-6">
      {/* State Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${flowState === 'selection' ? 'bg-blue-500' : 'bg-gray-700'}`} />
            <span className={`text-sm ${flowState === 'selection' ? 'text-white font-semibold' : 'text-gray-500'}`}>
              Selection
            </span>
          </div>
          <div className="w-8 h-px bg-gray-700" />
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${flowState === 'loading' ? 'bg-blue-500 animate-pulse' : 'bg-gray-700'}`} />
            <span className={`text-sm ${flowState === 'loading' ? 'text-white font-semibold' : 'text-gray-500'}`}>
              Loading
            </span>
          </div>
          <div className="w-8 h-px bg-gray-700" />
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${flowState === 'results' ? 'bg-green-500' : 'bg-gray-700'}`} />
            <span className={`text-sm ${flowState === 'results' ? 'text-white font-semibold' : 'text-gray-500'}`}>
              Results
            </span>
          </div>
        </div>

        {/* Reset Button */}
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset Flow
        </button>
      </div>

      {/* Current State Label */}
      <div className="text-center">
        <div className="inline-block px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <span className="text-sm font-mono text-blue-400">{getStateLabel()}</span>
        </div>
      </div>

      {/* Selection State */}
      {flowState === 'selection' && (
        <div className="grid grid-cols-[1fr_auto_1fr] gap-8 items-center animate-in fade-in duration-300">
          {/* Left Selector */}
          <div className="flex justify-end">
            <div className="w-full max-w-md">
              <MpSelector
                mp={mp1}
                onClick={handleSelectMp1}
                placeholder="Select first MP..."
              />
            </div>
          </div>

          {/* VS Badge */}
          <div className="relative flex items-center justify-center">
            <div
              className="relative w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center z-10"
              style={{
                boxShadow: '0 10px 20px rgba(59, 130, 246, 0.5), 0 0 0 4px #0a0a0c',
              }}
            >
              <span className="text-white font-bold text-xl">VS</span>
            </div>
          </div>

          {/* Right Selector */}
          <div className="flex justify-start">
            <div className="w-full max-w-md">
              <MpSelector
                mp={mp2}
                onClick={handleSelectMp2}
                placeholder="Select second MP..."
              />
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {flowState === 'loading' && (
        <div className="animate-in fade-in zoom-in-95 duration-500">
          <AlignmentResultCard
            score={0}
            isLoading={true}
            showDivergences={false}
            mp1Name={mp1?.name}
            mp2Name={mp2?.name}
          />
        </div>
      )}

      {/* Results State */}
      {flowState === 'results' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 zoom-in-95 duration-700">
          <AlignmentResultCard
            score={85}
            isLoading={false}
            showDivergences={true}
            mp1Name={mp1?.name}
            mp2Name={mp2?.name}
          />
        </div>
      )}

      {/* Flow Instructions */}
      <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-800">
        <h4 className="text-sm font-semibold text-white mb-2">Prototype Flow Logic</h4>
        <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
          <li>Click left selector to choose first MP (Smart Animate to Active_Selection)</li>
          <li>Click right selector to choose second MP (Smart Animate to Active_Selection)</li>
          <li>When both selected → After Delay (50ms) → Navigate to Loading state</li>
          <li>Loading state shows spinner animation → After Delay (1500ms) → Navigate to Results</li>
          <li>Results state displays 85% alignment score and divergence list</li>
        </ol>
      </div>
    </div>
  );
}