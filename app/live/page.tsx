'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/components/layout/AppShell';
import { Accordion } from '@/components/ui/Accordion';
import { HorizontalRadio, Select } from '@/components/ui/Select';
import { DataTable, ReturnValue, HitRateValue, ProgressBar } from '@/components/tables/DataTable';
import { DirectionBadge } from '@/components/ui/Badge';
import { OverlayChart } from '@/components/charts/OverlayChart';
import { HeatmapChart } from '@/components/charts/HeatmapChart';
import { BoxChart } from '@/components/charts/Charts';
import { ScatterChart, MatrixChart } from '@/components/charts/Charts';
import * as engine from '@/lib/engine';

const FORWARD_POIS = ['t+1W', 't+1M', 't+3M'];
const WEIGHT_PRESETS: Record<string, { quant: number; tag: number; macro: number }> = {
  'Default (50/30/20)': { quant: 0.5, tag: 0.3, macro: 0.2 },
  'Quant-heavy': { quant: 0.7, tag: 0.2, macro: 0.1 },
  'Macro-heavy': { quant: 0.3, tag: 0.2, macro: 0.5 },
  'Tag-heavy': { quant: 0.2, tag: 0.6, macro: 0.2 },
  'Equal': { quant: 0.334, tag: 0.333, macro: 0.333 },
};

