'use client';

import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { loadData, getLabels, getClasses, getAssetsByClass, getAssetsByGroup, getEventNames } from '@/lib/data';
import type { AppData } from '@/lib/types';

// ── Context ─────────────────────────────────────────

interface AppState {
  data: AppData;
  labels: string[];
  filteredLabels: string[];
  selectedEvents: string[];
  setSelectedEvents: (events: string[]) => void;
}

const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppShell');
  return ctx;
}

// ── Shell ───────────────────────────────────────────

export function AppShell({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState('All');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');

  useEffect(() => {
    loadData().then(d => {
      setData(d);
      setSelectedEvents(getEventNames(d));
      const cls = getClasses(d);
      if (cls.length > 0) setSelectedClass(cls[0]);
      const grps = Object.keys(d.config.groups);
      if (grps.length > 0) setSelectedGroup(grps[0]);
      setLoading(false);
    });
  }, []);

  const toggleEvent = useCallback((evt: string) => {
    setSelectedEvents(prev =>
      prev.includes(evt) ? prev.filter(e => e !== evt) : [...prev, evt]
    );
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-t3 text-sm">Loading dashboard data...</div>
        </div>
      </div>
    );
  }

  const allLabels = getLabels(data);
  const classes = getClasses(data);
  const groups = Object.keys(data.config.groups);
  const eventNames = getEventNames(data);

  let filteredLabels = allLabels;
  if (filterMode === 'Class' && selectedClass) {
    filteredLabels = getAssetsByClass(data, selectedClass);
  } else if (filterMode === 'Group' && selectedGroup) {
    filteredLabels = getAssetsByGroup(data, selectedGroup);
  }

  return (
    <AppContext.Provider value={{
      data,
      labels: allLabels,
      filteredLabels,
      selectedEvents,
      setSelectedEvents,
    }}>
      <div className="flex min-h-screen bg-bg">
        <Sidebar
          events={eventNames}
          selectedEvents={selectedEvents}
          onToggleEvent={toggleEvent}
          onSelectAll={() => setSelectedEvents(eventNames)}
          onSelectNone={() => setSelectedEvents([])}
          assetCount={filteredLabels.length}
          filterMode={filterMode}
          onFilterChange={setFilterMode}
          classes={classes}
          groups={groups}
          selectedClass={selectedClass}
          selectedGroup={selectedGroup}
          onClassChange={setSelectedClass}
          onGroupChange={setSelectedGroup}
        />
        <main className="flex-1 ml-60 min-h-screen">
          <div className="max-w-[1400px] mx-auto px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </AppContext.Provider>
  );
}
