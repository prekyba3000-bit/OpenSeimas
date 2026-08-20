import { NavLink } from 'react-router';
import { Freshness } from '../services/api';
import { formatLtFreshness } from '../utils/ltDate';

/**
 * The footer line that replaced the SISTEMOS BŪSENA panel.
 *
 * That panel printed three hardcoded string literals — CONNECTED, ONLINE,
 * AUTOMATINĖ — which were never read from anything. It reported health it had
 * not checked, in English, on a Lithuanian page. This line reports one thing
 * it actually looked up: when the roster was last synchronised, from
 * /api/meta/freshness.
 *
 * When the timestamp is missing or stale the line says so. It never asserts
 * that data is current; that was the original bug.
 */
const STALE_AFTER_HOURS = 36;

export function FreshnessLine({ data }: { data: Freshness | null }) {
  const latest = data?.politicians?.latest ?? null;
  const when = formatLtFreshness(latest);
  const stale = latest ? hoursSince(latest) > STALE_AFTER_HOURS : false;

  return (
    <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
      {when ? (
        <span className={stale ? 'text-foreground' : undefined}>
          {stale
            ? `Duomenys gali būti pasenę — paskutinis atnaujinimas ${when}`
            : `Atnaujinta ${when}`}
        </span>
      ) : (
        // No timestamp is not the same as "up to date".
        <span>Atnaujinimo laikas nežinomas</span>
      )}
      <span aria-hidden>·</span>
      <span>
        Šaltinis:{' '}
        <a
          href="https://www.lrs.lt"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          lrs.lt
        </a>
      </span>
      <span aria-hidden>·</span>
      <NavLink to="/dashboard/methodology" className="underline hover:text-foreground">
        Metodika →
      </NavLink>
    </p>
  );
}

function hoursSince(iso: string): number {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return (Date.now() - then) / 36e5;
}
