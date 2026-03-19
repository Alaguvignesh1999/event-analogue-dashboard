import { clsx } from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'positive' | 'negative' | 'amber' | 'muted';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        variant === 'default' && 'bg-accent/10 text-accent border border-accent/20',
        variant === 'positive' && 'bg-positive/10 text-positive border border-positive/20',
        variant === 'negative' && 'bg-negative/10 text-negative border border-negative/20',
        variant === 'amber' && 'bg-amber/10 text-amber border border-amber/20',
        variant === 'muted' && 'bg-t4/20 text-t3 border border-border',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function DirectionBadge({ direction }: { direction: string }) {
  const isPos = direction === 'LONG' || direction === 'BOUGHT';
  return (
    <Badge variant={isPos ? 'positive' : 'negative'}>
      {direction}
    </Badge>
  );
}

export function GateBadge({ gate }: { gate: string }) {
  if (gate.includes('ENTER')) return <Badge variant="positive">{gate}</Badge>;
  if (gate.includes('HALF')) return <Badge variant="amber">{gate}</Badge>;
  if (gate.includes('LATE')) return <Badge variant="amber">{gate}</Badge>;
  return <Badge variant="negative">{gate}</Badge>;
}
