import { Card } from './Card';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ElementType;
    trend?: string;
    delay?: number;
}

/**
 * The blurred square behind the icon, the `font-terminal` class and the
 * `text-ghost` label were all driving undefined CSS variables
 * (--font-terminal, --color-text-ghost, --status-success): the glow rendered as
 * a barely-visible smudge and the label fell back to inherited type. Replaced
 * with theme tokens, which is what the rest of the card was already using.
 */
export const StatCard = ({ title, value, icon: Icon, trend, delay = 0 }: StatCardProps) => (
    <Card
        className="flex flex-col gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
    >
        <div className="flex justify-between items-start">
            <div className="p-3 rounded-lg border border-border bg-muted">
                <Icon className="w-5 h-5 text-primary" />
            </div>
            {trend && (
                <span className="text-xs font-medium px-2 py-1 rounded-md border border-border bg-muted text-muted-foreground">
                    +{trend}%
                </span>
            )}
        </div>
        <div>
            <span className="text-sm text-muted-foreground block mb-1">{title}</span>
            <span className="text-3xl font-semibold tracking-tight text-foreground">{value}</span>
        </div>
    </Card>
);
