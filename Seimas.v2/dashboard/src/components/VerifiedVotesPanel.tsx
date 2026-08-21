import { CheckCircle } from 'lucide-react';
import { NavLink } from 'react-router';
import type { VoteSummary } from '../services/api';
import { formatLtDateLong } from '../utils/ltDate';
import { splitTitle } from '../utils/voteGrouping';

/**
 * „Naujausi patikrinti balsavimai" — what the Seimas verifiably did.
 *
 * One of the two panels that replaced the heroes/watchlist pair. That pair
 * ranked people; this lists decisions, each linking to its own record so a
 * reader can check it rather than take the platform's word.
 */
export function VerifiedVotesPanel({ votes }: { votes: VoteSummary[] }) {
  const recent = votes.slice(0, 8);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-1">
        <CheckCircle className="w-4 h-4 text-primary" aria-hidden />
        {/* LT-COPY: needs native review */}
        <h2 className="text-base font-semibold text-foreground">Naujausi patikrinti balsavimai</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Kiekvienas įrašas turi šaltinį — spustelėk ir patikrink.
      </p>

      {recent.length === 0 ? (
        <p className="text-sm text-muted-foreground">Naujausių balsavimų dar nėra.</p>
      ) : (
        <ul className="space-y-2">
          {recent.map((v) => {
            const { base, suffix } = splitTitle(v.title);
            return (
              <li key={v.id}>
                <NavLink
                  to={`/dashboard/votes/${v.id}`}
                  className="block rounded-md border border-border p-3 hover:bg-muted/30 transition-colors"
                >
                  <span className="block text-sm font-medium text-foreground line-clamp-2">
                    {base || v.title}
                  </span>
                  {suffix && (
                    <span className="mt-1 block font-mono text-xs text-muted-foreground">
                      {suffix}
                    </span>
                  )}
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {formatLtDateLong(v.date) ?? v.date}
                  </span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      )}

      <NavLink
        to="/dashboard/votes"
        className="mt-3 inline-flex min-h-11 items-center text-sm text-primary hover:underline"
      >
        Visi balsavimai →
      </NavLink>
    </div>
  );
}
