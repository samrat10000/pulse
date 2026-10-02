/* Row validation, normalisers and commit for imports (spec §9.14). */
import { TRAINERS } from '@/data/seed';
import { planOf } from '@/data/rules';
import type { Client, DB, Lead, Plan, StageKey } from '@/data/types';
import { addMonths, DAY, TODAY0 } from '@/lib/dates';
import { phoneKey, titleCase } from '@/lib/format';
import type { ColMap, ImportTo } from './mapping';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PHONE_RE = /^\+?[\d\s().-]{8,}$/;

const MON: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
/** day offset; null when empty, undefined when unreadable. Day-first unless the second number is > 12. */
export function parseDate(v: unknown): number | null | undefined {
  const s = String(v || '').trim(); if (!s) return null;
  let d: Date | null = null, m: RegExpMatchArray | null;
  if (/^\d{5}(\.\d+)?$/.test(s)) { const n = +s; if (n > 30000 && n < 60000) { const t = new Date(Math.round((n - 25569) * DAY)); d = new Date(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()); } }
  else if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) d = new Date(+m[1], +m[2] - 1, +m[3]);
  else if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/))) { let a = +m[1], b = +m[2], y = +m[3]; if (y < 100) y += 2000; if (b > 12 && a <= 12) [a, b] = [b, a]; d = new Date(y, b - 1, a); }
  else if ((m = s.match(/^(\d{1,2})[\s-]+([a-z]{3})[a-z]*[\s,-]+(\d{2,4})$/i)) && MON[m[2].toLowerCase()] != null) { let y = +m[3]; if (y < 100) y += 2000; d = new Date(y, MON[m[2].toLowerCase()], +m[1]); }
  else { const t = Date.parse(s); if (!isNaN(t)) d = new Date(t); }
  if (!d || isNaN(d.getTime())) return undefined;
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - TODAY0) / DAY);
}

/** order matters: "Half yearly" must not match "year" */
export function normPlan(v: unknown, plans: Plan[]) {
  const s = String(v || '').toLowerCase(); if (!s) return null;
  if (/half|6/.test(s)) return 'Half-yearly';
  if (/annual|year|12/.test(s)) return 'Annual';
  if (/quarter|3/.test(s)) return 'Quarterly';
  if (/month|1/.test(s)) return 'Monthly';
  const p = plans.find(x => x.k.toLowerCase() === s); return p ? p.k : null;
}
export function parseValue(v: unknown) {
  const s = String(v || '').toLowerCase().replace(/,/g, ''); const m = s.match(/-?\d+(\.\d+)?/); if (!m) return 0;
  let n = parseFloat(m[0]); if (/\dk\b|\d\s*k$/.test(s)) n *= 1e3; if (/lakh|\dl\b/.test(s)) n *= 1e5; return Math.round(n);
}
const normSource = (v: unknown) => { const s = String(v || '').toLowerCase(); if (!s) return 'Import'; if (/insta|ig\b/.test(s)) return 'Instagram'; if (/walk/.test(s)) return 'Walk-in'; if (/google|search/.test(s)) return 'Google'; if (/refer|friend/.test(s)) return 'Referral'; if (/web|site|online/.test(s)) return 'Website'; if (/corp|office|company/.test(s)) return 'Corporate tie-up'; return titleCase(String(v)); };
const normInterest = (v: unknown) => { const s = String(v || '').toLowerCase(); if (!s) return 'General fitness'; if (/weight|fat|loss|slim/.test(s)) return 'Weight loss'; if (/muscle|gain|bulk|strength|body ?build/.test(s)) return 'Muscle gain'; if (/personal|pt\b|trainer/.test(s)) return 'Personal training'; if (/yoga/.test(s)) return 'Yoga'; if (/cross/.test(s)) return 'CrossFit'; if (/zumba|dance|aerobic/.test(s)) return 'Zumba'; return 'General fitness'; };
const normStage = (v: unknown): StageKey => { const s = String(v || '').toLowerCase(); if (/lost|not interested|dead|closed/.test(s)) return 'Lost'; if (/trial/.test(s) && /done|attend|complete|visited/.test(s)) return 'Trial done'; if (/visited/.test(s)) return 'Trial done'; if (/trial/.test(s)) return 'Trial booked'; if (/nego|hot|price|discount/.test(s)) return 'Negotiating'; if (/contact|called|warm|follow/.test(s)) return 'Contacted'; return 'New'; };

