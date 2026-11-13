import type { CabinetPost, Government } from '../services/api';

/**
 * How the fourteen ministries are grouped on „Valdžios žemėlapis".
 *
 * The grouping is ours, not an official classification, and the page says so.
 * It exists so that a reader can read one area of life across the page. Every
 * ministry key must appear exactly once — the test holds that against the
 * register, so a ministry added upstream cannot silently fall off the map.
 * `president` is what the President does in that row, in lrp.lt's wording;
 * the first row has its own panel instead.
 */
// LT-COPY: needs native review
export const AREAS: { key: string; title: string; hint: string; president: string; ministries: string[] }[] = [
  { key: 'uzsienis-saugumas', title: 'Užsienis ir saugumas',
    hint: 'Santykiai su kitomis valstybėmis, gynyba, vidaus tvarka',
    president: '',
    ministries: ['uzsienis', 'gynyba', 'vidus'] },
  { key: 'pinigai-ukis', title: 'Pinigai ir ūkis',
    hint: 'Biudžetas, verslas, energija, keliai, žemės ūkis',
    president: 'Pasirašo arba vetuoja šios srities įstatymus.',
    ministries: ['finansai', 'ekonomika', 'energetika', 'susisiekimas', 'zemes_ukis'] },
  { key: 'zmones', title: 'Žmonės',
    hint: 'Sveikata, mokykla, pensijos ir darbas, kultūra',
    president: 'Pasirašo arba vetuoja šios srities įstatymus.',
    ministries: ['sveikata', 'svietimas', 'socialine', 'kultura'] },
  { key: 'teise-aplinka', title: 'Teisė ir aplinka',
    hint: 'Teisingumas, gamta',
    president: 'Pasirašo arba vetuoja šios srities įstatymus. Teikia Seimui Aukščiausiojo Teismo teisėjų kandidatūras, skiria kitų teismų teisėjus.',
    ministries: ['teisingumas', 'aplinka'] },
];

/** The ministries in which the President has a constitutional role of his own
 *  (Constitution art. 84 p. 1 and art. 140, as quoted on lrp.lt). */
export const WITH_PRESIDENT = new Set(['uzsienis', 'gynyba']);

/** Everyone who held the post in that Government, in order. */
export function holdersOf(gov: Government, ministryKey: string): CabinetPost[] {
  return gov.posts.filter((p) => p.ministry_key === ministryKey).sort((a, b) => a.seq - b.seq);
}

/** Whoever holds the post last — the minister today, for the current Government. */
export function lastHolder(gov: Government, ministryKey: string): CabinetPost | null {
  const all = holdersOf(gov, ministryKey);
  return all.length ? all[all.length - 1] : null;
}

/**
 * Did the same person keep the same ministry from the previous Government?
 * Compared by the name as the decrees spell it — the register's only identity.
 */
export function keptPost(prev: Government | undefined, gov: Government, ministryKey: string): boolean {
  if (!prev) return false;
  const before = lastHolder(prev, ministryKey);
  const first = holdersOf(gov, ministryKey)[0];
  return !!before && !!first && before.name === first.name;
}
