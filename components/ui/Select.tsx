import { clsx } from 'clsx';

interface SelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}

export function Select({ label, value, onChange, options, className }: SelectProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-[10px] uppercase tracking-wider text-t3 font-semibold mb-1.5">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={clsx(
          'w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-t1',
          'focus:outline-none focus:border-accent/50 transition-colors',
          'appearance-none cursor-pointer',
        )}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%235a6578' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
          backgroundPosition: 'right 8px center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '16px',
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

interface HorizontalRadioProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  className?: string;
}

export function HorizontalRadio({ value, onChange, options, className }: HorizontalRadioProps) {
  return (
    <div className={clsx('inline-flex bg-surface border border-border rounded-lg p-0.5', className)}>
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={clsx(
            'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
            value === opt
              ? 'bg-accent/15 text-accent border border-accent/25'
              : 'text-t3 hover:text-t2',
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