export default function LiveEventPage() {
  const { data, selectedEvents, filteredLabels } = useApp();
  const [horizon, setHorizon] = useState('t+1M');
  const [weightPreset, setWeightPreset] = useState('Default (50/30/20)');
  const [targetEvent, setTargetEvent] = useState(data.config.events[data.config.events.length - 1]?.name || '');
  const [deepDiveAsset, setDeepDiveAsset] = useState(filteredLabels[0] || '');
  const [scatterY, setScatterY] = useState(filteredLabels[1] || '');

  const horizonOffset = useMemo(() => {
    const poi = data.config.pois.find(p => p.label === horizon);
    return poi?.offset ?? 21;
  }, [horizon, data.config.pois]);

  const weights = WEIGHT_PRESETS[weightPreset] || WEIGHT_PRESETS['Default (50/30/20)'];

  // ── Cross-Asset Snapshot ──────────────────────────
  const snapshot = useMemo(() => {
    const rows: any[] = [];
    for (const l of filteredLabels) {
      const ad = data.eventReturns[l];
      if (!ad) continue;
      const fv: number[] = [];
      for (const e of selectedEvents) {
        const s = ad[e];
        if (s && s[horizonOffset] !== undefined && s[0] !== undefined) fv.push(s[horizonOffset] - s[0]);
      }
      if (fv.length < 2) continue;
      const sorted = [...fv].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const med = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      const hr = (med > 0 ? fv.filter(v => v > 0).length : fv.filter(v => v < 0).length) / fv.length * 100;
      rows.push({
        asset: l, class: data.assetMeta[l]?.class || '', direction: med > 0 ? 'LONG' : 'SHORT',
        median: Math.round(med * 100) / 100, hitRate: Math.round(hr * 10) / 10,
        std: Math.round(Math.sqrt(fv.reduce((s, v) => s + (v - med) ** 2, 0) / fv.length) * 100) / 100,
        coverage: `${fv.length}/${selectedEvents.length}`,
      });
    }
    return rows.sort((a, b) => Math.abs(b.median) - Math.abs(a.median));
  }, [filteredLabels, selectedEvents, horizonOffset, data.eventReturns, data.assetMeta]);

  // ── Analogue Scoring ──────────────────────────────
  const scores = useMemo(() => {
    const simPool = [data.config.triggerAsset, 'VIX', 'Gold', 'DXY', 'S&P 500', 'US 10Y Yield']
      .filter(a => a in data.eventReturns);
    return engine.score(
      data.eventReturns, targetEvent,
      data.config.events.map(e => e.name),
      data.config.eventTags, data.config.macroContext as any,
      simPool, weights,
    );
  }, [data, targetEvent, weights]);

  // ── Sector Rotation ───────────────────────────────
  const sectors = useMemo(() =>
    engine.sectorRotation(data.eventReturns, selectedEvents, data.config.sectorETFs, horizonOffset),
    [data.eventReturns, selectedEvents, data.config.sectorETFs, horizonOffset],
  );

  // ── Signal Decay ──────────────────────────────────
  const decay = useMemo(() =>
    engine.signalDecay(data.eventReturns, filteredLabels, selectedEvents, data.assetMeta as any, 40),
    [data.eventReturns, filteredLabels, selectedEvents, data.assetMeta],
  );

  // ── Pre-Positioning ───────────────────────────────
  const preposData = useMemo(() =>
    engine.prepos(data.eventReturns, selectedEvents, filteredLabels),
    [data.eventReturns, selectedEvents, filteredLabels],
  );

  // ── Reverse Analogue ──────────────────────────────
  const reverseData = useMemo(() =>
    engine.reverseAnalogue(data.eventReturns, selectedEvents, filteredLabels.slice(0, 20)),
    [data.eventReturns, selectedEvents, filteredLabels],
  );

  const eventOptions = data.config.events.map(e => ({ value: e.name, label: e.name }));
  const assetOptions = filteredLabels.map(l => ({ value: l, label: l }));

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-t1">Live Event</h1>
        <HorizontalRadio value={horizon} onChange={setHorizon} options={FORWARD_POIS} />
      </div>

      {/* Configure */}
      <Accordion title="Configure" subtitle="Event parameters and scoring weights" defaultOpen>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Select label="Target Event" value={targetEvent} onChange={setTargetEvent} options={eventOptions} />
          <Select
            label="Weight Preset"
            value={weightPreset}
            onChange={setWeightPreset}
            options={Object.keys(WEIGHT_PRESETS).map(k => ({ value: k, label: k }))}
          />
        </div>
        <div className="text-xs text-t3">
          Weights: Q={weights.quant.toFixed(0)}% · T={weights.tag.toFixed(0)}% · M={weights.macro.toFixed(0)}%
        </div>
      </Accordion>

      {/* Cross-Asset Snapshot */}
      <Accordion title="Cross-Asset Snapshot" subtitle={`${snapshot.length} assets at ${horizon}`} defaultOpen>
        <DataTable
          columns={[
            { key: 'asset', label: 'Asset', render: v => <span className="text-accent font-medium">{v}</span> },
            { key: 'class', label: 'Class', render: v => <span className="text-t3">{v}</span> },
            { key: 'direction', label: 'Direction', render: v => <DirectionBadge direction={v} /> },
            { key: 'median', label: 'Median', align: 'right', render: v => <ReturnValue value={v} /> },
            { key: 'hitRate', label: 'Hit Rate', align: 'right', render: v => <HitRateValue value={v} /> },
            { key: 'std', label: 'Std', align: 'right' },
            { key: 'coverage', label: 'Coverage', align: 'right', render: v => <span className="text-t3">{v}</span> },
          ]}
          data={snapshot}
          maxRows={60}
        />
      </Accordion>

      {/* Analogue Scoring */}
      <Accordion title="Analogue Scoring" subtitle={`Target: ${targetEvent}`} defaultOpen>
        <DataTable
          columns={[
            { key: 'event', label: 'Event', render: v => <span className="text-accent font-medium">{v}</span> },
            { key: 'composite', label: 'Composite', render: v => <ProgressBar value={v} /> },
            { key: 'quant', label: 'Quant', align: 'right' },
            { key: 'tag', label: 'Tag', align: 'right' },
            { key: 'macro', label: 'Macro', align: 'right' },
            { key: 'tags', label: 'Tags', render: (v: string[]) => <span className="text-t3 text-[11px]">{v.join(', ')}</span> },
          ]}
          data={scores}
        />

        {/* Reverse Analogue sub-section */}
        <Accordion title="Event Similarity Ranking">
          <DataTable
            columns={[
              { key: 'event', label: 'Event', render: v => <span className="text-accent">{v}</span> },
              { key: 'score', label: 'Avg Similarity', render: v => <ProgressBar value={v} /> },
            ]}
            data={Object.entries(reverseData).map(([event, score]) => ({ event, score }))}
          />
        </Accordion>
      </Accordion>

      {/* Asset Deep-Dive */}
      <Accordion title="Asset Deep-Dive" subtitle="Select an asset to explore" defaultOpen>
        <Select label="Asset" value={deepDiveAsset} onChange={setDeepDiveAsset} options={assetOptions} className="mb-4 max-w-sm" />

        {deepDiveAsset && (
          <>
            <OverlayChart
              asset={deepDiveAsset}
              eventReturns={data.eventReturns}
              selectedEvents={selectedEvents}
              pois={data.config.pois}
              title={deepDiveAsset}
            />

            <Accordion title="Scatter Plot">
              <Select label="Compare with" value={scatterY} onChange={setScatterY}
                options={filteredLabels.filter(a => a !== deepDiveAsset).map(a => ({ value: a, label: a }))}
                className="mb-3 max-w-sm" />
              {scatterY && (
                <ScatterChart
                  assetX={deepDiveAsset} assetY={scatterY}
                  eventReturns={data.eventReturns} selectedEvents={selectedEvents}
                  offset={horizonOffset} horizonLabel={horizon}
                />
              )}
            </Accordion>

            <Accordion title="Return Heatmap">
              <HeatmapChart
                asset={deepDiveAsset} eventReturns={data.eventReturns}
                selectedEvents={selectedEvents} pois={data.config.pois}
              />
            </Accordion>

            <Accordion title="Return Distributions">
              <BoxChart
                asset={deepDiveAsset} eventReturns={data.eventReturns}
                selectedEvents={selectedEvents} pois={data.config.pois}
              />
            </Accordion>

            <Accordion title="Correlation Matrix">
              {(() => {
                const cl = filteredLabels.slice(0, 20);
                const corr = engine.correlation(data.eventReturns, selectedEvents, cl, horizonOffset);
                return <MatrixChart labels={corr.labels} matrix={corr.matrix} title={`Correlation at ${horizon}`} textFormat=".2f" />;
              })()}
            </Accordion>
          </>
        )}
      </Accordion>

      {/* Sector Rotation */}
      <Accordion title="Sector Rotation" subtitle={`${sectors.length} sectors at ${horizon}`}>
        <DataTable
          columns={[
            { key: 'label', label: 'Sector', render: v => <span className="text-accent">{v}</span> },
            { key: 'median', label: 'Median', align: 'right', render: v => <ReturnValue value={v} /> },
            { key: 'hit', label: 'Hit Rate', align: 'right', render: v => <HitRateValue value={v} /> },
            { key: 'std', label: 'Std', align: 'right' },
            { key: 'n', label: 'n', align: 'right' },
          ]}
          data={sectors}
        />
      </Accordion>

      {/* Signal Decay */}
      <Accordion title="Signal Decay">
        <DataTable
          columns={[
            { key: 'day', label: 'Entry Day', render: v => <span className="text-accent">Day +{v}</span> },
            { key: 's1', label: 'Top Signal', render: v => <span className="font-medium text-t1">{v || '—'}</span> },
            { key: 's2', label: '#2', render: v => <span className="text-t2">{v || '—'}</span> },
            { key: 's3', label: '#3', render: v => <span className="text-t3">{v || '—'}</span> },
          ]}
          data={Object.entries(decay).map(([dn, top]) => ({
            day: parseInt(dn), s1: top[0], s2: top[1], s3: top[2],
          }))}
        />
      </Accordion>

      {/* Pre-Positioning */}
      <Accordion title="Pre-Positioning Playbook">
        <DataTable
          columns={[
            { key: 'label', label: 'Asset', render: v => <span className="text-accent">{v}</span> },
            { key: 'direction', label: 'Direction', render: v => <DirectionBadge direction={v} /> },
            { key: 'median', label: 'Median', align: 'right', render: v => <ReturnValue value={v} /> },
            { key: 'hitRate', label: 'Hit Rate', align: 'right', render: v => <HitRateValue value={v} /> },
            { key: 'std', label: 'Std', align: 'right' },
            { key: 'n', label: 'n', align: 'right' },
          ]}
          data={preposData}
          maxRows={30}
        />
      </Accordion>
    </div>
  );
}
