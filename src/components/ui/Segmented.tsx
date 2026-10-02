import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export interface SegOption<T> { value: T; label: ReactNode; icon?: LucideIcon }

export function Segmented<T extends string | number>({ options, value, onChange, size, className, label }: {
  options: SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
  size?: 'sm';
  className?: string;
  label?: string;
}) {
  return (
    <div className={clsx('seg', size && 'seg-sm', className)} role="group" aria-label={label}>
      {options.map(o => (
        <button key={String(o.value)} type="button" className={clsx(o.value === value && 'on')} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.icon && <o.icon size={size ? 13 : 15} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}
