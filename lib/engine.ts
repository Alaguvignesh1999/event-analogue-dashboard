/**
 * Analogue Engine — complete port of notebook §5.1–5.15
 * All computation is client-side against pre-loaded JSON data.
 */
import type {
  EventReturns, ReturnSeries, AnalogueWeights, ScoreResult, TradeIdea,
  ScreenerResult, GateResult, StressResult, DetailStat, WFVResult,
  KellyResult, BCIResult, SectorResult, PreposResult, MAEResult,
  PortfolioScenario, POI, MacroContext,
} from './types';

// ── Helpers ─────────────────────────────────────────

function median(arr: number[]): number {
  if (arr.length === 0) return NaN;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return NaN;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return NaN;
  const s = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (s.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return s[lo];
  return s[lo] + (s[hi] - s[lo]) * (idx - lo);
}

function norm(arr: number[]): number {
  return Math.sqrt(arr.reduce((s, v) => s + v * v, 0));
}

function dot(a: number[], b: number[]): number {
  return a.reduce((s, v, i) => s + v * b[i], 0);
}

/** Get return at a specific offset for an asset×event */
export function pr(er: EventReturns, label: string, event: string, offset: number): number {
  const s = er[label]?.[event];
  if (!s || s[offset] === undefined) return NaN;
  return s[offset];
}

// ── §5.2 — Analogue Scoring ─────────────────────────

function cosineSim(a: number[], b: number[]): number {
  const mask: number[] = [];
  for (let i = 0; i < a.length; i++) {
    if (!isNaN(a[i]) && !isNaN(b[i])) mask.push(i);
  }
  if (mask.length < 2) return 0;
  const av = mask.map(i => a[i]);
  const bv = mask.map(i => b[i]);
  const d = norm(av) * norm(bv);
  return d > 0 ? dot(av, bv) / d : 0;
}

function jaccardSim(a: string[], b: string[]): number {
  const sa = new Set(a);
  const sb = new Set(b);
  const union = new Set([...sa, ...sb]);
  if (union.size === 0) return 0;
  const intersection = [...sa].filter(x => sb.has(x));
  return intersection.length / union.size;
}

function macroSim(
  live: MacroContext,
  hist: MacroContext,
  triggerSigma: number = 1.5,
): number {
  let score = 0;
  let n = 0;
  // Trigger level
  if (live.trigger != null && hist.trigger != null) {
    score += Math.max(0, 1 - Math.abs(live.trigger - hist.trigger) / 100);
    n++;
  }
  // CPI
  if (live.cpi && hist.cpi) {
    score += live.cpi === hist.cpi ? 1 : 0;
    n++;
  }
  // Fed
  if (live.fed && hist.fed) {
    score += live.fed === hist.fed ? 1 : 0;
    n++;
  }
  return n > 0 ? score / n : 0;
}

export function score(
  er: EventReturns,
  target: string,
  events: string[],
  eventTags: Record<string, string[]>,
  macroContext: Record<string, MacroContext>,
  simPool: string[],
  weights: AnalogueWeights,
): ScoreResult[] {
  const tgtTags = eventTags[target] || [];
  const tgtMacro = macroContext[target];
  const results: ScoreResult[] = [];

  for (const evt of events) {
    if (evt === target) continue;

    // Quant similarity — cosine of return vectors at day 0
    const lv: number[] = [];
    const hv: number[] = [];
    for (const asset of simPool) {
      const t = pr(er, asset, target, 0);
      const h = pr(er, asset, evt, 0);
      if (!isNaN(t) && !isNaN(h)) {
        lv.push(t);
        hv.push(h);
      }
    }
    const qs = lv.length >= 2 ? Math.max(0, cosineSim(lv, hv)) : 0;

    // Tag similarity
    const eTags = eventTags[evt] || [];
    const ts = jaccardSim(tgtTags, eTags);

    // Macro similarity
    const eMacro = macroContext[evt];
    const ms = tgtMacro && eMacro ? macroSim(tgtMacro, eMacro) : 0;

    const composite = weights.quant * qs + weights.tag * ts + weights.macro * ms;

    results.push({
      event: evt,
      composite: Math.round(composite * 1000) / 1000,
      quant: Math.round(qs * 1000) / 1000,
      tag: Math.round(ts * 1000) / 1000,
      macro: Math.round(ms * 1000) / 1000,
      tags: eTags,
    });
  }

  return results.sort((a, b) => b.composite - a.composite);
}

// ── §5.4 — Trade Ideas ──────────────────────────────

function computeStars(iqr: number, med: number): number {
  if (Math.abs(med) < 0.01) return 1;
  const r = iqr / (Math.abs(med) + 1e-9);
  if (r < 0.4) return 5;
  if (r < 0.7) return 4;
  if (r < 1.0) return 3;
  if (r < 1.5) return 2;
  return 1;
}

export function ideas(
  er: EventReturns,
  selectedEvents: string[],
  labels: string[],
  assetMeta: Record<string, { class: string }>,
  dn: number = 0,
  fwd: number = 21,
): TradeIdea[] {
  const fo = dn + fwd;
  const rows: TradeIdea[] = [];

  for (const l of labels) {
    const ad = er[l];
    if (!ad) continue;
    const fwdVals: number[] = [];
    for (const e of selectedEvents) {
      const s = ad[e];
      if (!s || s[fo] === undefined || s[dn] === undefined) continue;
      fwdVals.push(s[fo] - s[dn]);
    }
    if (fwdVals.length < 2) continue;

    const md = median(fwdVals);
    const mn = mean(fwdVals);
    const sd = std(fwdVals);
    const iq = percentile(fwdVals, 75) - percentile(fwdVals, 25);
    const hr = md > 0
      ? mean(fwdVals.map(v => v > 0 ? 1 : 0))
      : mean(fwdVals.map(v => v < 0 ? 1 : 0));
    const va = sd > 0.001 ? md / sd : 0;
    const sc = Math.abs(md) / (iq + 0.001);
    const dir: 'LONG' | 'SHORT' = md > 0 ? 'LONG' : 'SHORT';

    rows.push({
      label: l,
      class: assetMeta[l]?.class || '',
      direction: dir,
      median: Math.round(md * 100) / 100,
      mean: Math.round(mn * 100) / 100,
      std: Math.round(sd * 100) / 100,
      iqr: Math.round(iq * 100) / 100,
      hitRate: Math.round(hr * 1000) / 10,
      volAdj: Math.round(va * 1000) / 1000,
      score: Math.round(sc * 1000) / 1000,
      stars: computeStars(iq, md),
      n: fwdVals.length,
      nTotal: selectedEvents.length,
      fwdVals,
    });
  }

  return rows.sort((a, b) => b.score - a.score);
}

// ── §5.9 — Screener ─────────────────────────────────

export function screener(
  er: EventReturns,
  selectedEvents: string[],
  labels: string[],
  assetMeta: Record<string, { class: string }>,
  dn: number = 0,
  fwd: number = 21,
  minHit: number = 60,
  minCov: number = 50,
  minScore: number = 0.8,
): { pass: ScreenerResult[]; fail: ScreenerResult[] } {
  const ix = ideas(er, selectedEvents, labels, assetMeta, dn, fwd);
  const pass: ScreenerResult[] = [];
  const fail: ScreenerResult[] = [];

  for (const r of ix) {
    const cov = (r.n / Math.max(r.nTotal, 1)) * 100;
    const posRate = mean(r.fwdVals.map(v => v > 0 ? 1 : 0)) * 100;
    const bimodal = posRate > 30 && posRate < 70;
    const passes = r.hitRate >= minHit && cov >= minCov && r.score >= minScore;

    const sr: ScreenerResult = {
      ...r,
      coverage: Math.round(cov * 10) / 10,
      bimodal,
      pass: passes,
    };
    (passes ? pass : fail).push(sr);
  }

  return { pass, fail };
}

// ── Entry Gate ──────────────────────────────────────

export function gate(
  er: EventReturns,
  selectedEvents: string[],
  labels: string[],
  dn: number = 0,
  fwd: number = 21,
): GateResult[] {
  const fo = dn + fwd;
  const rows: GateResult[] = [];

  for (const l of labels) {
    const ad = er[l];
    if (!ad) continue;
    const fv: number[] = [];
    for (const e of selectedEvents) {
      const s = ad[e];
      if (!s || s[fo] === undefined || s[dn] === undefined) continue;
      fv.push(s[fo] - s[dn]);
    }
    if (fv.length < 3) continue;

    const md = median(fv);
    const tp = percentile(fv, 75);
    const sl = percentile(fv, 25);
    const lp = 50.0; // historical proxy
    const g = lp < 33 ? '🟢 ENTER' : lp < 66 ? '🟡 HALF' : lp < 85 ? '🟠 LATE' : '🔴 SKIP';

    rows.push({
      label: l,
      gate: g,
      direction: md > 0 ? 'LONG' : 'SHORT',
      median: Math.round(md * 100) / 100,
      tp: Math.round(tp * 100) / 100,
      sl: Math.round(sl * 100) / 100,
      rr: Math.round((Math.abs(tp) / (Math.abs(sl) + 0.001)) * 100) / 100,
      n: fv.length,
    });
  }

  return rows.sort((a, b) => Math.abs(b.median) - Math.abs(a.median));
}

// ── Stress Test ─────────────────────────────────────

export function stress(
  er: EventReturns,
  portfolio: PortfolioScenario,
  selectedEvents: string[],
  dn: number = 0,
  fwd: number = 21,
): StressResult {
  const fo = dn + fwd;
  const eventPnl: Record<string, number> = {};

  for (const e of selectedEvents) {
    let pnl = 0;
    for (const [l, notional] of Object.entries(portfolio)) {
      const sv = pr(er, l, e, dn);
      const fv = pr(er, l, e, fo);
      if (!isNaN(sv) && !isNaN(fv)) {
        pnl += notional * (fv - sv) / 100;
      }
    }
    eventPnl[e] = pnl;
  }

  const vs = Object.values(eventPnl).filter(v => !isNaN(v));
  if (vs.length === 0) {
    return { eventPnl, median: NaN, worst: NaN, best: NaN, hitRate: NaN };
  }

  return {
    eventPnl,
    median: median(vs),
    worst: Math.min(...vs),
    best: Math.max(...vs),
    hitRate: Math.round(mean(vs.map(v => v > 0 ? 1 : 0)) * 1000) / 10,
  };
}

// ── Detail Stats ────────────────────────────────────

export function detailStats(
  er: EventReturns,
  label: string,
  selectedEvents: string[],
  pois: POI[],
): DetailStat[] {
  const ad = er[label];
  if (!ad) return [];
  const rows: DetailStat[] = [];

  for (const { label: pl, offset: po } of pois) {
    const vs: number[] = [];
    for (const e of selectedEvents) {
      const s = ad[e];
      if (s && s[po] !== undefined) vs.push(s[po]);
    }
    if (vs.length === 0) continue;

    rows.push({
      poi: pl,
      offset: po,
      mean: Math.round(mean(vs) * 100) / 100,
      median: Math.round(median(vs) * 100) / 100,
      std: Math.round(std(vs) * 100) / 100,
      min: Math.round(Math.min(...vs) * 100) / 100,
      max: Math.round(Math.max(...vs) * 100) / 100,
      hitPos: Math.round(mean(vs.map(v => v > 0 ? 1 : 0)) * 1000) / 10,
      n: vs.length,
      vals: vs,
    });
  }

  return rows;
}

// ── Lead-Lag ────────────────────────────────────────

export function leadlag(
  er: EventReturns,
  selectedEvents: string[],
  labels: string[],
  offsets: number[] = [0, 5, 21, 63],
): { labels: string[]; matrix: number[][] } {
  const n = labels.length;
  const mat: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (const e of selectedEvents) {
    const peaks: (number | null)[] = labels.map(l => {
      const s = er[l]?.[e];
      if (!s) return null;
      const ar = offsets.map(o => Math.abs(s[o] ?? 0));
      const maxIdx = ar.indexOf(Math.max(...ar));
      return ar.some(v => v > 0) ? offsets[maxIdx] : null;
    });

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j && peaks[i] != null && peaks[j] != null) {
          mat[i][j] += peaks[i]! - peaks[j]!;
        }
      }
    }
  }

  const nEvents = Math.max(selectedEvents.length, 1);
  return {
    labels,
    matrix: mat.map(row => row.map(v => Math.round((v / nEvents) * 10) / 10)),
  };
}

