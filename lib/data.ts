import type { AppData, EventReturns, AssetMeta, AppConfig, ReturnSeries } from './types';

let _cache: AppData | null = null;

export async function loadData(): Promise<AppData> {
  if (_cache) return _cache;

  const [erRaw, metaRaw, orderRaw, configRaw] = await Promise.all([
    fetch('/data/event_returns.json').then(r => r.json()),
    fetch('/data/asset_meta.json').then(r => r.json()),
    fetch('/data/asset_order.json').then(r => r.json()),
    fetch('/data/config.json').then(r => r.json()),
  ]);

  // Parse event_returns: keys are string offsets, convert to number keys
  const eventReturns: EventReturns = {};
  for (const [asset, events] of Object.entries(erRaw as Record<string, Record<string, Record<string, number>>>)) {
    eventReturns[asset] = {};
    for (const [event, series] of Object.entries(events)) {
      const rs: ReturnSeries = {};
      for (const [offset, value] of Object.entries(series)) {
        rs[parseInt(offset)] = value;
      }
      eventReturns[asset][event] = rs;
    }
  }

  _cache = {
    eventReturns,
    assetMeta: metaRaw as Record<string, AssetMeta>,
    assetOrder: orderRaw as string[],
    config: configRaw as AppConfig,
  };

  return _cache;
}

/** Get list of asset labels that actually have data */
export function getLabels(data: AppData): string[] {
  return data.assetOrder.filter(l => l in data.eventReturns);
}

/** Get unique asset classes */
export function getClasses(data: AppData): string[] {
  const classes = new Set<string>();
  for (const m of Object.values(data.assetMeta)) {
    if (m.class) classes.add(m.class);
  }
  return [...classes].sort();
}

/** Get assets by class */
export function getAssetsByClass(data: AppData, cls: string): string[] {
  return Object.entries(data.assetMeta)
    .filter(([, m]) => m.class === cls)
    .map(([l]) => l)
    .sort();
}

/** Get assets by group name */
export function getAssetsByGroup(data: AppData, group: string): string[] {
  const groupAssets = data.config.groups[group] || [];
  return groupAssets.filter(a => a in data.eventReturns);
}

/** Get event names */
export function getEventNames(data: AppData): string[] {
  return data.config.events.map(e => e.name);
}
