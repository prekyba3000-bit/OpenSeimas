import React from 'react';
import type { MpVoteTopics } from '../services/api';
import { LT } from '../i18n/lt';

/** Slug to the label a reader sees. Order is the order shown. */
export const TOPIC_LABELS_LT: Record<string, string> = {
  bustas: 'Būstas',
  pajamos: 'Pajamos ir mokesčiai',
  sveikata: 'Sveikata',
  svietimas: 'Švietimas',
  transportas: 'Transportas',
  saugumas: 'Saugumas ir gynyba',
  aplinka: 'Aplinka',
  valdymas: 'Valdymas ir teisingumas',
};

/**
 * Filter a member's votes by subject.
 *
 * Each chip carries two numbers, and both are needed. „27 iš 86" means: 86
 * votes on housing happened while this member held a seat, and their choice
 * is recorded on 27 of them. The 86 is very nearly the same for every member,
 * because the source records a row per member per vote whether or not they
 * took part; the 27 is the fact about this person.
 *
 * Showing only the larger number would look personal without being so.
 * Showing only the smaller would hide what it is out of. Neither is a
 * participation rate: attendance is measured elsewhere against eligible
 * sitting days, and a missing choice here usually means the source published
 * no per-member result for that vote at all.
 */
export function VoteTopicFilter({
  breakdown,
  selected,
  onSelect,
}: {
  breakdown: MpVoteTopics | null | undefined;
  selected: string | null;
  onSelect: (topic: string | null) => void;
}) {
  // `topics: null` means the tag table is absent — we cannot tell, which is
  // not the same as a member having no tagged votes. Render nothing rather
  // than an empty filter bar implying the latter.
  if (!breakdown?.topics) return null;

  const present = Object.keys(TOPIC_LABELS_LT).filter(
    (slug) => (breakdown.topics?.[slug]?.votes ?? 0) > 0,
  );
  if (present.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-semibold text-foreground">{LT.voteTopics.title}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSelect(null)}
          aria-pressed={selected === null}
          className={
            'min-h-11 rounded-lg border px-3 py-1.5 text-sm ' +
            (selected === null
              ? 'border-primary text-foreground'
              : 'border-border text-muted-foreground hover:text-foreground')
          }
        >
          {LT.voteTopics.all}
        </button>

        {present.map((slug) => {
          const counts = breakdown.topics?.[slug];
          return (
            <button
              key={slug}
              type="button"
              onClick={() => onSelect(selected === slug ? null : slug)}
              aria-pressed={selected === slug}
              className={
                'min-h-11 rounded-lg border px-3 py-1.5 text-sm ' +
                (selected === slug
                  ? 'border-primary text-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground')
              }
            >
              {TOPIC_LABELS_LT[slug]}{' '}
              <span className="font-mono tabular-nums text-xs">
                {counts?.recorded ?? 0}/{counts?.votes ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
        {LT.voteTopics.countExplainer}
      </p>
      {breakdown.tagged != null && breakdown.total != null && (
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          {LT.voteTopics.coverage(breakdown.tagged, breakdown.total)}
        </p>
      )}
    </div>
  );
}

export default VoteTopicFilter;
