'use client';

import dynamic from 'next/dynamic';

// Dynamic import: react-plotly.js with plotly.js-dist-min for smaller bundle
const Plot = dynamic(
  () => import('react-plotly.js').then(mod => mod.default),
  { ssr: false, loading: () => <div className="h-64 flex items-center justify-center text-t4 text-xs">Loading chart...</div> }
);

interface PlotlyChartProps {
  data: any[];
  layout?: Record<string, any>;
  config?: Record<string, any>;
  height?: number;
  className?: string;
}

export function PlotlyChart({ data, layout = {}, config = {}, height = 400, className }: PlotlyChartProps) {
  const baseLayout: Record<string, any> = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#a0aec0', family: "var(--font-sans), system-ui, sans-serif", size: 11 },
    title: { font: { color: '#f0f2f5', size: 13 }, x: 0.01, y: 0.97, xanchor: 'left', yanchor: 'top' },
    xaxis: {
      gridcolor: '#1a2030', zerolinecolor: '#252d3d',
      tickfont: { color: '#5a6578', size: 10 }, showgrid: true, gridwidth: 1,
      linecolor: '#252d3d',
    },
    yaxis: {
      gridcolor: '#1a2030', zerolinecolor: '#252d3d',
      tickfont: { color: '#5a6578', size: 10 }, showgrid: true, gridwidth: 1,
      linecolor: '#252d3d',
    },
    legend: {
      bgcolor: 'rgba(0,0,0,0)', font: { color: '#a0aec0', size: 10 },
      orientation: 'h', yanchor: 'bottom', y: 1.02, xanchor: 'right', x: 1,
    },
    margin: { l: 48, r: 12, t: 40, b: 32 },
    hovermode: 'x unified',
    hoverlabel: { bgcolor: '#1a1f2e', font: { size: 11, color: '#f0f2f5' }, bordercolor: '#252d3d' },
    height,
    autosize: true,
  };

  // Deep merge layout
  const merged = { ...baseLayout };
  for (const [key, val] of Object.entries(layout)) {
    if (key === 'xaxis' || key === 'yaxis') {
      merged[key] = { ...(baseLayout[key] || {}), ...(val as object || {}) };
    } else if (key === 'title' && typeof val === 'object') {
      merged[key] = { ...(baseLayout[key] || {}), ...(val as object) };
    } else {
      merged[key] = val;
    }
  }

  return (
    <div className={className}>
      <Plot
        data={data}
        layout={merged}
        config={{ displayModeBar: false, responsive: true, ...config }}
        useResizeHandler
        style={{ width: '100%', height }}
      />
    </div>
  );
}
