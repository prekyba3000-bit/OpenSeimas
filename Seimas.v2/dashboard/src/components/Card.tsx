import { motion } from 'motion/react';
import { CardProps } from '../types';
import { cn } from '../utils';

export const Card = ({ children, className, hover = false, ...props }: CardProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                // `bg-surface` was an undefined utility — no --color-surface
                // exists, so Tailwind emitted nothing and every card in the app
                // rendered with no background at all. It went unnoticed on a
                // dark-on-dark skin; on linen a card has to be paper.
                // `hover:bg-white/5` had the same problem in reverse: white on
                // a light theme is not a hover state.
                "p-6 rounded-xl transition-colors duration-300 bg-card text-card-foreground border border-border shadow-card",
                hover && "hover:bg-muted cursor-pointer",
                className
            )}
            {...props}
        >
            {children}
        </motion.div>
    );
};
