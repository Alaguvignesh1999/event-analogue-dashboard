'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import { ArrowUpDown } from 'lucide-react';

export interface Column {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: Record<string, any>[];
  maxRows?: number;
  className?: string;
}

export function DataTable({ columns, data, maxRows, className }: DataTableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = sortKey
    ? [...data].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (typeof av === 'number' && typeof bv === 'number') {
          return sortDir === 'asc' ? av - bv : bv - av;
        }
        return sortDir === 'asc'
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      })
    : data;

  const displayed = maxRows ? sorted.slice(0, maxRows) : sorted;

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  return (
    <div className={clsx('overflow-x-auto', className)}>
      <table className="w-full text-xs">
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className={clsx(
                  'px-3 py-2.5 text-[10px] uppercase tracking-wider font-semibold text-t3',
                  'border-b-2 border-border whitespace-nowrap',
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                  col.sortable !== false && 'cursor-pointer hover:text-t2 select-none',
                )}
                onClick={() => col.sortable !== false && handleSort(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {col.sortable !== false && sortKey === col.key && (
                    <ArrowUpDown className="w-3 h-3 text-accent" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayed.map((row, i) => (
            <tr
              key={i}
              className={clsx(
                'border-b border-white/[0.03] hover:bg-hover/30 transition-colors',
                i % 2 === 1 && 'bg-white/[0.01]',
              )}
            >
              {columns.map(col => (
                <td
                  key={col.key}
                  className={clsx(
                    'px-3 py-2 text-t2',
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                  )}
                >
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {maxRows && data.length > maxRows && (
        <div className="text-xs text-t4 text-center py-2">
          Showing {maxRows} of {data.length}
        </div>
      )}
    </div>
  );
}

// ── Value renderers ─────────────────────────────────

export function ReturnValue({ value }: { value: number }) {
  if (isNaN(value)) return <span className="text-t4">—</span>;
  const color = value > 0.05 ? 'text-positive' : value < -0.05 ? 'text-negative' : 'text-t3';
  return <span className={clsx(color, 'font-medium')}>{value > 0 ? '+' : ''}{value.toFixed(1)}%</span>;
}

export function HitRateValue({ value }: { value: number }) {
  if (isNaN(value)) return <span className="text-t4">—</span>;
  const color = value >= 65 ? 'text-positive' : value >= 55 ? 'text-amber' : value >= 45 ? 'text-t3' : 'text-negative';
  return <span className={clsx(color, 'font-medium')}>{value.toFixed(0)}%</span>;
}

export function StarsValue({ value }: { value: number }) {
  return (
    <span className="tracking-wider">
      <span className="text-amber">{'★'.repeat(value)}</span>
      <span className="text-t4">{'☆'.repeat(5 - value)}</span>
    </span>
  );
}

export function ProgressBar({ value, max = 1 }: { value: number; max?: number }) {
  const pct = Math.min(Math.abs(value) / Math.max(max, 0.001) * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-3 bg-border rounded-sm overflow-hidden">
        <div
          className="h-full bg-accent/60 rounded-sm"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-t1 text-xs font-medium">{value.toFixed(2)}</span>
    </div>
  );
}
