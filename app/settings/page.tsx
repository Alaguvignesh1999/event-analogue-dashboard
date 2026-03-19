'use client';

import { useState } from 'react';
import { useApp } from '@/components/layout/AppShell';
import { DataTable } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/Badge';

const TABS = ['Event Catalogue', 'Weight Presets', 'About'];

const WEIGHT_PRESETS = [
  { name: 'Default', quant: 50, tag: 30, macro: 20 },
  { name: 'Quant-heavy', quant: 70, tag: 20, macro: 10 },
  { name: 'Macro-heavy', quant: 30, tag: 20, macro: 50 },
  { name: 'Tag-heavy', quant: 20, tag: 60, macro: 20 },
  { name: 'Equal', quant: 33, tag: 34, macro: 33 },
];

export default function SettingsPage() {
  const { data } = useApp();
  const [activeTab, setActiveTab] = useState(TABS[0]);

  return (
    <div>
      <h1 className="text-xl font-bold text-t1 mb-5">Settings</h1>

      {/* Tab bar */}
      <div className="flex gap-0 border-b border-border mb-5">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'text-accent border-accent'
                : 'text-t3 border-transparent hover:text-t2'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Event Catalogue */}
      {activeTab === 'Event Catalogue' && (
        <div>
          <p className="text-xs text-t3 mb-4">{data.config.events.length} historical events in the database</p>
          <DataTable
            columns={[
              { key: 'name', label: 'Event', render: v => <span className="text-accent font-medium">{v}</span> },
              { key: 'date', label: 'Date' },
              { key: 'tags', label: 'Tags', render: (v: string[]) => (
                <div className="flex flex-wrap gap-1">
                  {v.map(t => <Badge key={t} variant="muted">{t}</Badge>)}
                </div>
              )},
              { key: 'cpi', label: 'CPI' },
              { key: 'fed', label: 'Fed' },
              { key: 'trigger', label: 'Trigger', align: 'right', render: v => v ? `$${v}` : '—' },
            ]}
            data={data.config.events.map(e => ({
              name: e.name,
              date: e.date,
              tags: data.config.eventTags[e.name] || [],
              cpi: (data.config.macroContext as any)[e.name]?.cpi || '—',
              fed: (data.config.macroContext as any)[e.name]?.fed || '—',
              trigger: (data.config.macroContext as any)[e.name]?.trigger,
            }))}
          />
        </div>
      )}

      {/* Weight Presets */}
      {activeTab === 'Weight Presets' && (
        <div>
          <p className="text-xs text-t3 mb-4">Scoring weight profiles — select from the Live Event page</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {WEIGHT_PRESETS.map(p => (
              <div key={p.name} className="bg-card border border-border rounded-xl p-4">
                <div className="text-sm font-semibold text-t1 mb-3">{p.name}</div>
                <div className="space-y-2">
                  {[
                    { label: 'Quantitative', value: p.quant, color: 'bg-accent' },
                    { label: 'Tag Match', value: p.tag, color: 'bg-purple' },
                    { label: 'Macro', value: p.macro, color: 'bg-amber' },
                  ].map(w => (
                    <div key={w.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-t3">{w.label}</span>
                        <span className="text-t2 font-medium">{w.value}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                        <div className={`h-full ${w.color} rounded-full opacity-60`} style={{ width: `${w.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* About */}
      {activeTab === 'About' && (
        <div className="max-w-2xl">
          <div className="bg-card border border-border rounded-xl p-5 space-y-3 text-sm text-t2">
            <p><strong className="text-t1">Event Analogue Dashboard</strong> — Cross-asset geopolitical event tracker</p>
            <p>Compares current market events against {data.config.events.length} historical analogues across {Object.keys(data.eventReturns).length} assets.</p>
            <div className="border-t border-border pt-3 space-y-1 text-xs text-t3">
              <p>Data: {Object.keys(data.eventReturns).length} assets · {data.config.events.length} events · {Object.keys(data.config.groups).length} groups</p>
              <p>Engine: Cosine similarity + Jaccard tags + Macro regime matching</p>
              <p>Refresh: GitHub Actions (daily 06:00 UTC + manual trigger)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
