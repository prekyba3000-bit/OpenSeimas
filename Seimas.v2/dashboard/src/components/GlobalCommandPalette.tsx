import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  LayoutDashboard,
  Users,
  Vote,
  Calendar,
  GitCompare,
  Trophy,
  FileText,
  ScanEye,
  BookOpen,
  Database,
  Mail,
} from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from './ui/command';
import { api, type MpSummary } from '../services/api';

export type GlobalCommandPaletteProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function GlobalCommandPalette({ open: controlledOpen, onOpenChange }: GlobalCommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? !!controlledOpen : internalOpen;
  const navigate = useNavigate();
  const [mps, setMps] = useState<MpSummary[]>([]);
  const [mpsLoading, setMpsLoading] = useState(false);

  const setOpen = useCallback(
    (next: boolean) => {
      if (isControlled) onOpenChange?.(next);
      else setInternalOpen(next);
    },
    [isControlled, onOpenChange],
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isControlled) onOpenChange?.(!controlledOpen);
        else setInternalOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [isControlled, controlledOpen, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setMpsLoading(true);
    api
      .getMps()
      .then((list) => {
        if (!cancelled) setMps(list || []);
      })
      .catch(() => {
        if (!cancelled) setMps([]);
      })
      .finally(() => {
        if (!cancelled) setMpsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const runCommand = useCallback(
    (command: () => void) => {
      setOpen(false);
      command();
    },
    [setOpen],
  );

  const mpItems = useMemo(() => mps.slice(0, 200), [mps]);

  return (
    <>
      {/* The floating ⌘K pill lived here. Removed: the header already carries
          a search affordance, so the viewport offered two, and on a phone the
          pill sat permanently over the content it was meant to help you find.
          The keyboard shortcut still works — see the key handler below. */}

      <CommandDialog open={open} onOpenChange={setOpen} title="Paieška ir navigacija" description="Narį, puslapį ar komandą.">
        <CommandInput placeholder="Ieškoti nario arba pasirinkite skyrių..." />

        <CommandList className="max-h-[min(420px,50vh)] overflow-y-auto p-2 scrollbar-hide">
          <CommandEmpty>
            {mpsLoading ? 'Kraunami Seimo nariai…' : 'Rezultatų nerasta.'}
          </CommandEmpty>

          <CommandGroup heading="Skaidrumas">
            <CommandItem
              value="skaidrumas hub skaidrumo centras"
              onSelect={() => runCommand(() => navigate('/dashboard/skaidrumas'))}
            >
              <ScanEye className="mr-2 h-4 w-4" />
              <span>Skaidrumo centras</span>
            </CommandItem>
            <CommandItem
              value="metodika kaip skaičiuojama"
              onSelect={() => runCommand(() => navigate('/dashboard/methodology'))}
            >
              <BookOpen className="mr-2 h-4 w-4" />
              <span>Metodika</span>
            </CommandItem>
            <CommandItem
              value="šaltiniai duomenų šaltiniai"
              onSelect={() => runCommand(() => navigate('/dashboard/sources'))}
            >
              <Database className="mr-2 h-4 w-4" />
              <span>Duomenų šaltiniai</span>
            </CommandItem>
            <CommandItem
              value="pataisymai korekcijos"
              onSelect={() => runCommand(() => navigate('/dashboard/corrections'))}
            >
              <Mail className="mr-2 h-4 w-4" />
              <span>Pataisymai</span>
            </CommandItem>
          </CommandGroup>

          <CommandGroup heading="Navigacija">
            <CommandItem value="apžvalga dashboard" onSelect={() => runCommand(() => navigate('/dashboard'))}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>Apžvalga</span>
            </CommandItem>
            <CommandItem value="seimo nariai mps" onSelect={() => runCommand(() => navigate('/dashboard/mps'))}>
              <Users className="mr-2 h-4 w-4" />
              <span>Seimo nariai</span>
            </CommandItem>
            <CommandItem value="balsavimai votes" onSelect={() => runCommand(() => navigate('/dashboard/votes'))}>
              <Vote className="mr-2 h-4 w-4" />
              <span>Balsavimai</span>
            </CommandItem>
            <CommandItem value="sesijos" onSelect={() => runCommand(() => navigate('/dashboard/sessions'))}>
              <Calendar className="mr-2 h-4 w-4" />
              <span>Sesijos</span>
            </CommandItem>
            <CommandItem value="palyginimas compare" onSelect={() => runCommand(() => navigate('/dashboard/compare'))}>
              <GitCompare className="mr-2 h-4 w-4" />
              <span>Palyginimas</span>
            </CommandItem>
            <CommandItem
              value="stebėsena stebejimas monitoring rizika risk mp sąrašas leaderboard"
              onSelect={() => runCommand(() => navigate('/dashboard/stebejimas'))}
            >
              <Trophy className="mr-2 h-4 w-4" />
              <span>Pasisakymai ir balsavimai</span>
            </CommandItem>
            <CommandItem value="frakcijos" onSelect={() => runCommand(() => navigate('/dashboard/factions'))}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Frakcijos</span>
            </CommandItem>
          </CommandGroup>

          {mpItems.length > 0 && (
            <CommandGroup heading="Seimo nariai (greita paieška)">
              {mpItems.map((mp) => (
                <CommandItem
                  key={mp.id}
                  value={`${mp.name} ${mp.party || ''} ${mp.normalized_name || ''}`}
                  onSelect={() => runCommand(() => navigate(`/dashboard/mps/${mp.id}`))}
                >
                  <Users className="mr-2 h-4 w-4 shrink-0 opacity-60" />
                  <span className="truncate">
                    {mp.name}
                    {mp.party ? <span className="text-muted-foreground"> · {mp.party}</span> : null}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
