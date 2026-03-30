import React, { useState } from 'react';
import { Search, User, Vote, BarChart3, Settings, FileText, Users, TrendingUp } from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  icon: React.ElementType;
  section: string;
  description?: string;
}

const commands: CommandItem[] = [
  // Jump to...
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, section: 'Jump to...', description: 'Main overview' },
  { id: 'votes', label: 'Voting Records', icon: Vote, section: 'Jump to...', description: 'Browse all votes' },
  { id: 'members', label: 'MP Directory', icon: Users, section: 'Jump to...', description: 'View all members' },
  { id: 'comparison', label: 'Comparison Tool', icon: TrendingUp, section: 'Jump to...', description: 'Compare MPs' },
  
  // Active MPs
  { id: 'mp1', label: 'Andrius Kubilius', icon: User, section: 'Active MPs', description: 'Tėvynės sąjunga' },
  { id: 'mp2', label: 'Gintautas Paluckas', icon: User, section: 'Active MPs', description: 'LSDP' },
  { id: 'mp3', label: 'Viktorija Čmilytė-Nielsen', icon: User, section: 'Active MPs', description: 'Liberalų sąjūdis' },
  
  // System
  { id: 'settings', label: 'Settings', icon: Settings, section: 'System', description: 'App preferences' },
  { id: 'docs', label: 'Documentation', icon: FileText, section: 'System', description: 'Help & guides' },
];

interface CommandPaletteProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function CommandPalette({ isOpen = true, onClose }: CommandPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  // Filter commands based on search
  const filteredCommands = searchQuery
    ? commands.filter((cmd) =>
        cmd.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cmd.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : commands;

  // Group by section
  const sections = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.section]) {
      acc[cmd.section] = [];
    }
    acc[cmd.section].push(cmd);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Command Palette Container */}
      <div
        className="relative w-full max-w-[640px] rounded-xl bg-[#141517] border border-white/10 overflow-hidden"
        style={{
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Input Field */}
        <div className="relative border-b border-white/5">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <Search className="w-5 h-5 text-gray-500" />
          </div>
          <input
            type="text"
            placeholder="Type a command or search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-4 bg-transparent text-white placeholder-gray-500 text-sm focus:outline-none"
            style={{ letterSpacing: '-0.01em', fontFamily: 'Inter, Geist Sans, sans-serif' }}
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-white transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-[400px] overflow-y-auto">
          {Object.keys(sections).length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-500">No results found</p>
            </div>
          ) : (
            Object.entries(sections).map(([sectionName, items]) => (
              <div key={sectionName}>
                {/* Section Header */}
                <div className="px-4 py-2 border-b border-white/5">
                  <h3 className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">
                    {sectionName}
                  </h3>
                </div>

                {/* Section Items */}
                {items.map((item, index) => {
                  const globalIndex = filteredCommands.indexOf(item);
                  const isActive = globalIndex === activeIndex;
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      className={`
                        relative w-full flex items-center gap-3 px-4 py-3 
                        transition-all duration-150 cursor-pointer
                        ${
                          isActive
                            ? 'bg-white/5 border-l-2 border-l-blue-500 text-white'
                            : 'border-l-2 border-l-transparent text-gray-400 hover:bg-white/5 hover:text-white'
                        }
                      `}
                      onMouseEnter={() => setActiveIndex(globalIndex)}
                      onClick={onClose}
                      style={{ height: '40px', letterSpacing: '-0.01em' }}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-500' : 'text-gray-500'}`} />
                      <div className="flex-1 text-left min-w-0">
                        <div className="text-sm font-medium truncate">{item.label}</div>
                      </div>
                      {item.description && (
                        <div className="text-xs text-gray-600 truncate max-w-[200px]">
                          {item.description}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer Hint */}
        <div className="border-t border-white/5 px-4 py-2 bg-black/20">
          <div className="flex items-center justify-between text-[10px] text-gray-600">
            <div className="flex items-center gap-4">
              <span>
                <kbd className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10 font-mono">↑↓</kbd> Navigate
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10 font-mono">Enter</kbd> Select
              </span>
            </div>
            <span>
              <kbd className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10 font-mono">Esc</kbd> Close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