export interface LeadRec { name: string; phone: string; email: string; interest: string; source: string; stage: StageKey; planInterest: string; notes: string }
export interface ClientRec { name: string; phone: string; email: string; plan: string; start: number; end: number; paid: number; trainer: string; goal: string; notes: string }
export type RowSt = 'ok' | 'warn' | 'dup' | 'err';
export interface ImportRecord { idx: number; st: RowSt; issues: string[]; existing: string | null; rec: LeadRec | ClientRec }

export function buildRecords(db: DB, to: ImportTo, rows: string[][], map: ColMap): ImportRecord[] {
  const list: (Lead | Client)[] = to === 'Leads' ? db.leads : db.clients;
  const byPhone = new Map<string, string>(), byEmail = new Map<string, string>();
  list.forEach(x => { if (phoneKey(x.phone).length >= 10) byPhone.set(phoneKey(x.phone), x.id); if (x.email) byEmail.set(x.email.toLowerCase(), x.id); });
  const members = to === 'Leads' ? new Set(db.clients.map(c => phoneKey(c.phone))) : null;
  const seen = new Set<string>();
  const out: ImportRecord[] = [];
  rows.forEach((row, idx) => {
    const g: Partial<Record<string, string>> = {};
    Object.entries(map).forEach(([i, k]) => { if (k) g[k] = row[+i]; });
    let email = (g.email || '').trim(), phone = (g.phone || '').trim();
    const dg = phone.replace(/\D/g, ''); if (dg.length === 10 || (dg.length === 12 && dg.startsWith('91'))) { const k = dg.slice(-10); phone = `+91 ${k.slice(0, 5)} ${k.slice(5)}`; }
    let name = (g.name || [g.firstName, g.lastName].filter(Boolean).join(' ')).trim();
    const issues: string[] = []; let st = 'ok' as RowSt;
    const warn = (m: string) => { if (st === 'ok') st = 'warn'; issues.push(m); };
    if (!name && !email && !phone) return;
    const emailOk = !email || EMAIL_RE.test(email), phoneOk = !phone || phoneKey(phone).length >= 10;
    if (!emailOk && phone && phoneOk) { warn('Email looks incomplete, left out'); email = ''; }
    if (!phoneOk && email && emailOk) { warn('Phone looks incomplete, left out'); phone = ''; }
    if (!name && email && EMAIL_RE.test(email)) { name = titleCase(email.split('@')[0].replace(/\d+/g, '')); warn('Name taken from email'); }
    const err = (m: string) => { st = 'err'; issues.splice(0, issues.length, m); };
    if (!emailOk && !(phone && phoneOk)) err('Email looks incomplete');
    else if (!phoneOk && !(email && emailOk)) err('Phone looks incomplete');
    else if (!email && !phone) err('No phone or email');
    else if (!name) err('No name');

    let rec: LeadRec | ClientRec;
    if (to === 'Leads') {
      rec = { name, phone, email, interest: normInterest(g.interest), source: normSource(g.source), stage: normStage(g.stage), planInterest: normPlan(g.planInterest, db.plans) || 'Quarterly', notes: g.notes || '' };
    } else {
      let start = parseDate(g.start), end = parseDate(g.end); const amount = parseValue(g.amount); let p = normPlan(g.plan, db.plans);
      if (start === undefined || end === undefined) { if (st !== 'err') warn('Date not readable, starts today'); if (start === undefined) start = null; if (end === undefined) end = null; }
      if (!p && start != null && end != null) { const mo = (end - start) / 30; p = mo >= 9 ? 'Annual' : mo >= 4.5 ? 'Half-yearly' : mo >= 2 ? 'Quarterly' : 'Monthly'; }
      if (!p && amount) p = db.plans.reduce((a, b) => Math.abs(b.price - amount) < Math.abs(a.price - amount) ? b : a).k;
      if (!p) { p = 'Monthly'; if (st !== 'err') warn('No plan given, set to Monthly'); }
      const months = planOf(db, p).months;
      if (start == null && end != null) start = addMonths(end, -months);
      if (start == null) start = 0;
      if (end == null) end = addMonths(start, months);
      const trainer = TRAINERS.find(t => g.trainer && t.toLowerCase().includes(String(g.trainer).toLowerCase().split(' ')[0])) || (g.trainer ? titleCase(String(g.trainer)) : 'Not assigned');
      rec = { name, phone, email, plan: p, start, end, paid: amount || planOf(db, p).price, trainer, goal: g.goal || 'Not given', notes: g.notes || '' };
    }
    let existing: string | null = null;
    if (st !== 'err') {
      const pk = phoneKey(phone), ek = email.toLowerCase(), key = pk.length >= 10 ? 'p' + pk : 'e' + ek;
      const dup = (m: string) => { st = 'dup'; issues.splice(0, issues.length, m); };
      if ((pk.length >= 10 && byPhone.has(pk)) || (ek && byEmail.has(ek))) { existing = byPhone.get(pk) || byEmail.get(ek) || null; dup(to === 'Leads' ? 'Already in Leads' : 'Already a client'); }
      else if (members && pk.length >= 10 && members.has(pk)) dup('Already a member');
      else if (seen.has(key)) dup('Repeated in this file');
      seen.add(key);
    }
    out.push({ idx, st, issues, existing, rec });
  });
  return out;
}

