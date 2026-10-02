import clsx from 'clsx';
import { hash, initials } from '@/lib/format';

const AV = ['#F8D3EA', '#E2DAFC', '#FFE7A0', '#D3E5FF', '#D3F1E1', '#FFD8C4'];

export function Avatar({ name, size, className }: { name: string; size?: 'xs' | 'sm' | 'lg'; className?: string }) {
  return (
    <span className={clsx('av', size, className)} style={{ background: AV[hash(name) % AV.length] }} title={name}>
      {initials(name)}
    </span>
  );
}
