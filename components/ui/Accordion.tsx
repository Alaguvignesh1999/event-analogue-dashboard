'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

interface AccordionProps {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function Accordion({ title, subtitle, defaultOpen = false, children }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-border rounded-xl overflow-hidden mb-3 bg-card/50">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-hover/50 transition-colors text-left"
      >
        <ChevronRight
          className={clsx('w-4 h-4 text-t3 transition-transform duration-200', open && 'rotate-90')}
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-t1">{title}</div>
          {subtitle && <div className="text-xs text-t3 mt-0.5">{subtitle}</div>}
        </div>
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-border/50">
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  );
}
