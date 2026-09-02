/**
 * Whether the source cut a vote's title off mid-phrase.
 *
 * LRS caps the agenda element's `pavadinimas` at exactly 200 characters, and
 * that is the only title the feed offers — verified against the live source on
 * 2026-09-02, where the agenda returned a 200-character title for a bill whose
 * name plainly continues. 571 of 5,286 stored titles are cut this way, so the
 * page would otherwise present a mutilated legal title as the name of the law.
 *
 * Two details decide the test, and they pull in opposite directions on the
 * same string:
 *
 *   - 154 titles reach 200 only by counting trailing spaces, and are cut
 *     mid-„(Nr. ". So the LENGTH is measured on the raw string; trimming first
 *     puts them under the cap and reports them complete.
 *   - 13 titles are exactly 200 characters and genuinely complete, and 4 more
 *     close their bracket before trailing space. So the CLOSING BRACKET is
 *     tested after trimming.
 *
 * Mirrors `is_truncated_title` in pipeline/summaries/vote_template.py. If
 * either changes, change both.
 */
const LRS_TITLE_CAP = 200;

export function isTruncatedTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  return title.length === LRS_TITLE_CAP && !title.trimEnd().endsWith(')');
}

/** LT-COPY: needs native review. */
export const TITLE_TRUNCATED_LT =
  'Pavadinimą šaltinis pateikia sutrumpintą — jis nutrūksta ties šia vieta.';
