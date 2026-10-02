/** Browser facts read once at startup. Every risky API goes through a try/catch here. */
export const reduced = (() => {
  try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
})();

export const MOD = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? '⌘' : 'Ctrl';

export const store = {
  get(area: 'local' | 'session', k: string): string | null {
    try { return (area === 'local' ? localStorage : sessionStorage).getItem(k); } catch { return null; }
  },
  set(area: 'local' | 'session', k: string, v: string | null) {
    try {
      const s = area === 'local' ? localStorage : sessionStorage;
      if (v == null) s.removeItem(k); else s.setItem(k, v);
    } catch { /* storage blocked (sandbox / private mode) */ }
  },
};