// ── Correlation ─────────────────────────────────────

export function correlation(
  er: EventReturns,
  selectedEvents: string[],
  labels: string[],
  offset: number = 21,
): { labels: string[]; matrix: number[][] } {
  const data: Record<string, number[]> = {};
  for (const l of labels) {
    data[l] = selectedEvents.map(e => pr(er, l, e, offset));
  }

  const n = labels.length;
  const mat: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const a = data[labels[i]];
      const b = data[labels[j]];
      const pairs = a.map((v, k) => [v, b[k]]).filter(([x, y]) => !isNaN(x) && !isNaN(y));
      if (pairs.length < 3) {
        mat[i][j] = NaN;
        continue;
      }
      const ax = pairs.map(p => p[0]);
      const bx = pairs.map(p => p[1]);
      const ma = mean(ax);
      const mb = mean(bx);
      const num = ax.reduce((s, v, k) => s + (v - ma) * (bx[k] - mb), 0);
      const da = Math.sqrt(ax.reduce((s, v) => s + (v - ma) ** 2, 0));
      const db = Math.sqrt(bx.reduce((s, v) => s + (v - mb) ** 2, 0));
      mat[i][j] = da * db > 0 ? Math.round((num / (da * db)) * 100) / 100 : 0;
    }
  }

  return { labels, matrix: mat };
}

