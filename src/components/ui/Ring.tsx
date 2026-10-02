import { useEffect, useState } from 'react';
import { reduced } from '@/lib/env';

export interface RingDatum { v: number; c: string }

/**
 * Concentric activity rings. Arcs start empty and draw to their value (1.4s, `.ring-arc` transition);
 * value changes animate the same way. Reduced motion draws them instantly.
 */
export function Ring({ rings, size = 140, w = 12, track = 0.16, className }: { rings: RingDatum[]; size?: number; w?: number; track?: number; className?: string }) {
  const [drawn, setDrawn] = useState(reduced);
  useEffect(() => {
    if (drawn) return;
    let b = 0;
    const a = requestAnimationFrame(() => { b = requestAnimationFrame(() => setDrawn(true)); });
    return () => { cancelAnimationFrame(a); cancelAnimationFrame(b); };
  }, [drawn]);

  const gap = w + 4, mid = size / 2;
  return (
    <svg className={className} width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      {rings.map((r, i) => {
        const rad = mid - w / 2 - i * gap, c = 2 * Math.PI * rad, v = Math.min(1, Math.max(0, r.v || 0));
        return (
          <g key={i}>
            <circle cx={mid} cy={mid} r={rad} fill="none" stroke={r.c} strokeOpacity={track} strokeWidth={w} />
            <circle
              className="ring-arc"
              cx={mid} cy={mid} r={rad} fill="none" stroke={r.c} strokeWidth={w} strokeLinecap="round"
              strokeDasharray={c.toFixed(1)}
              strokeDashoffset={(drawn ? c * (1 - v) : c).toFixed(1)}
              transform={`rotate(-90 ${mid} ${mid})`}
            />
          </g>
        );
      })}
    </svg>
  );
}
