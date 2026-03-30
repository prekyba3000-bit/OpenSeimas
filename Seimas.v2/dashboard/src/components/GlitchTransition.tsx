import { motion, AnimatePresence } from 'motion/react';
import React, { ReactNode } from 'react';
import { cn } from './ui/utils';

interface GlitchTransitionProps {
  children: ReactNode;
  className?: string;
  itemKey: string;
}

export function GlitchTransition({ children, className, itemKey }: GlitchTransitionProps) {
  return (
    <div className={cn("relative overflow-hidden w-full h-full min-h-[600px]", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={itemKey}
          className="w-full h-full"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={{
            initial: { 
                opacity: 0, 
                scale: 1.1, 
                filter: "blur(10px)"
            },
            animate: { 
                opacity: 1, 
                scale: 1,
                filter: "blur(0px)",
                transition: { 
                    duration: 0.6,
                    ease: [0.16, 1, 0.3, 1], // Ease Out Expo/Quart
                }
            },
            exit: { 
                x: "-10%", // Subtle slide left
                opacity: 0,
                scale: 0.95,
                filter: "hue-rotate(90deg) blur(5px)", // Chromatic/Glitch simulation
                transition: { 
                    duration: 0.4,
                    ease: "easeInOut"
                }
            }
          }}
          // Specific Glitch Step for Exit start
          onAnimationStart={() => {
             // Optional: Audio trigger here
          }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
