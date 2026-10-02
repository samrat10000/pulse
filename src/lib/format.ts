import { dayDate } from './dates';

const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat('en-IN');

/** ₹1,19,999 in full, or ₹1.2Cr / ₹7.3L / ₹66K when compact (Intl compact prints "T" for thousands). */
export function money(n: number, compact = false) {
  n = n || 0;
  if (compact) {
    const a = Math.abs(n);
    const f = (v: number, u: string) => '₹' + (+v.toFixed(v < 10 ? 1 : 0)).toLocaleString('en-IN') + u;
    if (a >= 1e7) return f(n / 1e7, 'Cr');
    if (a >= 1e5) return f(n / 1e5, 'L');
    if (a >= 1e3) return f(n / 1e3, 'K');
  }
  return INR.format(n);
}

export const num = (n: number) => NUM.format(n);

/** 2 Oct, or 2 Oct 2026 with the year */
export const fmtDate = (off: number, withYear = false) =>
  dayDate(off).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) });

export const ago = (d: number) =>
  d <= 0 ? 'Today'
  : d === 1 ? 'Yesterday'
  : d < 30 ? `${d}d ago`
  : d < 365 ? `${Math.round(d / 30)}mo ago`
  : `${(d / 365).toFixed(1).replace('.0', '')}y ago`;

export function agoMs(ms: number) {
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'Yesterday' : `${d} days ago`;
}

export type DueClass = 'over' | 'today' | 'later';
/** Follow-up chip: <0 "Overdue Nd" · 0 "Today" · 1 "Tomorrow" · else "In Nd" */
export const dueLabel = (d: number): { c: DueClass; t: string } =>
  d < 0 ? { c: 'over', t: `Overdue ${-d}d` }
  : d === 0 ? { c: 'today', t: 'Today' }
  : d === 1 ? { c: 'later', t: 'Tomorrow' }
  : { c: 'later', t: `In ${d}d` };

/** last 10 digits, used to match phones across leads, clients and imports */
export const phoneKey = (p: string | null | undefined) => String(p || '').replace(/\D/g, '').slice(-10);

export const hash = (s: string) => {
  let h = 0;
  for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
};

export const initials = (n: string) =>
  String(n).split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

export const titleCase = (s: string) => s.replace(/[._-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();

export const greet = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export const firstName = (n: string) => n.split(' ')[0];