// ── Summary ─────────────────────────────────────────

export function summary(
  er: EventReturns,
  selectedEvents: string[],
  labels: string[],
  pois: POI[],
): Record<string, any>[] {
  return labels.map(l => {
    const ad = er[l] || {};
    const row: Record<string, any> = { asset: l };
    for (const { label: pl, offset: po } of pois) {
      const vs = selectedEvents
        .map(e => ad[e]?.[po])
        .filter((v): v is number => v !== undefined && !isNaN(v));
      row[pl] = vs.length > 0 ? Math.round(mean(vs) * 100) / 100 : NaN;
      row[`${pl}_n`] = vs.length;
    }
    return row;
  });
}

// ── Reverse Analogue Lookup ─────────────────────────

export function reverseAnalogue(
  er: EventReturns,
  selectedEvents: string[],
  labels: string[],
): Record<string, number> {
  const scores: Record<string, number> = {};

  for (const tgt of selectedEvents) {
    let total = 0;
    let cnt = 0;
    for (const other of selectedEvents) {
      if (other === tgt) continue;
      const lv: number[] = [];
      const hv: number[] = [];
      for (const l of labels.slice(0, 20)) {
        const t = pr(er, l, tgt, 0);
        const h = pr(er, l, other, 0);
        if (!isNaN(t) && !isNaN(h)) {
          lv.push(t);
          hv.push(h);
        }
      }
      if (lv.length >= 3) {
        const na = norm(lv);
        const nb = norm(hv);
        if (na > 1e-12 && nb > 1e-12) {
          total += dot(lv, hv) / (na * nb);
          cnt++;
        }
      }
    }
    scores[tgt] = Math.round((total / Math.max(cnt, 1)) * 1000) / 1000;
  }

  return Object.fromEntries(
    Object.entries(scores).sort(([, a], [, b]) => b - a)
  );
}

