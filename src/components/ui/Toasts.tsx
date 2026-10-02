import clsx from 'clsx';
import { Check } from 'lucide-react';
import { useStore } from '@/store/useStore';

export function Toasts() {
  const toasts = useStore(s => s.toasts);
  return (
    <div id="toasts" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={clsx('toast', t.out && 'out')}>
          <span className="ti"><Check size={12} strokeWidth={3} /></span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
