import React from 'react';
import { formatLtDateLong } from '../utils/ltDate';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, MessageSquare } from 'lucide-react';
import { trustApi } from '../services/trust';

function formatDate(iso: string): string {
  // Shared civic formatter — see utils/ltDate.
  return formatLtDateLong(iso) ?? iso;
}

/**
 * MP right-of-reply. This is the MP's own voice, so it is deliberately styled
 * apart from platform-authored content. The backend returns verified replies
 * only — an unverified reply never reaches this component.
 */
export function MpReplies({ mpId }: { mpId: string }) {
  const { data, isPending, isError } = useQuery({
    queryKey: ['trust', 'replies', mpId],
    queryFn: () => trustApi.getMpReplies(mpId),
    enabled: Boolean(mpId),
  });

  const replies = data?.replies ?? [];

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h2 className="text-base font-semibold text-foreground">
          Seimo nario atsakymas
        </h2>
      </div>

      {isPending && <p className="text-sm text-muted-foreground">Kraunama…</p>}

      {isError && (
        <p role="alert" className="text-sm text-destructive">
          Nepavyko įkelti atsakymo. Pabandykite vėliau.
        </p>
      )}

      {!isPending && !isError && replies.length === 0 && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Čia atsiras patvirtintas Seimo nario atsakymas dėl apie jį skelbiamų duomenų. Kol kas
          atsakymo nepateikta.
        </p>
      )}

      {replies.map((reply) => (
        <blockquote
          key={reply.id}
          className="rounded-xl border-l-4 border-l-primary border border-border bg-primary/5 px-4 py-3"
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/50 px-2 py-0.5 text-xs text-primary">
              <BadgeCheck className="h-3 w-3" />
              Patvirtintas atsakymas
            </span>
            <span className="text-xs text-muted-foreground">{formatDate(reply.created_at)}</span>
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
            {reply.body_lt}
          </p>
        </blockquote>
      ))}
    </section>
  );
}
