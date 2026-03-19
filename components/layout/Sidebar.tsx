'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { clsx } from 'clsx';
import { BarChart3, Zap, TrendingUp, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface SidebarProps {
  events: string[];
  selectedEvents: string[];
  onToggleEvent: (event: string) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  assetCount: number;
  filterMode: string;
  onFilterChange: (mode: string) => void;
  classes: string[];
  groups: string[];
  selectedClass: string;
  selectedGroup: string;
  onClassChange: (cls: string) => void;
  onGroupChange: (grp: string) => void;
}

const NAV_ITEMS = [
  { href: '/', label: 'Watchlist', icon: BarChart3 },
  { href: '/live', label: 'Live Event', icon: Zap },
  { href: '/signals', label: 'Trade Signals', icon: TrendingUp },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({
  events, selectedEvents, onToggleEvent, onSelectAll, onSelectNone,
  assetCount, filterMode, onFilterChange,
  classes, groups, selectedClass, selectedGroup, onClassChange, onGroupChange,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-60 min-h-screen bg-surface border-r border-border flex flex-col fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-border">
        <div className="text-base font-bold text-t1">📊 Event Analogue</div>
        <div className="text-[11px] text-t3 mt-0.5">Cross-asset geopolitical tracker</div>
      </div>

      {/* Nav */}
      <div className="px-3 pt-4 pb-2">
        <div className="text-[10px] uppercase tracking-widest text-t4 font-semibold px-1 mb-2">Navigation</div>
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5',
                active ? 'bg-accent/10 text-accent font-medium' : 'text-t2 hover:bg-hover hover:text-t1',
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Events */}
      <div className="px-3 pt-2 pb-2 border-t border-border mt-2">
        <div className="text-[10px] uppercase tracking-widest text-t4 font-semibold px-1 mb-2">Active Events</div>
        <div className="flex gap-1.5 mb-2 px-1">
          <button onClick={onSelectAll} className="text-[10px] text-accent hover:text-accent/80 font-medium">All</button>
          <span className="text-t4">·</span>
          <button onClick={onSelectNone} className="text-[10px] text-accent hover:text-accent/80 font-medium">None</button>
        </div>
        <div className="space-y-0.5 max-h-[340px] overflow-y-auto pr-1">
          {events.map(evt => {
            const checked = selectedEvents.includes(evt);
            const short = evt.split('(')[0].trim();
            return (
              <label
                key={evt}
                className="flex items-center gap-2 px-1 py-1 rounded hover:bg-hover cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleEvent(evt)}
                  className="w-3 h-3 rounded border-border bg-card accent-accent"
                />
                <span className={clsx('text-xs', checked ? 'text-t2' : 'text-t3')}>
                  {short}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Asset Filter */}
      <div className="px-3 pt-2 pb-3 border-t border-border mt-2">
        <div className="text-[10px] uppercase tracking-widest text-t4 font-semibold px-1 mb-2">Asset Filter</div>
        <div className="flex gap-1 mb-2">
          {['All', 'Class', 'Group'].map(m => (
            <button
              key={m}
              onClick={() => onFilterChange(m)}
              className={clsx(
                'px-2.5 py-1 rounded text-[11px] font-medium transition-colors',
                filterMode === m
                  ? 'bg-accent/15 text-accent'
                  : 'text-t3 hover:text-t2 hover:bg-hover',
              )}
            >
              {m}
            </button>
          ))}
        </div>
        {filterMode === 'Class' && (
          <select
            value={selectedClass}
            onChange={e => onClassChange(e.target.value)}
            className="w-full bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-t1"
          >
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {filterMode === 'Group' && (
          <select
            value={selectedGroup}
            onChange={e => onGroupChange(e.target.value)}
            className="w-full bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-t1"
          >
            {groups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        )}
      </div>

      {/* Footer stats */}
      <div className="mt-auto px-4 py-3 border-t border-border">
        <div className="flex gap-1.5 flex-wrap">
          <Badge>{assetCount} assets</Badge>
          <Badge>{selectedEvents.length} events</Badge>
        </div>
      </div>
    </aside>
  );
}
