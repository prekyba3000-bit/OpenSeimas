export interface PartyMeta {
  short: string;
  hex: string;
  tailwind: string;
}

const PARTY_MAP: Record<string, PartyMeta> = {
  'Lietuvos socialdemokratų partijos frakcija':
    { short: 'LSDP', hex: '#ef4444', tailwind: 'bg-red-500' },
  'Tėvynės sąjungos-Lietuvos krikščionių demokratų frakcija':
    { short: 'TS-LKD', hex: '#2563eb', tailwind: 'bg-blue-600' },
  '„Nemuno aušros" frakcija':
    { short: 'Nemuno aušra', hex: '#f59e0b', tailwind: 'bg-amber-500' },
  'Demokratų frakcija „Vardan Lietuvos"':
    { short: 'Vardan LT', hex: '#10b981', tailwind: 'bg-emerald-500' },
  'Liberalų  sąjūdžio frakcija':
    { short: 'LRLS', hex: '#f97316', tailwind: 'bg-orange-500' },
  'Liberalų sąjūdžio frakcija':
    { short: 'LRLS', hex: '#f97316', tailwind: 'bg-orange-500' },
  'Lietuvos valstiečių, žaliųjų ir Krikščioniškų šeimų sąjungos frakcija':
    { short: 'LVŽS', hex: '#16a34a', tailwind: 'bg-green-600' },
  'Mišri Seimo narių grupė':
    { short: 'Mišri', hex: '#64748b', tailwind: 'bg-slate-500' },
};

const FALLBACK: PartyMeta = { short: '?', hex: '#4b5563', tailwind: 'bg-gray-600' };

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
