import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router';
import { GlobalCommandPalette } from './GlobalCommandPalette';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Calendar, 
  Scale, 
  Settings,
  Menu,
  Bell,
  Search,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { cn } from './ui/utils';
import { Toaster } from 'sonner';

export function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Apžvalga', icon: LayoutDashboard }, 
    { path: '/dashboard/mps', label: 'Seimo Nariai', icon: Users }, 
    { path: '/dashboard/votes', label: 'Balsavimai', icon: FileText }, 
    { path: '/dashboard/sessions', label: 'Sesijos', icon: Calendar }, 
    { path: '/dashboard/compare', label: 'Palyginimas', icon: Scale }, 
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden">
      
      {/* Sidebar Navigation */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:block",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
          "bg-sidebar border-r border-sidebar-border flex flex-col"
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <div className="flex flex-col">
             <span className="font-bold text-white tracking-wide text-sm">Lietuvos Respublikos</span>
             <span className="text-xs text-sidebar-primary-foreground/70 uppercase">Seimas</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 flex flex-col py-6 px-3 overflow-y-auto space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-white"
                )}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-sidebar-border">
           <div className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-sidebar-accent/50 cursor-pointer transition-colors">
              <div className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold text-xs">
                  AD
              </div>
              <div className="flex-1 min-w-0">
                 <div className="text-sm font-medium text-white truncate">Administratorius</div>
                 <div className="text-xs text-sidebar-foreground truncate">admin@lrs.lt</div>
              </div>
              <LogOut size={16} className="text-sidebar-foreground" />
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
         {/* Header */}
         <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between sticky top-0 z-20">
             <div className="flex items-center gap-4">
                 <button 
                     onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                     className="lg:hidden p-1 text-foreground hover:bg-muted rounded"
                 >
                     <Menu size={20} />
                 </button>
                 <h1 className="text-lg font-semibold text-foreground hidden md:block">
                    {navItems.find(i => location.pathname.startsWith(i.path) && i.path !== '/dashboard')?.label || 'Apžvalga'}
                 </h1>
             </div>
             
             <div className="flex items-center gap-4">
                <div className="relative hidden sm:block">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="Paieška..." 
                    className="h-9 w-64 rounded-md border border-input bg-background pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <button className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors">
                  <Bell className="w-5 h-5" />
                </button>
             </div>
         </header>

         {/* Content Scroll Area */}
         <div className="flex-1 overflow-y-auto p-4 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <Outlet />
            </div>
         </div>
         
         <GlobalCommandPalette />
         <Toaster position="top-right" />
      </main>
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
