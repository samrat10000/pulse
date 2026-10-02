import clsx from 'clsx';
import { Check } from 'lucide-react';

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className={clsx('cb', checked && 'on')}
      onClick={e => { e.stopPropagation(); onChange(!checked); }}
    >
      <Check size={11} strokeWidth={3} />
    </button>
  );
}
