import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen } from 'lucide-react';
import { api } from '../services/api';
import { Card } from './Card';

/**
 * The plain-language summary of a vote or bill, shown only when one has been
 * approved and still verifies against the record.
 *
 * Everything load-bearing about this component is what it does NOT render. The
 * endpoint returns a body only when a human has approved the latest revision
 * and its figures still match the live row; every other state — no approval
 * yet, a draft awaiting review, an approved summary the data has since drifted
 * from — arrives as a status with no body, and the component renders nothing
 * at all. So an unreviewed pilot or a stale figure can never reach the page
 * through here: there is no code path that renders anything but a published,
 * re-verified body.
 *
 * It also stays silent while loading and on error. A summary is an
 * enhancement, not the record; the vote's own tallies and per-member list are
 * elsewhere on the page and do not wait on this.
 */
export function PlainSummary({
  entityType,
  entityId,
}: {
  entityType: 'vote' | 'bill';
  entityId: string;
}) {
  const { data } = useQuery({
    queryKey: ['summary', entityType, entityId],
    queryFn: () => api.getSummary(entityType, entityId),
    enabled: Boolean(entityId),
  });

  if (data?.status !== 'published' || !data.summary) return null;

  const { body_lt, approved_by, editor } = data.summary;
  // The pipeline writes the template's own output as `pipeline:...`; a person
  // who reworded it signs their name. Attribution is shown so a reader can see
  // this text was reviewed, not machine-published.
  const byline = /^pipeline:/.test(editor)
    ? 'Tekstas parengtas automatiškai iš duomenų.'
    : `Tekstą redagavo: ${editor}.`;

  return (
    <Card className="p-6">
      {/* LT-COPY: needs native review. */}
      <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-primary" aria-hidden />
        Paprastai apie šį balsavimą
      </h2>
      <p className="text-[0.95rem] leading-relaxed text-foreground/90 max-w-prose">
        {body_lt}
      </p>
      <p className="mt-3 text-xs text-muted-foreground">
        {byline}
        {approved_by ? ` Patvirtino: ${approved_by}.` : ''}
      </p>
    </Card>
  );
}

export default PlainSummary;
