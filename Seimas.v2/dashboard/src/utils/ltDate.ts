/**
 * Lithuanian date rendering, decided once.
 *
 * Raw ISO dates (2026-07-14) were reaching the page in several places while
 * three components each carried their own `toLocaleDateString('lt-LT', …)`
 * call. A civic site read by non-technical citizens should render dates the way
 * Lithuanian writes them, and should do it the same way everywhere.
 */

const MONTHS_GENITIVE = [
  "sausio", "vasario", "kovo", "balandžio", "gegužės", "birželio",
  "liepos", "rugpjūčio", "rugsėjo", "spalio", "lapkričio", "gruodžio",
] as const;

function parse(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * „2026 m. liepos 14 d." — the long civic form, used in headings and anywhere
 * the date is the subject rather than a table cell.
 *
 * Built from an explicit month table rather than Intl: the genitive month name
 * is what Lithuanian uses in a date, and not every runtime's lt-LT data
 * produces it. Returns null for unparseable input so callers can decide what
 * absence looks like, rather than printing "Invalid Date".
 */
export function formatLtDateLong(value: string | Date | null | undefined): string | null {
  const d = parse(value);
  if (!d) return null;
  return `${d.getFullYear()} m. ${MONTHS_GENITIVE[d.getMonth()]} ${d.getDate()} d.`;
}

/** „liepos 14 d." — same form without the year, for lists already scoped to one year. */
export function formatLtDateShort(value: string | Date | null | undefined): string | null {
  const d = parse(value);
  if (!d) return null;
  return `${MONTHS_GENITIVE[d.getMonth()]} ${d.getDate()} d.`;
}

/** „2026-07-14 14:23" — numeric form for dense rows where alignment matters. */
export function formatLtDateTime(value: string | Date | null | undefined): string | null {
  const d = parse(value);
  if (!d) return null;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** „šiandien, 03:12" / „vakar, 22:40" / „2026 m. liepos 14 d." for the freshness line. */
export function formatLtFreshness(value: string | Date | null | undefined, now: Date = new Date()): string | null {
  const d = parse(value);
  if (!d) return null;
  const p = (n: number) => String(n).padStart(2, "0");
  const time = `${p(d.getHours())}:${p(d.getMinutes())}`;
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (sameDay(d, now)) return `šiandien, ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return `vakar, ${time}`;
  return formatLtDateLong(d);
}
