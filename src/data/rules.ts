/* Derived rules (spec §7): one definition each, used everywhere. All pure functions of the DB. */
import { dayDate, TODAY0 } from '@/lib/dates';
import { fmtDate, hash } from '@/lib/format';
import { rng } from '@/lib/rng';
import { accounts } from './persist';
import { PT_PRICE, STAGES } from './seed';
import type { Account, Client, DB, Lead, SegmentKey } from './types';

export type ClientStatus = 'Active' | 'Expiring soon' | 'Expired' | 'Frozen';
export const clientStatus = (c: Client): ClientStatus => c.frozen ? 'Frozen' : c.end < 0 ? 'Expired' : c.end <= 14 ? 'Expiring soon' : 'Active';
export const STATUS_TONE = { Active: 'green', 'Expiring soon': 'amber', Expired: 'red', Frozen: 'blue' } as const;
export const isActive = (c: Client) => { const s = clientStatus(c); return s === 'Active' || s === 'Expiring soon'; };

export type Temp = 'hot' | 'warm' | 'cold';
export const temp = (s: number): Temp => s >= 70 ? 'hot' : s >= 40 ? 'warm' : 'cold';
export const stageC = (k: string) => (STAGES.find(s => s.k === k) || { c: '#8A94A6' }).c;

export const planOf = (db: DB, k: string) => db.plans.find(p => p.k === k) || db.plans[0];
export const repName = (db: DB, id: string) => (db.team.find(t => t.id === id) || (id === 'u0' ? accounts().owner : { name: 'Unassigned' })).name;
export const findLead = (db: DB, id: string) => db.leads.find(x => x.id === id);
export const findClient = (db: DB, id: string) => db.clients.find(x => x.id === id);

/** sales only sees their own leads in counts and lists */
export const mine = (me: Account | null) => (l: Lead) => !me || me.key !== 'sales' || l.owner === me.id;
export const isDue = (l: Lead) => l.stage !== 'Lost' && l.follow != null && l.follow <= 0;
export const dueToday = (db: DB, me: Account | null) => db.leads.filter(l => mine(me)(l) && isDue(l)).length;
export const expiringCount = (db: DB) => db.clients.filter(c => clientStatus(c) === 'Expiring soon').length;
export const duesList = (db: DB) => db.clients.filter(c => c.due > 0);
export const todaysCheckins = (db: DB) => db.checkins.filter(x => x.at >= TODAY0);
export const checkinsToday = (db: DB) => todaysCheckins(db).length;
export const checkedInToday = (db: DB, id: string) => db.checkins.find(x => x.id === id && x.at >= TODAY0);

/** money actually received in the last 30 days: the single source for every revenue figure */
export const revenue30 = (db: DB) => db.payments.filter(p => p.date > -30).reduce((a, p) => a + p.amount, 0);
/** 11 past months (static history) + the live last-30-days bar */
export const revenueSeries = (db: DB) => [...db.revenue.slice(0, 11), revenue30(db)];

/** what a convert / add / renew costs: plan + PT add-on, and on renewal any balance still owed */
export const convTotal = (db: DB, plan: string, pt: boolean, carry = 0) => planOf(db, plan).price + (pt ? PT_PRICE : 0) + carry;

/** members who joined in the last 30 days, newest first */
export const recentJoins = (db: DB, f: (c: Client) => boolean = () => true) => db.clients.filter(c => c.since <= 30 && f(c)).sort((a, b) => a.since - b.since);

export const joined30 =(db: DB, f: (c: Client) => boolean = () => true) => db.clients.filter(c => c.since <= 30 && f(c)).length;
export const leads30 = (db: DB) => db.leads.filter(l => l.createdAt <= 30).length;
export const renewals30 = (db: DB) => db.payments.filter(p => p.date > -30 && p.kind === 'Renewal').length;
export const conversionRate = (db: DB) => joined30(db) / Math.max(1, joined30(db) + leads30(db)) * 100;
export const activeCount = (db: DB) => db.clients.filter(isActive).length;
export const ending7 = (db: DB) => db.clients.filter(c => !c.frozen && c.end >= 0 && c.end <= 7);

export const atRisk = (db: DB) => db.clients.filter(c => !c.frozen && c.end >= 0 && (c.lastVisit >= 10 || (c.end <= 14 && c.visits <= 3))).sort((a, b) => b.lastVisit - a.lastVisit);
export const renewP = (c: Client) => c.frozen ? .6 : c.lastVisit >= 10 ? .3 : c.visits <= 3 ? .45 : c.visits <= 8 ? .7 : .88;

