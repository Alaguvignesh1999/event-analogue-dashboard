'use client';

import { PlotlyChart } from './PlotlyChart';
import type { EventReturns, POI } from '@/lib/types';

interface HeatmapChartProps {
  asset: string;
  eventReturns: EventReturns;
  selectedEvents: string[];
  pois: POI[];
  height?: number;
}

export function HeatmapChart({ asset, eventReturns, selectedEvents, pois, height }: HeatmapChartProps) {
  const ad = eventReturns[asset];
  if (!ad) return null;

  const z: (number | null)[][] = [];
  const yLabels: string[] = [];

  for (const evt of selectedEvents) {
    const s = ad[evt];
    if (!s) continue;
    z.push(pois.map(p => s[p.offset] ?? null));
    yLabels.push(evt);
  }

  if (z.length === 0) return <div className="text-t3 text-sm py-4">No data</div>;

  const xLabels = pois.map(p => p.label);

  return (
    <PlotlyChart
      data={[{
        type: 'heatmap',
        z,
        x: xLabels,
        y: yLabels,
        colorscale: [[0, '#ef4444'], [0.5, '#1a1f2e'], [1, '#22c55e']],
        zmid: 0,
        text: z.map(row => row.map(v => v != null ? v.toFixed(1) : '')),
        texttemplate: '%{text}',
        textfont: { size: 11, color: '#a0aec0' },
        hovertemplate: '<b>%{y}</b><br>%{x}: %{z:.1f}%<extra></extra>',
        showscale: true,
        colorbar: { tickfont: { color: '#5a6578', size: 10 }, len: 0.8 },
      }]}
      layout={{
        title: { text: `${asset} — Returns by Event & Horizon` },
        yaxis: { autorange: 'reversed' as const },
      }}
      height={height || Math.max(300, yLabels.length * 32 + 80)}
    />
  );
}
