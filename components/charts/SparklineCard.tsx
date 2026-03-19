'use client';

import { PlotlyChart } from './PlotlyChart';
import { DirectionBadge } from '@/components/ui/Badge';
import { eventColors } from '@/lib/theme';
import type { EventReturns } from '@/lib/types';

interface SparklineCardProps {
  asset: string;
  assetClass: string;
  eventReturns: EventReturns;
  selectedEvents: string[];
  median: number;
  hitRate: number;
  direction: string;
  coverage: string;
}

export function SparklineCard({
  asset, assetClass, eventReturns, selectedEvents,
  median, hitRate, direction, coverage,
}: SparklineCardProps) {
  const ad = eventReturns[asset];
  const medColor = isNaN(median) ? 'text-t4'
    : median > 0 ? 'text-positive'
    : median < 0 ? 'text-negative'
    : 'text-t3';

  // Build sparkline traces
  const traces: any[] = [];
  if (ad) {
    selectedEvents.forEach((evt, i) => {
      const s = ad[evt];
      if (!s) return;
      const offsets = Object.keys(s).map(Number).sort((a, b) => a - b);
      if (offsets.length < 3) return;
      traces.push({
        x: offsets,
        y: offsets.map(o => s[o]),
        mode: 'lines',
        line: { color: eventColors[i % eventColors.length], width: 1.2 },
        showlegend: false,
        hoverinfo: 'skip',
      });
    });
  }

  const medDisplay = isNaN(median) ? '—' : `${median > 0 ? '+' : ''}${median.toFixed(1)}%`;
  const hrDisplay = isNaN(hitRate) ? '—' : `${hitRate.toFixed(0)}%`;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-accent/20 transition-colors">
      {/* Stats */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-t1">{asset}</span>
          <span className="text-[10px] text-t3">{assetClass}</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-t3">Median Return</span>
            <span className={`font-medium ${medColor}`}>{medDisplay}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-t3">Hit Rate</span>
            <span className="text-t2 font-medium">{hrDisplay}</span>
          </div>
          <div className="flex justify-between text-xs items-center">
            <span className="text-t3">Direction</span>
            {direction !== '—' ? <DirectionBadge direction={direction} /> : <span className="text-t4">—</span>}
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-t3">Coverage</span>
            <span className="text-t3">{coverage}</span>
          </div>
        </div>
      </div>

      {/* Sparkline */}
      <div className="h-24 -mb-2">
        {traces.length > 0 ? (
          <PlotlyChart
            data={traces}
            layout={{
              margin: { l: 0, r: 0, t: 0, b: 0 },
              xaxis: { showgrid: false, showticklabels: false, zeroline: false },
              yaxis: { showgrid: false, showticklabels: false, zeroline: false },
            }}
            height={96}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-t4 text-xs">No data</div>
        )}
      </div>
    </div>
  );
}
