import { useMemo } from 'react';
import { rng } from '@/lib/rng';

/** soft blurred clouds for the static sky, ported from the prototype's clouds() */
export function clouds(seed: number) {
  const r = rng(seed); let s = '';
  ([[130, 90, 1.1], [990, 70, 1.3], [620, 150, .7], [1130, 240, .8], [240, 260, .6]] as const).forEach(([x, y, k]) => {
    for (let i = 0; i < 7; i++) s += `<ellipse cx="${(x + (r() - .5) * 170 * k).toFixed(0)}" cy="${(y + (r() - .5) * 30 * k).toFixed(0)}" rx="${((40 + r() * 52) * k).toFixed(0)}" ry="${((16 + r() * 20) * k).toFixed(0)}"/>`;
  });
  return `<svg class="clouds" viewBox="0 0 1200 520" preserveAspectRatio="xMidYMin slice" aria-hidden="true"><defs><filter id="cb${seed}" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="14"/></filter></defs><g fill="#fff" opacity=".72" filter="url(#cb${seed})">${s}</g></svg>`;
}

export function Clouds({ seed }: { seed: number }) {
  const html = useMemo(() => clouds(seed), [seed]);
  return <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: html }} />;
}