// ── Sector Rotation ─────────────────────────────────

export function sectorRotation(
  er: EventReturns,
  selectedEvents: string[],
  sectorETFs: string[],
  fwd: number = 21,
): SectorResult[] {
  const rows: SectorResult[] = [];

  for (const lbl of sectorETFs) {
    const ad = er[lbl];
    if (!ad) continue;
    const fv: number[] = [];
    for (const e of selectedEvents) {
      const s = ad[e];
      if (s && s[fwd] !== undefined && s[0] !== undefined) {
        fv.push(s[fwd] - s[0]);
      }
    }
    if (fv.length < 2) continue;

    rows.push({
      label: lbl,
      median: Math.round(median(fv) * 100) / 100,
      hit: Math.round(mean(fv.map(v => v > 0 ? 1 : 0)) * 1000) / 10,
      n: fv.length,
      std: Math.round(std(fv) * 100) / 100,
    });
  }

  return rows.sort((a, b) => b.median - a.median);
}

// ── Signal Decay ────────────────────────────────────

export function signalDecay(
  er: EventReturns,
  labels: string[],
  selectedEvents: string[],
  assetMeta: Record<string, { class: string }>,
  maxDn: number = 40,
): Record<number, string[]> {
  const results: Record<number, string[]> = {};
  for (let dn = 0; dn <= Math.min(maxDn, 55); dn += 5) {
    const ix = ideas(er, selectedEvents, labels.slice(0, 15), assetMeta, dn, 21);
    results[dn] = ix.slice(0, 3).map(r => r.label);
  }
  return results;
}

