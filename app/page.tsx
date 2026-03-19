'use client';

import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/components/layout/AppShell';
import { SparklineCard } from '@/components/charts/SparklineCard';
import { HorizontalRadio } from '@/components/ui/Select';
import { Settings2 } from 'lucide-react';

const DEFAULT_WATCHLIST = ['S&P 500', 'Brent Futures', 'Gold', 'VIX', 'DXY', 'US 10Y Yield'];
const FORWARD_POIS = ['t+1W', 't+1M', 't+3M'];

export default function WatchlistPage() {
  const { data, selectedEvents } = useApp();
  const [watchlist, setWatchlist] = useState<string[]>(DEFAULT_WATCHLIST);
  const [horizon, setHorizon] = useState('t+1M');
  const [configOpen, setConfigOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('watchlist');
      if (saved) setWatchlist(JSON.parse(saved));
    } catch {}
  }, []);

  // Save to localStorage
  useEffect(() => {
    try { localStorage.setItem('watchlist', JSON.stringify(watchlist)); } catch {}
  }, [watchlist]);

  const horizonOffset = useMemo(() => {
    const poi = data.config.pois.find(p => p.label === horizon);
    return poi?.offset ?? 21;
  }, [horizon, data.config.pois]);

  const validWatchlist = watchlist.filter(a => a in data.eventReturns);

  // Compute stats for each card
  const cardStats = useMemo(() => {
    return validWatchlist.map(asset => {
      const ad = data.eventReturns[asset] || {};
      const fwdVals: number[] = [];
      for (const e of selectedEvents) {
        const s = ad[e];
        if (s && s[horizonOffset] !== undefined && s[0] !== undefined) {
          fwdVals.push(s[horizonOffset] - s[0]);
        }
      }
      if (fwdVals.length === 0) {
        return { asset, median: NaN, hitRate: NaN, direction: '—', coverage: `0/${selectedEvents.length}` };
      }
      const sorted = [...fwdVals].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const med = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      const hr = (med > 0
        ? fwdVals.filter(v => v > 0).length / fwdVals.length
        : fwdVals.filter(v => v < 0).length / fwdVals.length) * 100;
      return {
        asset,
        median: med,
        hitRate: hr,
        direction: med > 0 ? 'LONG' : 'SHORT',
        coverage: `${fwdVals.length}/${selectedEvents.length}`,
      };
    });
  }, [validWatchlist, selectedEvents, horizonOffset, data.eventReturns]);

  // Available assets for adding
  const availableAssets = useMemo(() => {
    const inWl = new Set(watchlist);
    return Object.keys(data.eventReturns)
      .filter(a => !inWl.has(a))
      .filter(a => !searchTerm || a.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [data.eventReturns, watchlist, searchTerm]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-t1">Watchlist</h1>
          <p className="text-xs text-t3 mt-0.5">{validWatchlist.length} assets monitored</p>
        </div>
        <div className="flex items-center gap-3">
          <HorizontalRadio value={horizon} onChange={setHorizon} options={FORWARD_POIS} />
          <button
            onClick={() => setConfigOpen(!configOpen)}
            className="p-2 rounded-lg border border-border hover:bg-hover transition-colors"
          >
            <Settings2 className="w-4 h-4 text-t3" />
          </button>
        </div>
      </div>

      {/* Config panel */}
      {configOpen && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4">
          <div className="text-sm font-semibold text-t1 mb-3">Configure Watchlist</div>

          {/* Quick-add groups */}
          <div className="mb-3">
            <div className="text-[10px] uppercase tracking-wider text-t3 font-semibold mb-1.5">Quick-add group</div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(data.config.groups).map(([name, assets]) => (
                <button
                  key={name}
                  onClick={() => {
                    const newAssets = assets.filter((a: string) => a in data.eventReturns && !watchlist.includes(a));
                    if (newAssets.length > 0) setWatchlist([...watchlist, ...newAssets]);
                  }}
                  className="px-2.5 py-1 text-[11px] text-t3 border border-border rounded-md hover:border-accent/30 hover:text-accent transition-colors"
                >
                  + {name}
                </button>
              ))}
            </div>
          </div>

          {/* Search + add individual */}
          <div className="mb-3">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search assets..."
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-t1 focus:outline-none focus:border-accent/50"
            />
            {searchTerm && (
              <div className="mt-1.5 max-h-32 overflow-y-auto bg-surface border border-border rounded-lg">
                {availableAssets.slice(0, 10).map(a => (
                  <button
                    key={a}
                    onClick={() => { setWatchlist([...watchlist, a]); setSearchTerm(''); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-t2 hover:bg-hover"
                  >
                    + {a}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Current watchlist with remove */}
          <div className="flex flex-wrap gap-1.5">
            {watchlist.map(a => (
              <span key={a} className="inline-flex items-center gap-1 bg-surface border border-border rounded-md px-2 py-1 text-xs text-t2">
                {a}
                <button onClick={() => setWatchlist(watchlist.filter(x => x !== a))} className="text-t4 hover:text-negative ml-0.5">×</button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Card grid */}
      {validWatchlist.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="text-t3 text-sm">No assets in watchlist.</div>
          <button onClick={() => setConfigOpen(true)} className="text-accent text-sm mt-2 hover:underline">
            Configure watchlist →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {cardStats.map(cs => (
            <SparklineCard
              key={cs.asset}
              asset={cs.asset}
              assetClass={data.assetMeta[cs.asset]?.class || ''}
              eventReturns={data.eventReturns}
              selectedEvents={selectedEvents}
              median={cs.median}
              hitRate={cs.hitRate}
              direction={cs.direction}
              coverage={cs.coverage}
            />
          ))}
        </div>
      )}
    </div>
  );
}
