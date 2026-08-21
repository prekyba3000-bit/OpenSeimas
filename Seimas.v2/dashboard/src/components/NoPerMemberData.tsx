import { FileQuestion } from 'lucide-react';
import {
  NO_PER_MEMBER_DATA_LT,
  NO_PER_MEMBER_DATA_REASON_LT,
} from '../utils/perMemberChoices';

/**
 * What a surface shows instead of a list of 140 members with no votes beside
 * their names — or, on the seat map, instead of 140 hollow seats that would
 * read as "the whole Seimas skipped this".
 *
 * It states the absence and its reason. It does not apologise for it: the
 * source not publishing something is a fact about the source, and saying so
 * plainly is the point of the platform.
 */
export function NoPerMemberData({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-xl border border-dashed border-border bg-muted/40 p-6 text-left ${className ?? ''}`}
      role="status"
    >
      <div className="flex gap-3 items-start">
        <FileQuestion className="w-6 h-6 text-muted-foreground shrink-0 mt-0.5" aria-hidden />
        <div>
          <h3 className="text-base font-semibold text-foreground">{NO_PER_MEMBER_DATA_LT}</h3>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed max-w-prose">
            {NO_PER_MEMBER_DATA_REASON_LT}
          </p>
        </div>
      </div>
    </div>
  );
}