// ── Pre-Positioning ─────────────────────────────────

export function prepos(
  er: EventReturns,
  selectedEvents: string[],
  labels: string[],
  days: number = 10,
): PreposResult[] {
  const rows: PreposResult[] = [];

  for (const l of labels) {
    const ad = er[l];
    if (!ad) continue;
    const pv: number[] = [];
    for (const e of selectedEvents) {
      const s = ad[e];
      if (s && s[0] !== undefined && s[-days] !== undefined) {
        pv.push(s[0] - s[-days]);
      }
    }
    if (pv.length < 2) continue;

    const md = median(pv);
    const hr = md > 0
      ? mean(pv.map(v => v > 0 ? 1 : 0))
      : mean(pv.map(v => v < 0 ? 1 : 0));

    rows.push({
      label: l,
      direction: md > 0 ? 'BOUGHT' : 'SOLD',
      median: Math.round(md * 100) / 100,
      mean: Math.round(mean(pv) * 100) / 100,
      std: Math.round(std(pv) * 100) / 100,
      hitRate: Math.round(hr * 1000) / 10,
      n: pv.length,
    });
  }

  return rows.sort((a, b) => Math.abs(b.median) - Math.abs(a.median));
}

// ── Bootstrap CI ────────────────────────────────────

export function bci(vals: number[], nb: number = 500, ci: number = 0.8): BCIResult {
  if (vals.length < 3) return { lo: NaN, median: median(vals), hi: NaN };

  const medians: number[] = [];
  for (let i = 0; i < nb; i++) {
    const sample = Array.from({ length: vals.length }, () =>
      vals[Math.floor(Math.random() * vals.length)]
    );
    medians.push(median(sample));
  }

  const lo = (1 - ci) / 2;
  return {
    lo: Math.round(percentile(medians, lo * 100) * 100) / 100,
    median: Math.round(median(vals) * 100) / 100,
    hi: Math.round(percentile(medians, (1 - lo) * 100) * 100) / 100,
  };
}

// ── Kelly Fraction ──────────────────────────────────

export function kelly(
  hitRatePct: number,
  med: number,
  sd: number,
  budget: number = 1e6,
  frac: number = 0.5,
): KellyResult {
  const hr = hitRatePct / 100;
  const wl = Math.abs(med) / Math.max(sd, 0.001);
  let kf = hr - (1 - hr) / Math.max(wl, 0.001);
  kf = Math.max(0, Math.min(kf, 1)) * frac;

  return {
    kf: Math.round(kf * 1000) / 1000,
    notional: Math.round(budget * kf),
    budget,
  };
}

// ── Walk-Forward Validation ─────────────────────────

export function wfv(
  er: EventReturns,
  labels: string[],
  events: { name: string; date: string }[],
  fwdOffsets: number[] = [5, 21, 63],
  minTrain: number = 4,
): Record<string, Record<number, WFVResult>> {
  const sortedEvents = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const eventNames = sortedEvents.map(e => e.name);
  const result: Record<string, Record<number, WFVResult>> = {};

  for (const l of labels) {
    const ad = er[l];
    if (!ad) continue;
    const r: Record<number, WFVResult> = {};

    for (const fo of fwdOffsets) {
      const hits: number[] = [];
      const rets: number[] = [];

      for (let i = minTrain; i < eventNames.length - 1; i++) {
        const trainEvents = eventNames.slice(0, i);
        const testEvent = eventNames[i];
        const tv = trainEvents
          .map(e => ad[e]?.[fo])
          .filter((v): v is number => v !== undefined && !isNaN(v));
        if (tv.length < minTrain) continue;

        const predicted = median(tv) > 0 ? 1 : -1;
        const actual = ad[testEvent]?.[fo];
        if (actual === undefined || isNaN(actual)) continue;

        hits.push((actual > 0) === (predicted > 0) ? 1 : 0);
        rets.push(actual * predicted);
      }

      if (hits.length > 0) {
        const retMean = mean(rets);
        const retStd = std(rets);
        r[fo] = {
          hit: Math.round(mean(hits) * 1000) / 10,
          n: hits.length,
          sharpe: Math.round((retMean / Math.max(retStd, 0.001)) * 100) / 100,
        };
      }
    }

    if (Object.keys(r).length > 0) result[l] = r;
  }

  return result;
}

