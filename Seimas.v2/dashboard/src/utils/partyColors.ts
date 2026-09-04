import { NO_FACTION_LT } from './faction';
/**
 * Faction colours: muted, 40–60% chroma, no pure red or green.
 *
 * The previous set was Tailwind's saturated defaults — red-500, emerald-500,
 * amber-500 — which read as status signals (error / success / warning) rather
 * than as party identity, on a platform whose whole point is not to editorialise.
 * Every value here clears 3:1 against the card background in both modes; the
 * ratios are recorded in docs/reviews/jaukumas-contrast.md.
 */
export interface PartyMeta {
  short: string;
  hex: string;
  tailwind: string;
}

const PARTY_MAP: Record<string, PartyMeta> = {
  'Lietuvos socialdemokratų partijos frakcija':
    { short: 'LSDP', hex: '#C25E5E', tailwind: 'bg-[#C25E5E]' },
  'Tėvynės sąjungos-Lietuvos krikščionių demokratų frakcija':
    { short: 'TS-LKD', hex: '#6E8CAE', tailwind: 'bg-[#6E8CAE]' },
  '„Nemuno aušros“ frakcija':
    { short: 'Nemuno aušra', hex: '#B66F3D', tailwind: 'bg-[#B66F3D]' },
  // Lithuanian closing quote U+201C (") — DB value uses it; ASCII " miss-matched.
  'Demokratų frakcija „Vardan Lietuvos“':
    { short: 'Vardan LT', hex: '#5D8A6C', tailwind: 'bg-[#5D8A6C]' },
  'Liberalų  sąjūdžio frakcija':
    { short: 'LRLS', hex: '#937DAA', tailwind: 'bg-[#937DAA]' },
  'Liberalų sąjūdžio frakcija':
    { short: 'LRLS', hex: '#937DAA', tailwind: 'bg-[#937DAA]' },
  'Lietuvos valstiečių, žaliųjų ir Krikščioniškų šeimų sąjungos frakcija':
    { short: 'LVŽS', hex: '#6E8E62', tailwind: 'bg-[#6E8E62]' },
  'Mišri Seimo narių grupė':
    { short: 'Mišri', hex: '#8C857A', tailwind: 'bg-[#8C857A]' },
};

const FALLBACK: PartyMeta = { short: 'Nenurodyta', hex: '#7D766C', tailwind: 'bg-[#7D766C]' };

/**
 * A label for a party string the map above does not know.
 *
 * The seat-map legend made this visible: five separate entries all reading
 * „?“, which is a colour with no label — exactly what the legend exists to
 * prevent. They turned out to be spelling variants of parties already in the
 * map („Lietuvos socialdemokratų partija“ alongside „…partijos frakcija“,
 * „Liberalų sąjūdis“ alongside „Liberalų sąjūdžio frakcija“).
 *
 * They are deliberately *not* folded into their neighbours here. Party
 * membership and faction membership are different things in the Seimas, and a
 * UI-layer merge would silently assert that 53 members sit with LSDP when the
 * data says 48 do and 5 carry a different string. The variants are a data
 * problem, recorded in docs/BACKLOG.md; until it is settled at the source, an
 * unknown string gets its own honest label rather than a shrug or a guess.
 */
function labelFor(partyName: string): string {
  const cleaned = partyName.replace(/[„“"]/g, '').trim();
  if (!cleaned) return FALLBACK.short;
  // „Lietuvos socialdemokratų partija" → „Lietuvos socialdemokratų…"; long
  // enough to identify, short enough for a legend row.
  return cleaned.length > 28 ? `${cleaned.slice(0, 27)}…` : cleaned;
}

export function getPartyMeta(partyName: string | null | undefined): PartyMeta {
  if (!partyName || partyName === 'Unknown' || partyName === NO_FACTION_LT) return FALLBACK;
  const known = PARTY_MAP[partyName];
  if (known) return known;
  return { ...FALLBACK, short: labelFor(partyName) };
}

export function getPartyColor(partyName: string | null | undefined): string {
  return getPartyMeta(partyName).hex;
}

export function getPartyShort(partyName: string | null | undefined): string {
  return getPartyMeta(partyName).short;
}

export function getAllParties(): { name: string; meta: PartyMeta }[] {
  return Object.entries(PARTY_MAP).map(([name, meta]) => ({ name, meta }));
}
