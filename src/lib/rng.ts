export type Rand = () => number;

/** mulberry32: same seed, same sequence, on every reload */
export function rng(seed: number): Rand {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = <T,>(a: readonly T[], r: Rand): T => a[Math.floor(r() * a.length)];
export const between = (a: number, b: number, r: Rand) => Math.floor(a + r() * (b - a + 1));
