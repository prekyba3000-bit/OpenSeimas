import { Card } from './Card';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ElementType;
    trend?: string;
    delay?: number;
}

export const StatCard = ({ title, value, icon: Icon, trend, delay = 0 }: StatCardProps) => (
    <Card
        className="flex flex-col gap-3 relative overflow-hidden group"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
    >
        {/* Neutral glow effect on hover (replaces gold) */}
        <div className="absolute top-0 right-0 w-32 h-32 rounded-sm -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:transition-colors transition-colors" style={{ backgroundColor: 'rgba(226,232,240,0.04)' } as any} />

        <div className="flex justify-between items-start relative z-10">
            <div className="p-3 rounded-sm group-hover:scale-105 transition-transform duration-300 ease-snap border" style={{ backgroundColor: 'rgba(226,232,240,0.06)', borderColor: 'var(--border, #E2E8F0)' }}>
                <Icon className="w-5 h-5 text-primary" />
            </div>
            {trend && (
                <span className="text-xs px-2 py-1 rounded-sm font-terminal border" style={{ color: 'var(--status-success)', backgroundColor: 'var(--status-success-muted)', borderColor: 'var(--status-success, rgba(34, 197, 94, 0.2))' }}>
                    +{trend}%
                </span>
            )}
        </div>
        <div className="relative z-10">
            <span className="text-ghost text-xs uppercase tracking-widest block mb-1 font-terminal">{title}</span>
            <span className="text-3xl font-bold tracking-tight text-primary">{value}</span>
        </div>
    </Card>
);
