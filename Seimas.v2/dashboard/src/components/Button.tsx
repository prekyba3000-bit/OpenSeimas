import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { cn } from '../utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
    children?: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    icon?: React.ElementType;
}

export const Button = ({
    children,
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    icon: Icon,
    ...props
}: ButtonProps) => {
    // Inline styles for dynamic var() support using Figma tokens
    const variantStyles = {
        primary: {
            // Use neutral surface tint and primary text for accessibility
            backgroundColor: 'rgba(226,232,240,0.06)',
            color: 'var(--text-primary)',
            borderColor: 'var(--border, #E2E8F0)',
        },
        secondary: {
            backgroundColor: 'var(--background-elevated)',
            color: 'var(--text-primary)',
            borderColor: 'var(--glass-border)',
        },
        ghost: {
            backgroundColor: 'transparent',
            color: 'var(--text-secondary)',
        },
        danger: {
            backgroundColor: 'var(--status-danger-muted)',
            color: 'var(--status-danger)',
            borderColor: 'var(--status-danger)',
        },
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-xs',
        lg: 'px-6 py-3 text-sm',
    };

    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading || props.disabled}
            className={cn(
                "inline-flex items-center justify-center gap-2 rounded-sm font-terminal uppercase tracking-wider transition-all duration-200 ease-snap disabled:opacity-50 disabled:cursor-not-allowed border",
                sizes[size],
                className
            )}
            style={variantStyles[variant]}
            {...props}
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : Icon && <Icon className="w-4 h-4" />}
            {children}
        </motion.button>
    );
};
