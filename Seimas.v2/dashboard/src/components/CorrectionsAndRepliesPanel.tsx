import { useQuery } from '@tanstack/react-query';
import { Mail } from 'lucide-react';
import { NavLink } from 'react-router';
import { trustApi } from '../services/trust';
import { formatLtDateLong } from '../utils/ltDate';

/**
 * „Pataisymai ir atsakymai" — what the platform has been told it got wrong.
 *
 * The other half of the heroes/watchlist replacement. A platform that ranks
 * politicians is making claims about them; a platform that publishes its own
 * corrections is showing its work. The second is the one that earns trust,
 * and it is built entirely from surfaces that already existed.
 */
export function CorrectionsAndRepliesPanel() {
  const correctionsQ = useQuery({
    queryKey: ['trust', 'corrections', 'recent'],
    queryFn: () => trustApi.listCorrections(5),
  });

  const items = correctionsQ.data?.corrections ?? [];

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-1">
        <Mail className="w-4 h-4 text-primary" aria-hidden />
        {/* LT-COPY: needs native review */}
        <h2 className="text-base font-semibold text-foreground">Pataisymai ir atsakymai</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Ką mums pranešė ir ką ištaisėme — įskaitant mūsų pačių klaidas.
      </p>

      {correctionsQ.isPending ? (
        <p className="text-sm text-muted-foreground">Kraunama…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Peržiūrėtų pataisymų dar nėra.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((c) => (
            <li key={c.id} className="rounded-md border border-border p-3">
              <p className="text-sm text-foreground line-clamp-3">{c.description}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatLtDateLong(c.created_at) ?? c.created_at}
                {c.status ? ` · ${c.status}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}

      <NavLink
        to="/dashboard/corrections"
        className="mt-3 inline-flex min-h-11 items-center text-sm text-primary hover:underline"
      >
        Visi pataisymai →
      </NavLink>
    </div>
  );
}
