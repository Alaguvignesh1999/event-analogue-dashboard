'use client';

import { PlotlyChart } from './PlotlyChart';
import { eventColors } from '@/lib/theme';
import type { EventReturns } from '@/lib/types';
import { pr } from '@/lib/engine';

// ── Scatter ─────────────────────────────────────────

interface ScatterChartProps {
  assetX: string;
  assetY: string;
  eventReturns: EventReturns;
  selectedEvents: string[];
  offset: number;
  horizonLabel: string;
  height?: number;
}

export function ScatterChart({ assetX, assetY, eventReturns, selectedEvents, offset, horizonLabel, height = 400 }: ScatterChartProps) {
  const traces: any[] = [];

  selectedEvents.forEach((evt, i) => {
    const xv = pr(eventReturns, assetX, evt, offset);
    const yv = pr(eventReturns, assetY, evt, offset);
    if (isNaN(xv) || isNaN(yv)) return;
    const c = eventColors[i % eventColors.length];
    traces.push({
      x: [xv], y: [yv], name: evt, mode: 'markers+text',
      marker: { color: c, size: 12, line: { width: 1, color: '#0a0e17' } },
      text: [evt.split(' ')[0]], textposition: 'top center',
      textfont: { size: 9, color: c },
      hovertemplate: `<b>${evt}</b><br>${assetX}: %{x:.1f}%<br>${assetY}: %{y:.1f}%<extra></extra>`,
    });
  });

  return (
    <PlotlyChart
      data={traces}
      layout={{
        title: { text: `${assetX} vs ${assetY} at ${horizonLabel}` },
        xaxis: { title: assetX, zeroline: true, zerolinecolor: '#252d3d' },
        yaxis: { title: assetY, zeroline: true, zerolinecolor: '#252d3d' },
        showlegend: false,
        shapes: [
          { type: 'line', x0: 0, x1: 0, y0: 0, y1: 1, yref: 'paper', line: { color: '#252d3d' } },
          { type: 'line', y0: 0, y1: 0, x0: 0, x1: 1, xref: 'paper', line: { color: '#252d3d' } },
        ],
      }}
      height={height}
    />
  );
}

// ── Bar Chart ───────────────────────────────────────

interface BarChartProps {
  labels: string[];
  values: number[];
  title?: string;
  yTitle?: string;
  height?: number;
  colorBySign?: boolean;
}

export function BarChart({ labels, values, title, yTitle, height = 340, colorBySign = true }: BarChartProps) {
  return (
    <PlotlyChart
      data={[{
        type: 'bar',
        x: labels,
        y: values,
        marker: {
          color: colorBySign
            ? values.map(v => v > 0 ? '#22c55e' : '#ef4444')
            : '#3b82f6',
        },
        hovertemplate: '<b>%{x}</b><br>%{y:.1f}%<extra></extra>',
      }]}
      layout={{
        title: title ? { text: title } : undefined,
        yaxis: { title: yTitle },
        xaxis: { tickangle: -45 },
      }}
      height={height}
    />
  );
}

// ── Box Chart ───────────────────────────────────────

interface BoxChartProps {
  asset: string;
  eventReturns: EventReturns;
  selectedEvents: string[];
  pois: { label: string; offset: number }[];
  height?: number;
}

export function BoxChart({ asset, eventReturns, selectedEvents, pois, height = 380 }: BoxChartProps) {
  const traces: any[] = pois.map((p, j) => {
    const vals = selectedEvents
      .map(e => pr(eventReturns, asset, e, p.offset))
      .filter(v => !isNaN(v));
    return {
      type: 'box' as const,
      y: vals,
      name: p.label,
      marker: { color: eventColors[j % eventColors.length] },
      boxpoints: 'all' as const,
      jitter: 0.3,
      pointpos: 0,
    };
  });

  return (
    <PlotlyChart
      data={traces}
      layout={{
        title: { text: `${asset} — Return Distributions` },
        showlegend: false,
      }}
      height={height}
    />
  );
}

// ── Matrix Heatmap (Lead-Lag / Correlation) ─────────

interface MatrixChartProps {
  labels: string[];
  matrix: number[][];
  title?: string;
  colorscale?: [number, string][];
  height?: number;
  textFormat?: string;
}

export function MatrixChart({
  labels, matrix, title, height,
  colorscale = [[0, '#ec4899'], [0.5, '#1a1f2e'], [1, '#3b82f6']],
  textFormat = '.0f',
}: MatrixChartProps) {
  return (
    <PlotlyChart
      data={[{
        type: 'heatmap',
        z: matrix,
        x: labels,
        y: labels,
        colorscale,
        zmid: 0,
        text: matrix.map(row => row.map(v => isNaN(v) ? '' : v.toFixed(textFormat === '.2f' ? 2 : 0))),
        texttemplate: '%{text}',
        textfont: { size: 9, color: '#5a6578' },
      }]}
      layout={{
        title: title ? { text: title } : undefined,
        xaxis: { tickangle: 45 },
      }}
      height={height || Math.max(400, labels.length * 22 + 80)}
    />
  );
}
