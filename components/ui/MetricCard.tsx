import { clsx } from 'clsx';

interface MetricCardProps {
  label: string;
  value: string;
  sublabel?: string;
  className?: string;
}

export function MetricCard({ label, value, sublabel, className }: MetricCardProps) {
  return (
    <div className={clsx('bg-card border border-border rounded-xl px-4 py-3.5', className)}>
      <div className="text-[10px] uppercase tracking-wider text-t3 font-semibold">{label}</div>
      <div className="text-xl font-bold text-t1 mt-0.5">{value}</div>
      {sublabel && <div className="text-xs text-t3 mt-0.5">{sublabel}</div>}
    </div>
  );
}
