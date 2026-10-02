import clsx from 'clsx';

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className={clsx('tgl', on && 'on')} onClick={() => onChange(!on)} />;
}
