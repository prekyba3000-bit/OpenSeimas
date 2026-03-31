import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router';
import { GlobalCommandPalette } from './GlobalCommandPalette';
import {
  LayoutDashboard,
  Users,
  FileText,
  Calendar,
  Scale,
  Shield,
  Trophy,
  Menu,
  Search,
  ScanEye,
  BookOpen,
  Database,
  Mail,
} from 'lucide-react';
import { cn } from './ui/utils';
import { Toaster } from 'sonner';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const dataNavItems = [
  { path: '/dashboard', label: 'Apžvalga', icon: LayoutDashboard },
  { path: '/dashboard/mps', label: 'Seimo Nariai', icon: Users },
  { path: '/dashboard/votes', label: 'Balsavimai', icon: FileText },
  { path: '/dashboard/factions', label: 'Frakcijos', icon: Shield },
  { path: '/dashboard/sessions', label: 'Sesijos', icon: Calendar },
  { path: '/dashboard/compare', label: 'Palyginimas', icon: Scale },
  { path: '/dashboard/stebejimas', label: 'Stebėsena', icon: Trophy },
];

const transparencyNavItems = [
  { path: '/dashboard/skaidrumas', label: 'Skaidrumo centras', icon: ScanEye },
  { path: '/dashboard/methodology', label: 'Metodika', icon: BookOpen },
  { path: '/dashboard/sources', label: 'Šaltiniai', icon: Database },
  { path: '/dashboard/corrections', label: 'Pataisymai', icon: Mail },
];

const allNavForTitle = [...transparencyNavItems, ...dataNavItems].sort(
  (a, b) => b.path.length - a.path.length,
);

function pageTitle(pathname: string): string {
  const exact = allNavForTitle.find((i) => pathname === i.path);
  if (exact) return exact.label;
  const prefix = allNavForTitle.find((i) => i.path !== '/dashboard' && pathname.startsWith(i.path + '/'));
  if (prefix) return prefix.label;
  if (pathname.startsWith('/dashboard/mps/')) return 'Seimo nario profilis';
  if (pathname.startsWith('/dashboard/votes/')) return 'Balsavimas';
  return 'Apžvalga';
}

function NavButton({
  item,
  pathname,
}: {
  item: (typeof dataNavItems)[0];
  pathname: string;
}) {
  const isActive =
    pathname === item.path ||
    (item.path !== '/dashboard' && pathname.startsWith(item.path + '/')) ||
    (item.path === '/dashboard/mps' && pathname.startsWith('/dashboard/mps/')) ||
    (item.path === '/dashboard/votes' && pathname.startsWith('/dashboard/votes/'));
  return (
    <NavLink
      to={item.path}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium',
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-white',
      )}
    >
      <item.icon size={18} />
      <span>{item.label}</span>
    </NavLink>
  );
}

export function MainLayout() {
  useDocumentTitle();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [cmdOpen, setCmdOpen] = React.useState(false);
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:block print:hidden',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'bg-sidebar border-r border-sidebar-border flex flex-col',
        )}
      >
        <div className="h-auto min-h-16 flex flex-col justify-center px-6 py-4 border-b border-sidebar-border gap-1">
          <span className="font-bold text-white tracking-wide text-sm">Atviras Seimas</span>
          <span className="text-xs text-sidebar-primary-foreground/70 leading-snug">
            Neoficialus skaidrumo portalas — ne LR Seimo svetainė
          </span>
        </div>

        <div className="flex-1 flex flex-col py-4 px-3 overflow-y-auto space-y-4">
          <div>
            <p className="px-3 mb-1 text-[10px] uppercase tracking-wider text-sidebar-foreground/50">Duomenys</p>
            <div className="space-y-1">
              {dataNavItems.map((item) => (
                <NavButton key={item.path} item={item} pathname={pathname} />
              ))}
            </div>
          </div>
          <div>
            <p className="px-3 mb-1 text-[10px] uppercase tracking-wider text-sidebar-foreground/50">Skaidrumas</p>
            <div className="space-y-1">
              {transparencyNavItems.map((item) => (
                <NavButton key={item.path} item={item} pathname={pathname} />
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-sidebar-border text-xs text-sidebar-foreground/60 space-y-2">
          <p>
            Duomenys iš viešų šaltinių ir projekto DB. Žr.{' '}
            <NavLink to="/dashboard/sources" className="text-sidebar-primary-foreground/90 underline">
              šaltinių puslapį
            </NavLink>
            .
          </p>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between sticky top-0 z-20 print:static print:h-auto print:py-2 print:border-border">
          <div className="flex items-center gap-4 min-w-0">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden print:hidden p-1 text-foreground hover:bg-muted rounded shrink-0"
              aria-label="Meniu"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-semibold text-foreground md:block truncate print:text-xl">{pageTitle(pathname)}</h1>
          </div>

          <div className="flex items-center gap-2 shrink-0 print:hidden">
            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              className="hidden sm:inline-flex items-center gap-2 h-9 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Search className="h-4 w-4" />
              <span>Paieška</span>
              <kbd className="pointer-events-none hidden md:inline-flex h-5 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                Ctrl+K
              </kbd>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 print:p-0 print:overflow-visible">
          <div className="max-w-7xl mx-auto print:max-w-none">
            <Outlet />
          </div>
        </div>

        <GlobalCommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
        <Toaster position="top-right" />
      </main>

      {isSidebarOpen && (
        <div
          className="lg:hidden print:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden
        />
      )}
    </div>
  );
}
