import React, { useState, useRef, useEffect } from 'react';
import { MobileVoteStrip } from './MobileVoteStrip';
import { Info, Bookmark } from 'lucide-react';

interface SwipeableVoteItemProps {
  title: string;
  outcome: 'PASSED' | 'FAILED' | 'DEFERRED';
  votesFor?: number;
  votesAgainst?: number;
  onDetails?: () => void;
  onBookmark?: () => void;
  onClick?: () => void;
}

export function SwipeableVoteItem({
  title,
  outcome,
  votesFor,
  votesAgainst,
  onDetails,
  onBookmark,
  onClick,
}: SwipeableVoteItemProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [revealed, setRevealed] = useState<'left' | 'right' | null>(null);
  const startX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const SWIPE_THRESHOLD = 60; // Pixels to swipe before triggering action
  const MAX_SWIPE = 100; // Maximum swipe distance
  
  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    
    // Limit swipe distance
    const limitedDiff = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, diff));
    setOffsetX(limitedDiff);
  };
  
  const handleTouchEnd = () => {
    setIsDragging(false);
    
    if (offsetX < -SWIPE_THRESHOLD) {
      // Swipe left - reveal details
      setRevealed('left');
      setOffsetX(-MAX_SWIPE);
      setTimeout(() => {
        onDetails?.();
        resetPosition();
      }, 300);
    } else if (offsetX > SWIPE_THRESHOLD) {
      // Swipe right - reveal bookmark
      setRevealed('right');
      setOffsetX(MAX_SWIPE);
      setTimeout(() => {
        onBookmark?.();
        resetPosition();
      }, 300);
    } else {
      // Snap back
      resetPosition();
    }
  };
  
  const resetPosition = () => {
    setOffsetX(0);
    setRevealed(null);
  };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    startX.current = e.clientX;
    setIsDragging(true);
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const currentX = e.clientX;
    const diff = currentX - startX.current;
    const limitedDiff = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, diff));
    setOffsetX(limitedDiff);
  };
  
  const handleMouseUp = () => {
    if (!isDragging) return;
    handleTouchEnd();
  };
  
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        if (offsetX < -SWIPE_THRESHOLD) {
          setRevealed('left');
          setOffsetX(-MAX_SWIPE);
          setTimeout(() => {
            onDetails?.();
            resetPosition();
          }, 300);
        } else if (offsetX > SWIPE_THRESHOLD) {
          setRevealed('right');
          setOffsetX(MAX_SWIPE);
          setTimeout(() => {
            onBookmark?.();
            resetPosition();
          }, 300);
        } else {
          resetPosition();
        }
      }
    };
    
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging, offsetX]);
  
  return (
    <div 
      ref={containerRef}
      className="relative overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Left action - Details (Gray) */}
      <div 
        className="absolute right-0 top-0 bottom-0 flex items-center justify-end px-6 bg-gray-700/50"
        style={{
          width: Math.abs(Math.min(offsetX, 0)),
          opacity: offsetX < 0 ? 1 : 0,
          transition: isDragging ? 'none' : 'opacity 200ms',
        }}
      >
        <Info className="w-5 h-5 text-gray-300" />
      </div>
      
      {/* Right action - Bookmark (Neon Outline) */}
      <div 
        className="absolute left-0 top-0 bottom-0 flex items-center justify-start px-6 bg-blue-500/10 border-l-2 border-blue-400"
        style={{
          width: Math.max(offsetX, 0),
          opacity: offsetX > 0 ? 1 : 0,
          boxShadow: offsetX > 0 ? '0 0 20px rgba(59, 130, 246, 0.3)' : 'none',
          transition: isDragging ? 'none' : 'opacity 200ms',
        }}
      >
        <Bookmark className="w-5 h-5 text-blue-400" />
      </div>
      
      {/* Main content (swipeable) */}
      <div
        className="relative"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? 'none' : 'transform 200ms ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        <MobileVoteStrip
          title={title}
          outcome={outcome}
          votesFor={votesFor}
          votesAgainst={votesAgainst}
          onClick={onClick}
        />
      </div>
      
      {/* Swipe hint indicators (only show when not swiping) */}
      {!isDragging && offsetX === 0 && (
        <>
          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-blue-400/20 pointer-events-none">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400/20 pointer-events-none">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </div>
        </>
      )}
    </div>
  );
}
