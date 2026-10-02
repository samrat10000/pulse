import clsx from 'clsx';
import type { ReactNode } from 'react';

export type Tone = 'blue' | 'violet' | 'green' | 'red' | 'amber';

/** Status pill. Pass `tone` for the token colours, or `color` for a stage colour (tinted 14%). Always carries text. */
export function Pill({ tone, color, dot = true, className, children }: { tone?: Tone; color?: string; dot?: boolean; className?: string; children: ReactNode }) {
  return (
    <span className={clsx('pill', color ? 'pill-stage' : `pill-${tone ?? 'blue'}`, className)} style={color ? ({ '--c': color } as React.CSSProperties) : undefined}>
      {dot && <i />}
      {children}
    </span>
  );
}
