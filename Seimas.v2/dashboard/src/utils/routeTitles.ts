// Maps pathname patterns to Lithuanian page titles.
// Dynamic segments: match exact path or path + '/' prefix (longer patterns win).
const ROUTE_TITLES: Array<{ pattern: string; title: string }> = [
  { pattern: '/dashboard/mps/', title: 'Seimo nario profilis' },
  { pattern: '/dashboard/votes/', title: 'Balsavimas' },
  { pattern: '/dashboard/mps', title: 'Seimo nariai' },
  { pattern: '/dashboard/votes', title: 'Balsavimai' },
  { pattern: '/dashboard/factions', title: 'Frakcijos' },
  { pattern: '/dashboard/sessions', title: 'Sesijos' },
  { pattern: '/dashboard/compare', title: 'Palyginimas' },
  { pattern: '/dashboard/stebejimas', title: 'Stebėsena' },
  { pattern: '/dashboard/leaderboard', title: 'Stebėsena' },
  { pattern: '/dashboard/skaidrumas', title: 'Skaidrumo centras' },
  { pattern: '/dashboard/methodology', title: 'Metodika' },
  { pattern: '/dashboard/sources', title: 'Šaltiniai' },
  { pattern: '/dashboard/corrections', title: 'Pataisymai' },
  { pattern: '/dashboard', title: 'Apžvalga' },
  { pattern: '/', title: '' },
];

export const SITE_NAME = 'Atviras Seimas';

function patternMatches(pattern: string, pathname: string): boolean {
  if (pattern === '/') {
    return pathname === '/' || pathname === '';
  }
  return pathname === pattern || pathname.startsWith(`${pattern}/`);
}

export function getRouteTitle(pathname: string): string {
  const sorted = [...ROUTE_TITLES].sort((a, b) => b.pattern.length - a.pattern.length);
  const match = sorted.find((r) => patternMatches(r.pattern, pathname));
  const page = match?.title ?? '';
  return page ? `${page} · ${SITE_NAME}` : SITE_NAME;
}
