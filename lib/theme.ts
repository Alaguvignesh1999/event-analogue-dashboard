// ── Color palette ───────────────────────────────────
export const colors = {
  bg: '#0a0e17',
  surface: '#111827',
  card: '#1a1f2e',
  border: '#252d3d',
  hover: '#1e2740',
  t1: '#f0f2f5',
  t2: '#a0aec0',
  t3: '#5a6578',
  t4: '#3a4050',
  accent: '#3b82f6',
  positive: '#22c55e',
  negative: '#ef4444',
  amber: '#f59e0b',
  purple: '#a78bfa',
  teal: '#2dd4bf',
  magenta: '#ec4899',
  orange: '#f97316',
} as const;

// 13 event line colors — visually distinct on dark backgrounds
export const eventColors = [
  '#3b82f6', '#ec4899', '#22c55e', '#f59e0b', '#ef4444',
  '#a78bfa', '#2dd4bf', '#f97316', '#60a5fa', '#f87171',
  '#4ade80', '#c4b5fd', '#fb923c',
];

export const eventDashes = [
  'solid', 'dash', 'dot', 'dashdot',
];

// ── Plotly layout base ──────────────────────────────
export const plotlyLayout: any = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: 'rgba(0,0,0,0)',
  font: { color: colors.t2, family: "'Geist Sans', system-ui, sans-serif", size: 11 },
  title: { font: { color: colors.t1, size: 13 }, x: 0.01, y: 0.97 },
  xaxis: {
    gridcolor: '#1a2030',
    zerolinecolor: '#252d3d',
    tickfont: { color: colors.t3, size: 10 },
    showgrid: true,
    gridwidth: 1,
  },
  yaxis: {
    gridcolor: '#1a2030',
    zerolinecolor: '#252d3d',
    tickfont: { color: colors.t3, size: 10 },
    showgrid: true,
    gridwidth: 1,
  },
  legend: {
    bgcolor: 'rgba(0,0,0,0)',
    font: { color: colors.t2, size: 10 },
    orientation: 'h' as const,
    yanchor: 'bottom' as const,
    y: 1.02,
    xanchor: 'right' as const,
    x: 1,
  },
  margin: { l: 48, r: 12, t: 36, b: 32 },
  hovermode: 'x unified' as const,
  hoverlabel: {
    bgcolor: colors.card,
    font: { size: 11, color: colors.t1 },
    bordercolor: colors.border,
  },
};

export const plotlyConfig: any = {
  displayModeBar: false,
  responsive: true,
};

// ── Merge helper ────────────────────────────────────
export function mergeLayout(overrides: any = {}): any {
  return {
    ...plotlyLayout,
    ...overrides,
    xaxis: { ...(plotlyLayout.xaxis as object), ...(overrides.xaxis as object || {}) },
    yaxis: { ...(plotlyLayout.yaxis as object), ...(overrides.yaxis as object || {}) },
  };
}

// ── Utility ─────────────────────────────────────────
export function returnColor(v: number): string {
  if (v > 0.05) return colors.positive;
  if (v < -0.05) return colors.negative;
  return colors.t3;
}

export function directionColor(dir: string): string {
  return dir === 'LONG' || dir === 'BOUGHT' ? colors.positive : colors.negative;
}

export function starsString(n: number): string {
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}
