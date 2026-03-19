'use client';

import { PlotlyChart } from './PlotlyChart';
import { eventColors, eventDashes } from '@/lib/theme';
import type { EventReturns, POI } from '@/lib/types';

interface OverlayChartProps {
  asset: string;
  eventReturns: EventReturns;
  selectedEvents: string[];
  pois?: POI[];
  height?: number;
  showPOIs?: boolean;
  title?: string;
}

export function OverlayChart({
  asset, eventReturns, selectedEvents, pois = [],
  height = 420, showPOIs = true, title,
}: OverlayChartProps) {
  const ad = eventReturns[asset];
  if (!ad) return <div className="text-t3 text-sm py-8 text-center">No data for {asset}</div>;

  const traces: any[] = [];

  selectedEvents.forEach((evt, i) => {
    const series = ad[evt];
    if (!series) return;
    const offsets = Object.keys(series).map(Number).sort((a, b) => a - b);
    if (offsets.length < 3) return;

    traces.push({
      x: offsets,
      y: offsets.map(o => series[o]),
      name: evt,
      mode: 'lines',
      line: {
        color: eventColors[i % eventColors.length],
        width: 1.5,
        dash: eventDashes[i % eventDashes.length] as any,
      },
      opacity: 0.7,
      hovertemplate: `<b>${evt}</b><br>Day %{x}: %{y:.2f}%<extra></extra>`,
    });
  });

  const shapes: any[] = showPOIs
    ? pois.map(p => ({
        type: 'line' as const,
        x0: p.offset, x1: p.offset,
        y0: 0, y1: 1, yref: 'paper' as const,
        line: { color: '#252d3d', width: 1, dash: 'dot' as const },
      }))
    : [];

  const annotations: any[] = showPOIs
    ? pois.map(p => ({
        x: p.offset, y: 1.02, yref: 'paper' as const,
        text: p.label,
        showarrow: false,
        font: { size: 9, color: '#5a6578' },
      }))
    : [];

  return (
    <PlotlyChart
      data={traces}
      layout={{
        title: title ? { text: title } : undefined,
        xaxis: { title: 'Days from Event' },
        yaxis: { title: 'Return %' },
        shapes,
        annotations,
      }}
      height={height}
    />
  );
}
