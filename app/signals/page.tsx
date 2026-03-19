'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/components/layout/AppShell';
import { Accordion } from '@/components/ui/Accordion';
import { HorizontalRadio, Select } from '@/components/ui/Select';
import { MetricCard } from '@/components/ui/MetricCard';
import { DataTable, ReturnValue, HitRateValue, StarsValue, ProgressBar } from '@/components/tables/DataTable';
import { DirectionBadge, GateBadge } from '@/components/ui/Badge';
import { BarChart, MatrixChart } from '@/components/charts/Charts';
import * as engine from '@/lib/engine';

const FORWARD_POIS = ['t+1W', 't+1M', 't+3M'];

export default function TradeSignalsPage() {
  const { data, selectedEvents, filteredLabels } = useApp();
  const [horizon, setHorizon] = useState('t+1M');
  const [minHitRate, setMinHitRate] = useState(55);

  const horizonOffset = useMemo(() => {
    const poi = data.config.pois.find(p => p.label === horizon);
    return poi?.offset ?? 21;
  }, [horizon, data.config.pois]);

  // Signal Table
  const allIdeas = useMemo(() =>
    engine.ideas(data.eventReturns, selectedEvents, filteredLabels, data.assetMeta as any, 0, horizonOffset),
    [data, selectedEvents, filteredLabels, horizonOffset],
  );
  const filteredIdeas = allIdeas.filter(r => r.hitRate >= minHitRate);

  // Screener
  const screenerResult = useMemo(() =>
    engine.screener(data.eventReturns, selectedEvents, filteredLabels, data.assetMeta as any, 0, horizonOffset),
    [data, selectedEvents, filteredLabels, horizonOffset],
  );

  // Entry Gate
  const gateData = useMemo(() =>
    engine.gate(data.eventReturns, selectedEvents, filteredLabels, 0, horizonOffset),
    [data.eventReturns, selectedEvents, filteredLabels, horizonOffset],
  );

  // Lead-Lag
  const leadlagData = useMemo(() =>
    engine.leadlag(data.eventReturns, selectedEvents, filteredLabels.slice(0, 15)),
    [data.eventReturns, selectedEvents, filteredLabels],
  );

  // CI + Kelly
  const ciData = useMemo(() => {
    return allIdeas.filter(r => r.hitRate >= 55).slice(0, 10).map(r => {
      const ci = engine.bci(r.fwdVals);
      const k = engine.kelly(r.hitRate, r.median, r.std);
      return { ...r, ciLo: ci.lo, ciMed: ci.median, ciHi: ci.hi, kelly: k.kf, notional: k.notional };
    });
  }, [allIdeas]);

  // WFV
  const wfvData = useMemo(() =>
    engine.wfv(data.eventReturns, filteredLabels.slice(0, 20), data.config.events),
    [data.eventReturns, filteredLabels, data.config.events],
  );

  // Memo
  const memoText = useMemo(() =>
    engine.memo(data.eventReturns, selectedEvents, filteredLabels, data.assetMeta as any, horizonOffset),
    [data, selectedEvents, filteredLabels, horizonOffset],
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-t1">Trade Signals</h1>
        <HorizontalRadio value={horizon} onChange={setHorizon} options={FORWARD_POIS} />
      </div>

      {/* Signal Table */}
      <Accordion title="Signal Table" subtitle={`${filteredIdeas.length} signals above ${minHitRate}% hit rate`} defaultOpen>
        <div className="mb-3">
          <label className="text-[10px] uppercase tracking-wider text-t3 font-semibold">Min Hit Rate: {minHitRate}%</label>
          <input type="range" min={40} max={80} value={minHitRate} onChange={e => setMinHitRate(+e.target.value)}
            className="w-48 ml-3 accent-accent" />
        </div>
        <DataTable
          columns={[
            { key: 'label', label: 'Asset', render: v => <span className="text-accent font-medium">{v}</span> },
            { key: 'direction', label: 'Direction', render: v => <DirectionBadge direction={v} /> },
            { key: 'median', label: 'Median', align: 'right', render: v => <ReturnValue value={v} /> },
            { key: 'hitRate', label: 'Hit Rate', align: 'right', render: v => <HitRateValue value={v} /> },
            { key: 'volAdj', label: 'Vol-Adj', align: 'right', render: v => <span className={v > 0.5 ? 'text-positive' : 'text-t3'}>{v.toFixed(2)}</span> },
            { key: 'iqr', label: 'IQR', align: 'right' },
            { key: 'stars', label: 'Quality', align: 'center', render: v => <StarsValue value={v} /> },
            { key: 'n', label: 'Coverage', align: 'right', render: (v: any, row: any) => <span className="text-t3">{row.n}/{row.nTotal}</span> },
          ]}
          data={filteredIdeas}
          maxRows={60}
        />

        {/* Screener sub-section */}
        <Accordion title={`Screener (${screenerResult.pass.length} pass / ${screenerResult.fail.length} fail)`}>
          <DataTable
            columns={[
              { key: 'label', label: 'Asset', render: v => <span className="text-accent">{v}</span> },
              { key: 'direction', label: 'Dir', render: v => <DirectionBadge direction={v} /> },
              { key: 'median', label: 'Median', align: 'right', render: v => <ReturnValue value={v} /> },
              { key: 'hitRate', label: 'Hit Rate', align: 'right', render: v => <HitRateValue value={v} /> },
              { key: 'stars', label: 'Quality', align: 'center', render: v => <StarsValue value={v} /> },
              { key: 'bimodal', label: 'Bimodal', align: 'center', render: v => v ? '⚠️' : '' },
            ]}
            data={screenerResult.pass}
          />
        </Accordion>
      </Accordion>

      {/* Entry Gate */}
      <Accordion title="Entry / Exit Gate">
        <DataTable
          columns={[
            { key: 'gate', label: 'Gate', render: v => <GateBadge gate={v} /> },
            { key: 'label', label: 'Asset', render: v => <span className="text-accent">{v}</span> },
            { key: 'direction', label: 'Dir', render: v => <DirectionBadge direction={v} /> },
            { key: 'median', label: 'Median', align: 'right', render: v => <ReturnValue value={v} /> },
            { key: 'tp', label: 'TP', align: 'right', render: v => <span className="text-positive">{v > 0 ? '+' : ''}{v.toFixed(1)}%</span> },
            { key: 'sl', label: 'SL', align: 'right', render: v => <span className="text-negative">{v.toFixed(1)}%</span> },
            { key: 'rr', label: 'R:R', align: 'right' },
            { key: 'n', label: 'n', align: 'right' },
          ]}
          data={gateData}
          maxRows={50}
        />
      </Accordion>

      {/* Lead-Lag */}
      <Accordion title="Lead-Lag Matrix">
        <MatrixChart
          labels={leadlagData.labels}
          matrix={leadlagData.matrix}
          title="Lead-Lag (days asset i peaks before j)"
        />
      </Accordion>

      {/* Stress Test */}
      <Accordion title="Stress Test">
        {Object.entries(data.config.portfolioScenarios).map(([name, portfolio]) => {
          const res = engine.stress(data.eventReturns, portfolio, selectedEvents, 0, horizonOffset);
          return (
            <div key={name} className="mb-6">
              <div className="text-sm font-semibold text-t1 mb-2">{name}</div>
              <div className="text-xs text-t3 mb-3">
                {Object.entries(portfolio).map(([l, n]) => `${l} $${(n / 1e6).toFixed(1)}M`).join(' · ')}
              </div>
              <div className="grid grid-cols-4 gap-3 mb-3">
                <MetricCard label="Median PnL" value={isNaN(res.median) ? '—' : `$${res.median.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
                <MetricCard label="Best Case" value={isNaN(res.best) ? '—' : `$${res.best.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
                <MetricCard label="Worst Case" value={isNaN(res.worst) ? '—' : `$${res.worst.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
                <MetricCard label="Win Rate" value={isNaN(res.hitRate) ? '—' : `${res.hitRate.toFixed(0)}%`} />
              </div>
              {Object.keys(res.eventPnl).length > 0 && (
                <BarChart
                  labels={Object.keys(res.eventPnl)}
                  values={Object.values(res.eventPnl)}
                  title="PnL by Analogue"
                  yTitle="$ PnL"
                  height={280}
                />
              )}
            </div>
          );
        })}
      </Accordion>

      {/* CI + Kelly */}
      <Accordion title="Confidence Intervals + Kelly Sizing">
        <DataTable
          columns={[
            { key: 'label', label: 'Asset', render: v => <span className="text-accent">{v}</span> },
            { key: 'direction', label: 'Dir', render: v => <DirectionBadge direction={v} /> },
            { key: 'ciLo', label: 'CI Low', align: 'right', render: v => <ReturnValue value={v} /> },
            { key: 'ciMed', label: 'Median', align: 'right', render: v => <ReturnValue value={v} /> },
            { key: 'ciHi', label: 'CI High', align: 'right', render: v => <ReturnValue value={v} /> },
            { key: 'kelly', label: 'Kelly ƒ', align: 'right', render: v => v.toFixed(3) },
            { key: 'notional', label: 'Notional', align: 'right', render: v => `$${v.toLocaleString()}` },
          ]}
          data={ciData}
        />
      </Accordion>

      {/* Trade Memo */}
      <Accordion title="Trade Memo">
        <div className="prose prose-invert prose-sm max-w-none">
          <pre className="bg-surface border border-border rounded-lg p-4 text-xs text-t2 whitespace-pre-wrap font-mono">
            {memoText}
          </pre>
        </div>
      </Accordion>

      {/* Walk-Forward Validation */}
      <Accordion title="Walk-Forward Validation">
        <DataTable
          columns={[
            { key: 'asset', label: 'Asset', render: v => <span className="text-accent">{v}</span> },
            { key: 'hit5', label: '+1W Hit', align: 'right', render: v => <HitRateValue value={v} /> },
            { key: 'sh5', label: '+1W Sharpe', align: 'right' },
            { key: 'hit21', label: '+1M Hit', align: 'right', render: v => <HitRateValue value={v} /> },
            { key: 'sh21', label: '+1M Sharpe', align: 'right' },
            { key: 'hit63', label: '+3M Hit', align: 'right', render: v => <HitRateValue value={v} /> },
            { key: 'sh63', label: '+3M Sharpe', align: 'right' },
          ]}
          data={Object.entries(wfvData).map(([asset, r]) => ({
            asset,
            hit5: r[5]?.hit ?? NaN, sh5: r[5]?.sharpe?.toFixed(2) ?? '—',
            hit21: r[21]?.hit ?? NaN, sh21: r[21]?.sharpe?.toFixed(2) ?? '—',
            hit63: r[63]?.hit ?? NaN, sh63: r[63]?.sharpe?.toFixed(2) ?? '—',
          }))}
        />
      </Accordion>
    </div>
  );
}