export interface RepStats { id: string; name: string; role: string; target: number; email: string; open: number; due: number; trials: number; won: number; revenue: number; rate: number; pct: number }
export function teamStats(db: DB): RepStats[] {
  return db.team.map(t => {
    const open = db.leads.filter(l => l.owner === t.id && l.stage !== 'Lost');
    const won = db.clients.filter(c => c.soldBy === t.id && c.since <= 30);
    const revenue = won.reduce((a, c) => a + c.paid, 0);
    return { ...t, open: open.length, due: open.filter(l => l.follow != null && l.follow <= 0).length, trials: open.filter(l => l.stage === 'Trial booked' || l.stage === 'Trial done').length, won: won.length, revenue, rate: Math.round(won.length / Math.max(1, won.length + open.length) * 100), pct: revenue / t.target };
  }).sort((a, b) => b.revenue - a.revenue);
}
/** enquiry assignment: the rep (not front desk) with the fewest open leads */
export const leastLoadedRep = (db: DB) => db.team.filter(t => t.role !== 'Front desk')
  .map(t => ({ t, n: db.leads.filter(l => l.owner === t.id && l.stage !== 'Lost').length })).sort((a, b) => a.n - b.n)[0].t;

/** check-ins per hour, 5 AM to 10 PM */
export function hourly(db: DB) {
  const h = new Array(18).fill(0) as number[];
  db.checkins.forEach(x => { if (x.at < TODAY0) return; const hr = new Date(x.at).getHours(); if (hr >= 5 && hr < 23) h[hr - 5]++; });
  return h;
}
export const hLabel = (t: number) => `${t > 12 ? t - 12 : t} ${t >= 12 ? 'PM' : 'AM'}`;
export const timeOf = (ms: number) => new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

export const memberDigits = (c: Client) => c.memberNo.replace(/\D/g, '');
/** real streak when we have the visit history (Simran), otherwise a stable demo number */
export const streakOf = (c: Client) => c.visitDays ? mStreak(c) : 1 + (hash(c.id) % 9);

/* lead activity timeline, built from the stage progression */
export interface Act { ic: string; t: string; p: string; d: number }
export function leadActivity(l: Lead): Act[] {
  if (l.imported) return [{ ic: 'upload', t: 'Imported', p: 'Added from a file import', d: 0 }];
  const idx = Math.max(0, STAGES.findIndex(s => s.k === l.stage));
  const steps: Omit<Act, 'd'>[] = [{ ic: 'userPlus', t: 'Enquiry received', p: `Came in through ${l.source}` }];
  if (idx >= 1) steps.push({ ic: 'phone', t: 'Call logged', p: 'Asked about batch timings and parking' }, { ic: 'chat', t: 'WhatsApp sent', p: 'Shared the plan price list' });
  if (idx >= 2) steps.push({ ic: 'calendar', t: 'Trial booked', p: 'Free trial session, 7 AM batch' });
  if (idx >= 3) steps.push({ ic: 'dumbbell', t: 'Trial done', p: 'Liked the strength floor, asked about PT' });
  if (idx >= 4) steps.push({ ic: 'note', t: 'Price discussed', p: 'Wants a discount on the quarterly plan' });
  if (l.stage === 'Lost') steps.push({ ic: 'x', t: 'Marked as lost', p: 'Joined a gym closer to home' });
  const span = Math.max(0, l.createdAt - l.lastContact), n = steps.length;
  return steps.map((x, i) => ({ ...x, d: n === 1 ? l.createdAt : Math.round(l.createdAt - span * i / (n - 1)) })).reverse();
}

/* check-in desk demo chips */
export function demoMembers(db: DB): [string, Client][] {
  const act = db.clients.find(c => clientStatus(c) === 'Active' && c.visits > 12 && !checkedInToday(db, c.id));
  const soon = db.clients.find(c => !c.frozen && c.end >= 1 && c.end <= 6 && c.visits > 2);
  const gone = db.clients.find(c => !c.frozen && c.end < -3 && c.end > -20);
  const fro = db.clients.find(c => c.frozen);
  return ([['Active', act], ['Ending soon', soon], ['Expired', gone], ['Frozen', fro]] as [string, Client | undefined][]).filter((x): x is [string, Client] => !!x[1]);
}

