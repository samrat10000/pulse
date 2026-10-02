import clsx from 'clsx';
import type { CSSProperties } from 'react';

export type Option = string | { value: string; label: string };

/** native select in the prototype's `.select` skin (chevron drawn in CSS) */
export function Select({ value, onChange, options, label, className, style, id }: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  label?: string;
  className?: string;
  style?: CSSProperties;
  id?: string;
}) {
  return (
    <select id={id} className={clsx('select', className)} style={style} value={value} aria-label={label} onChange={e => onChange(e.target.value)}>
      {options.map(o => {
        const v = typeof o === 'string' ? o : o.value;
        return <option key={v} value={v}>{typeof o === 'string' ? o : o.label}</option>;
      })}
    </select>
  );
}
