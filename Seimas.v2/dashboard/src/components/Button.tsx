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
            backgroundColor: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground))',
            borderColor: 'hsl(var(--primary))',
        },
        secondary: {
            backgroundColor: 'hsl(var(--muted))',
            color: 'hsl(var(--foreground))',
            borderColor: 'hsl(var(--border))',
        },
        ghost: {
            backgroundColor: 'transparent',
            color: 'hsl(var(--muted-foreground))',
        },
        danger: {
            backgroundColor: 'hsl(var(--vote-against) / 0.1)',
            color: 'hsl(var(--vote-against))',
            borderColor: 'hsl(var(--vote-against))',
        },
    };

    const sizes = {
        sm: 'min-h-9 px-3 py-1.5 text-sm',
        md: 'min-h-11 px-4 py-2 text-sm',
        lg: 'min-h-12 px-6 py-3 text-base',
    };

    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading || props.disabled}
            className={cn(
                "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed border",
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
