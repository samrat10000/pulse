import { useEffect, useRef, useState } from 'react';
import { reduced } from './env';

/** KPI count-up: 900ms ease-out cubic from the previous value (0 on mount). Reduced motion shows the final value. */
export function useCountUp(to: number, ms = 900) {
  const [v, setV] = useState(reduced ? to : 0);
  const from = useRef(reduced ? to : 0);
  useEffect(() => {
    if (reduced) { setV(to); return; }
    const start = from.current, t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3), cur = start + (to - start) * e;
      from.current = cur; setV(cur);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return v;
}
