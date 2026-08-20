import { NavLink } from 'react-router';
import { Users, Vote, Calendar } from 'lucide-react';
import { DashboardStats } from '../services/api';
import { activeCount, seatTotal } from '../utils/mpCounts';
import { ltPlural } from '../utils/ltPlural';

/**
 * Exactly three numbers, each with the per-person translation that makes it
 * mean something, and each with a link to where it can be checked.
 *
 * There were four cards, one of which was „743 233 individualūs balsai“ — a
 * number nobody can hold. It moves to the methodology page, where the
 * verifiability framing gives it a job. Miller's limit is not a style
 * preference here: the landing was measured at eight competing attention
 * zones, and this is one of them.
 */
export function StatTrio({ stats }: { stats: DashboardStats | null }) {
  const seats = seatTotal(stats);
  const active = activeCount(stats);
  const votes = numeric(stats?.historical_votes);
  const days = stats?.sitting_days ?? null;

  // „~38 balsavimų vienam nariui“ — computed, not decorative. Rendered only
  // when both operands exist, so it can never divide by a missing number.
  const perMember =
    votes !== null && active
      ? `~${Math.round(votes / active)} ${ltPlural(Math.round(votes / active), 'balsavimas', 'balsavimai', 'balsavimų')} vienam nariui`
      : null;
  const perDay =
    votes !== null && days
      ? `~${Math.round(votes / days)} ${ltPlural(Math.round(votes / days), 'balsavimas', 'balsavimai', 'balsavimų')} per dieną`
      : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Stat
        icon={Users}
        value={String(seats)}
        label="Seimo vietos"
        sub={active !== null ? `${active} mandatą turi šiandien` : null}
        sourceTo="/dashboard/sources"
      />
      <Stat
        icon={Vote}
        value={stats?.historical_votes ?? '—'}
        label="Balsavimai"
        sub={perMember}
        sourceTo="/dashboard/methodology"
      />
      <Stat
        icon={Calendar}
        value={days !== null ? String(days) : '—'}
        label="Posėdžių dienos"
        sub={perDay}
        sourceTo="/dashboard/sources"
      />
    </div>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
  sub,
  sourceTo,
}: {
  icon: React.ElementType;
  value: string;
  label: string;
  sub: string | null;
  sourceTo: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-card p-6 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="w-4 h-4" aria-hidden />
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-3xl font-semibold text-foreground font-mono tabular-nums">{value}</span>
      {sub && <span className="text-sm text-muted-foreground">{sub}</span>}
      <NavLink
        to={sourceTo}
        className="mt-2 inline-flex min-h-6 items-center text-sm text-primary underline w-fit"
      >
        Šaltinis
      </NavLink>
    </div>
  );
}

/** „5,279“ → 5279. Returns null rather than NaN when the field is absent. */
function numeric(formatted: string | undefined): number | null {
  if (!formatted) return null;
  const n = Number(formatted.replace(/[^\d]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}
