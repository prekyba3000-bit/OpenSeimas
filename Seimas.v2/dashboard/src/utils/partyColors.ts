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

const FALLBACK: PartyMeta = { short: '?', hex: '#7D766C', tailwind: 'bg-[#7D766C]' };

export function getPartyMeta(partyName: string | null | undefined): PartyMeta {
  if (!partyName || partyName === 'Unknown') return FALLBACK;
  return PARTY_MAP[partyName] ?? FALLBACK;
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