// ── Trade Memo ──────────────────────────────────────

export function memo(
  er: EventReturns,
  selectedEvents: string[],
  labels: string[],
  assetMeta: Record<string, { class: string }>,
  fwd: number = 21,
  target?: string,
): string {
  const ix = ideas(er, selectedEvents, labels, assetMeta, 0, fwd);
  const top = ix.filter(r => r.hitRate >= 55).slice(0, 5);

  let lines = [
    `## Trade Memo — ${target || 'Historical Analogues'}`,
    '',
    `**Active Events:** ${selectedEvents.length}`,
    `**Horizon:** ${fwd} trading days`,
    '',
    '### Top Signals',
    '',
  ];

  for (const r of top) {
    const stars = '★'.repeat(r.stars) + '☆'.repeat(5 - r.stars);
    lines.push(
      `- **${r.label}** → ${r.direction} | Med ${r.median > 0 ? '+' : ''}${r.median.toFixed(1)}% | Hit ${r.hitRate.toFixed(0)}% | Vol-Adj ${r.volAdj.toFixed(2)} | ${stars}`
    );
  }

  if (top.length === 0) lines.push('*No signals above threshold.*');

  return lines.join('\n');
}

// ── MAE (Max Adverse Excursion) ─────────────────────

export function mae(
  er: EventReturns,
  label: string,
  selectedEvents: string[],
  dn: number = 0,
  fwd: number = 21,
): MAEResult[] {
  const fo = dn + fwd;
  const results: MAEResult[] = [];

  for (const e of selectedEvents) {
    const s = er[label]?.[e];
    if (!s) continue;
    const entry = s[dn];
    if (entry === undefined) continue;

    let maxAdverse = 0;
    let maxDD = 0;
    let peak = entry;
    let recovered: number | null = null;

    for (let d = dn + 1; d <= fo; d++) {
      const v = s[d];
      if (v === undefined) continue;
      const ret = v - entry;

      // MAE: worst unrealized loss
      if (ret < maxAdverse) maxAdverse = ret;

      // Drawdown from peak
      if (v > peak) peak = v;
      const dd = v - peak;
      if (dd < maxDD) maxDD = dd;

      // Recovery: first day return goes positive after being negative
      if (recovered === null && ret >= 0 && maxAdverse < -0.1) {
        recovered = d - dn;
      }
    }

    results.push({
      label,
      event: e,
      mae: Math.round(maxAdverse * 100) / 100,
      maxDD: Math.round(maxDD * 100) / 100,
      recovery: recovered,
    });
  }

  return results;
}

// ── Regime Filter ───────────────────────────────────

export function regimeFilter(
  events: string[],
  macroContext: Record<string, MacroContext>,
  cpiFilter?: string[],
  fedFilter?: string[],
): string[] {
  return events.filter(e => {
    const m = macroContext[e];
    if (!m) return true;
    if (cpiFilter && cpiFilter.length > 0 && !cpiFilter.includes(m.cpi)) return false;
    if (fedFilter && fedFilter.length > 0 && !fedFilter.includes(m.fed)) return false;
    return true;
  });
}

// ── Weight Optimizer (grid search) ──────────────────

export function weightOptimizer(
  er: EventReturns,
  target: string,
  events: string[],
  eventTags: Record<string, string[]>,
  macroContext: Record<string, MacroContext>,
  simPool: string[],
  steps: number = 5,
): { weights: AnalogueWeights; score: number }[] {
  const results: { weights: AnalogueWeights; score: number }[] = [];
  const inc = 1.0 / steps;

  for (let q = 0; q <= steps; q++) {
    for (let t = 0; t <= steps - q; t++) {
      const m = steps - q - t;
      const w: AnalogueWeights = {
        quant: Math.round(q * inc * 100) / 100,
        tag: Math.round(t * inc * 100) / 100,
        macro: Math.round(m * inc * 100) / 100,
      };
      const scores = score(er, target, events, eventTags, macroContext, simPool, w);
      const topScore = scores.length > 0 ? scores[0].composite : 0;
      results.push({ weights: w, score: topScore });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