/* campaigns */
export interface Segment { k: SegmentKey; ic: string; t: string; d: string; who: 'clients' | 'leads'; list: (db: DB) => (Client | Lead)[] }
export const SEGMENTS: Segment[] = [
  { k: 'ending7', ic: 'clock', t: 'Plans ending in 7 days', d: 'Remind before they lapse', who: 'clients', list: ending7 },
  { k: 'atrisk', ic: 'alert', t: 'Members at risk', d: 'No visit in 10+ days or low attendance', who: 'clients', list: atRisk },
  { k: 'expired', ic: 'refresh', t: 'Expired in last 30 days', d: 'Win them back', who: 'clients', list: db => db.clients.filter(c => !c.frozen && c.end < 0 && c.end >= -30) },
  { k: 'hot', ic: 'flame', t: 'Hot leads', d: 'Score 70 and above', who: 'leads', list: db => db.leads.filter(l => l.stage !== 'Lost' && l.score >= 70) },
  { k: 'lost', ic: 'userPlus', t: 'Lost leads', d: 'Try one more time', who: 'leads', list: db => db.leads.filter(l => l.stage === 'Lost') },
  { k: 'active', ic: 'users', t: 'All active members', d: 'Announcements and offers', who: 'clients', list: db => db.clients.filter(isActive) },
];
export const segOf = (k: SegmentKey) => SEGMENTS.find(s => s.k === k)!;
export const isClient = (x: Client | Lead | null | undefined): x is Client => !!x && 'memberNo' in x;
export function fillVars(db: DB, body: string, x: Client | Lead | null) {
  const c = isClient(x) ? x : null;
  return body.replace(/\{name\}/g, x ? x.name.split(' ')[0] : 'Simran').replace(/\{plan\}/g, c ? c.plan : 'Quarterly').replace(/\{expiry\}/g, c ? fmtDate(c.end, true) : fmtDate(7, true))
    .replace(/\{gym\}/g, db.gym.name).replace(/\{trainer\}/g, c ? c.trainer.split(' ')[0] : 'Vikram');
}
export const outcomeWord = (seg: SegmentKey) => seg === 'atrisk' ? 'came back' : seg === 'hot' ? 'joined' : 'renewed';

/* reports */
export function forecast(db: DB, days: number) {
  const list = db.clients.filter(c => !c.frozen && c.end >= 0 && c.end <= days);
  const weeks = Array.from({ length: Math.ceil(days / 7) }, () => ({ likely: 0, risk: 0, n: 0 }));
  let likely = 0, risk = 0, sure = 0;
  list.forEach(c => { const p = renewP(c), val = planOf(db, c.plan).price * p, w = weeks[Math.min(weeks.length - 1, Math.floor(c.end / 7))]; w.n++; if (p >= .6) { w.likely += val; likely += val; sure++; } else { w.risk += val; risk += val; } });
  return { list, weeks, likely, risk, sure, total: likely + risk, potential: list.reduce((a, c) => a + planOf(db, c.plan).price, 0) };
}
export function cohorts() {
  const r = rng(404), out: { label: string; size: number; row: number[] }[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    const size = 22 + Math.floor(r() * 26); let v = 100; const row = [100];
    for (let k = 1; k <= i; k++) { v = Math.max(38, v - (k === 1 ? 9 + r() * 6 : k === 3 ? 7 + r() * 5 : 2 + r() * 5)); row.push(Math.round(v)); }
    out.push({ label: `${d.toLocaleDateString('en-IN', { month: 'short' })} '${String(d.getFullYear()).slice(2)}`, size, row });
  }
  return out;
}

/* member app */
export const mStreak = (m: Client) => { const v = m.visitDays!; let s = 0, d = v.has(0) ? 0 : -1; while (v.has(d)) { s++; d--; } return s; };
export const mBest = (m: Client) => { let best = 0, cur = 0; for (let d = -112; d <= 0; d++) { if (m.visitDays!.has(d)) { cur++; best = Math.max(best, cur); } else cur = 0; } return best; };
export const mMonth = (m: Client) => [...m.visitDays!].filter(d => d >= -29).length;
export function crowd(db: DB) {
  const now = new Date().getHours(), h = hourly(db)[Math.max(0, Math.min(17, now - 5))] || 0;
  const pct = Math.min(100, Math.round(h / 40 * 100));
  return { pct, label: pct < 35 ? 'Quiet right now' : pct < 70 ? 'Getting busy' : 'Packed right now', n: h };
}
export const weekdayIdx = (off: number) => (dayDate(off).getDay() + 6) % 7;
