import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../utils';
import { LayoutDashboard, Users, FileText, GitCompare, Crosshair } from 'lucide-react';

interface NavItem {
    href: string;
    label: string;
    icon: React.ElementType;
    key: string;
}

interface HeaderProps {
    view: string;
}

const navItems: NavItem[] = [
    { href: '#/', label: 'COMMAND', icon: LayoutDashboard, key: 'dashboard' },
    { href: '#/mps', label: 'ASSETS', icon: Users, key: 'mps-list' },
    { href: '#/votes', label: 'INTEL', icon: FileText, key: 'votes-list' },
    { href: '#/compare', label: 'ANALYZE', icon: GitCompare, key: 'compare' },
];

export const Header = ({ view }: HeaderProps) => {
    return (
        <header className="flex justify-between items-center flex-wrap gap-4 mb-8">
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col"
            >
                <h1 className="text-decree text-3xl font-bold flex items-center gap-3">
                    <Crosshair className="w-8 h-8 text-primary" />
                    <a href="#/" className="text-primary hover:text-secondary transition-colors ease-snap">
                        SKAIDRUS SEIMAS
                    </a>
                    <span className="text-primary text-xs px-2 py-0.5 rounded-sm border font-terminal" style={{ backgroundColor: 'rgba(226,232,240,0.05)', borderColor: 'var(--border, #E2E8F0)' }}>v.2</span>
                </h1>
                <p className="text-ghost text-xs mt-1 tracking-widest font-terminal uppercase">
                    PARLIAMENTARY INTELLIGENCE SYSTEM
                </p>
            </motion.div>

            <motion.nav
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex gap-1 items-center flex-wrap"
            >
                {navItems.map(({ href, label, icon: Icon, key }) => {
                    const isActive = view === key ||
                        (view === 'mp-profile' && key === 'mps-list') ||
                        (view === 'vote-detail' && key === 'votes-list');

                    return (
                        <a
                            key={key}
                            href={href}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-terminal uppercase tracking-wider transition-all duration-300 ease-snap border",
                                isActive
                                    ? "bg-surface/5 text-primary border-border shadow-none"
                                    : "text-ghost hover:text-primary hover:bg-surface/5 border-transparent hover:border-border"
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                        </a>
                    );
                })}
                <div className="flex items-center gap-2 bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30 px-3 py-1.5 rounded-sm text-xs font-terminal uppercase tracking-wider ml-2">
                    <div className="w-1.5 h-1.5 bg-[#22c55e] rounded-sm animate-pulse" />
                    LIVE
                </div>
            </motion.nav>
        </header>
    );
};
