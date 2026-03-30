import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { 
  Search, 
  LayoutDashboard, 
  Users, 
  Vote, 
  Calendar, 
  GitCompare, 
  FileText,
  Settings,
  User
} from 'lucide-react';
import { 
  CommandDialog, 
  CommandInput, 
  CommandList, 
  CommandEmpty, 
  CommandGroup, 
  CommandItem 
} from './ui/command';

export function GlobalCommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Toggle with Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <>
      <div 
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-full shadow-lg cursor-pointer hover:bg-slate-800 transition-colors group"
      >
        <div className="flex items-center gap-1 text-slate-400 group-hover:text-white transition-colors">
          <span className="text-xs font-mono">CMD</span>
          <span className="text-xs font-mono">+</span>
          <span className="text-xs font-mono">K</span>
        </div>
        <Search size={14} className="text-slate-500" />
      </div>

      <CommandDialog 
        open={open} 
        onOpenChange={setOpen}
        title="Komandų meniu"
        description="Ieškoti puslapių ir veiksmų."
      >
        <CommandInput placeholder="Įveskite komandą arba ieškokite..." />

        <CommandList className="max-h-[300px] overflow-y-auto p-2 scrollbar-hide">
          <CommandEmpty>Rezultatų nerasta.</CommandEmpty>

          <CommandGroup heading="Navigacija">
            <CommandItem
              onSelect={() => runCommand(() => navigate('/dashboard'))}
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>Apžvalga</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => navigate('/dashboard/mps'))}
            >
              <Users className="mr-2 h-4 w-4" />
              <span>Seimo Nariai</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => navigate('/dashboard/votes'))}
            >
              <Vote className="mr-2 h-4 w-4" />
              <span>Balsavimai</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => navigate('/dashboard/sessions'))}
            >
              <Calendar className="mr-2 h-4 w-4" />
              <span>Sesijos</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => navigate('/dashboard/compare'))}
            >
              <GitCompare className="mr-2 h-4 w-4" />
              <span>Palyginimas</span>
            </CommandItem>
          </CommandGroup>

          <CommandGroup heading="Veiksmai">
             <CommandItem
              onSelect={() => runCommand(() => { navigate('/dashboard/mps'); })}
            >
              <User className="mr-2 h-4 w-4" />
              <span>Rasti narį...</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => console.log('Exporting Report...'))}
            >
              <FileText className="mr-2 h-4 w-4" />
              <span>Eksportuoti ataskaitą</span>
            </CommandItem>
          </CommandGroup>

           <CommandGroup heading="Sistema">
             <CommandItem
              onSelect={() => runCommand(() => console.log('Opening Settings...'))}
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>Nustatymai</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
