// ── Core data types ──────────────────────────────────

/** Offset → return value mapping for one asset × one event */
export type ReturnSeries = Record<number, number>;

/** All events for one asset: eventName → ReturnSeries */
export type AssetEventMap = Record<string, ReturnSeries>;

/** Full event returns: assetLabel → AssetEventMap */
export type EventReturns = Record<string, AssetEventMap>;

export interface AssetMeta {
  ticker: string;
  class: string;
  source: 'yf' | 'fred';
  invert: boolean;
  is_fred_price: boolean;
  is_rates_bp: boolean;
  display_label: string;
}

export interface EventDef {
  name: string;
  date: string;
}

export interface POI {
  label: string;
  offset: number;
}

export interface MacroContext {
  trigger: number;
  cpi: 'high' | 'mid' | 'low';
  fed: 'hiking' | 'cutting' | 'hold';
}

export interface AnalogueWeights {
  quant: number;
  tag: number;
  macro: number;
}

export interface PortfolioScenario {
  [assetLabel: string]: number; // notional USD, positive = long
}

// ── Engine output types ─────────────────────────────

export interface ScoreResult {
  event: string;
  composite: number;
  quant: number;
  tag: number;
  macro: number;
  tags: string[];
}

export interface TradeIdea {
  label: string;
  class: string;
  direction: 'LONG' | 'SHORT';
  median: number;
  mean: number;
  std: number;
  iqr: number;
  hitRate: number;
  volAdj: number;
  score: number;
  stars: number;
  n: number;
  nTotal: number;
  fwdVals: number[];
}

export interface ScreenerResult extends TradeIdea {
  coverage: number;
  bimodal: boolean;
  pass: boolean;
}

export interface GateResult {
  label: string;
  gate: string;
  direction: 'LONG' | 'SHORT';
  median: number;
  tp: number;
  sl: number;
  rr: number;
  n: number;
}

export interface StressResult {
  eventPnl: Record<string, number>;
  median: number;
  worst: number;
  best: number;
  hitRate: number;
}

export interface DetailStat {
  poi: string;
  offset: number;
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
  hitPos: number;
  n: number;
  vals: number[];
}

export interface WFVResult {
  hit: number;
  n: number;
  sharpe: number;
}

export interface KellyResult {
  kf: number;
  notional: number;
  budget: number;
}

export interface BCIResult {
  lo: number;
  median: number;
  hi: number;
}

export interface SectorResult {
  label: string;
  median: number;
  hit: number;
  n: number;
  std: number;
}

export interface PreposResult {
  label: string;
  direction: 'BOUGHT' | 'SOLD';
  median: number;
  mean: number;
  std: number;
  hitRate: number;
  n: number;
}

export interface MAEResult {
  label: string;
  event: string;
  mae: number;
  maxDD: number;
  recovery: number | null;
}

// ── App config ──────────────────────────────────────

export interface AppConfig {
  events: EventDef[];
  allTags: string[];
  eventTags: Record<string, string[]>;
  macroContext: Record<string, MacroContext>;
  groups: Record<string, string[]>;
  pois: POI[];
  portfolioScenarios: Record<string, PortfolioScenario>;
  triggerAsset: string;
  analogueWeights: AnalogueWeights;
  sectorETFs: string[];
}

export interface AppData {
  eventReturns: EventReturns;
  assetMeta: Record<string, AssetMeta>;
  assetOrder: string[];
  config: AppConfig;
}

// ── Live event ──────────────────────────────────────

export interface LiveEvent {
  name: string;
  date: string;
  tags: string[];
  trigger: number;
  cpi: 'high' | 'mid' | 'low';
  fed: 'hiking' | 'cutting' | 'hold';
  returns: EventReturns | null;
  dayN: number | null;
  nAssets: number;
}

// ── UI state ────────────────────────────────────────

export interface WeightPreset {
  name: string;
  quant: number;
  tag: number;
  macro: number;
}