export const willImport = (r: ImportRecord, dupMode: 'skip' | 'update') => r.st === 'ok' || r.st === 'warn' || (r.st === 'dup' && dupMode === 'update' && !!r.existing);

/** writes the records into the DB; returns counts and the ids to highlight */
export function commitImport(db: DB, to: ImportTo, records: ImportRecord[], dupMode: 'skip' | 'update', file: string) {
  let added = 0, updated = 0, skipped = 0; const now = Date.now(), fresh: string[] = [];
  const created: (Lead | Client)[] = [];
  records.forEach(r => {
    if (r.st === 'err') { skipped++; return; }
    if (r.st === 'dup') {
      const list: (Lead | Client)[] = to === 'Leads' ? db.leads : db.clients;
      const x = dupMode === 'update' && r.existing ? list.find(y => y.id === r.existing) : undefined;
      if (!x) { skipped++; return; }
      const keys = to === 'Leads' ? ['email', 'interest', 'source'] : ['email', 'plan', 'start', 'end', 'paid', 'trainer', 'goal'];
      const rec = r.rec as unknown as Record<string, unknown>, tgt = x as unknown as Record<string, unknown>;
      keys.forEach(k => { const v = rec[k]; if (v != null && v !== '' && v !== 'Import' && v !== 'Not given' && v !== 'Not assigned') tgt[k] = v; });
      if (to === 'Clients') {
        // the register's amount is what they paid for that plan: keep total/paid/due/since in step
        const c = x as Client, p = r.rec as ClientRec;
        c.total = Math.max(c.paid, p.paid); c.paid = p.paid; c.due = Math.max(0, c.total - c.paid); c.since = Math.max(c.since, -p.start);
      } else if ((x as Lead).stage === 'Lost') (x as Lead).follow = null;
      if (r.rec.notes) (db.notes[x.id] = db.notes[x.id] || []).unshift({ text: r.rec.notes, at: now });
      x.imported = now; if (to === 'Leads') (x as Lead).lastContact = 0;
      updated++; fresh.push(x.id);
      return;
    }
    const id = (to === 'Leads' ? 'l' : 'm') + (++db.seq);
    if (r.rec.notes) db.notes[id] = [{ text: r.rec.notes, at: now }];
    if (to === 'Leads') {
      const rec = r.rec as LeadRec;
      // round-robin across the team
      if (!db.sources.includes(rec.source)) db.sources.push(rec.source);
      // round-robin across the team; lost leads have nothing to follow up
      created.push({ id, name: rec.name, phone: rec.phone, email: rec.email, source: rec.source, interest: rec.interest, planInterest: rec.planInterest, stage: rec.stage, owner: db.team[(db.leads.length + created.length) % db.team.length].id, createdAt: 0, lastContact: 0, follow: rec.stage === 'Lost' ? null : 0, score: 50 + Math.floor(Math.random() * 25), imported: now });
    } else {
      const rec = r.rec as ClientRec;
      created.push({ id, memberNo: 'IHF-' + (++db.memberNo), name: rec.name, phone: rec.phone, email: rec.email, plan: rec.plan, start: rec.start, end: rec.end, since: Math.max(0, -rec.start), frozen: false, trainer: rec.trainer, pt: false, paid: rec.paid, total: rec.paid, due: 0, mode: 'Cash', visits: 0, lastVisit: 0, source: 'Import', soldBy: 'u0', goal: rec.goal, imported: now });
      // what the register says they paid becomes a receipt on their joining date, so Payments and revenue agree
      if (rec.paid > 0) db.payments.push({ no: 'IHF/26-27/' + (++db.invNo), clientId: id, date: Math.min(0, rec.start), item: `${rec.plan} plan`, amount: rec.paid, total: rec.paid, mode: 'Cash', kind: 'New' });
    }
    fresh.push(id); added++;
  });
  if (to === 'Leads') db.leads.unshift(...(created as Lead[])); else db.clients.unshift(...(created as Client[]));
  db.imports.unshift({ file, to, at: now, added: added + updated });
  return { added, updated, skipped, fresh };
}
