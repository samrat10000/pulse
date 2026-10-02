/* Column → field matching for imports (spec §9.14). */
import { phoneKey } from '@/lib/format';
import { EMAIL_RE, PHONE_RE } from './validate';

export type ImportTo = 'Leads' | 'Clients';
export type FieldKey = 'name' | 'firstName' | 'lastName' | 'phone' | 'email' | 'interest' | 'source' | 'stage' | 'planInterest' | 'plan' | 'start' | 'end' | 'amount' | 'trainer' | 'goal' | 'notes';
export type How = 'auto' | 'value' | 'manual' | 'none';

export const FIELDS: Record<ImportTo, [FieldKey, string][]> = {
  Leads: [['name', 'Full name'], ['firstName', 'First name'], ['lastName', 'Last name'], ['phone', 'Phone'], ['email', 'Email'], ['interest', 'Interested in'], ['source', 'Source'], ['stage', 'Stage'], ['planInterest', 'Plan in mind'], ['notes', 'Notes']],
  Clients: [['name', 'Full name'], ['firstName', 'First name'], ['lastName', 'Last name'], ['phone', 'Phone'], ['email', 'Email'], ['plan', 'Plan'], ['start', 'Start date'], ['end', 'End date'], ['amount', 'Amount paid'], ['trainer', 'Trainer'], ['goal', 'Goal'], ['notes', 'Notes']],
};

const SYN: Record<FieldKey, string[]> = {
  name: ['name', 'full name', 'member', 'member name', 'customer', 'customer name', 'client', 'client name', 'person', 'lead name', 'lead', 'enquiry name', 'candidate'],
  firstName: ['first name', 'firstname', 'given name', 'fname'], lastName: ['last name', 'lastname', 'surname', 'family name', 'lname'],
  phone: ['phone', 'mobile', 'phone number', 'mobile number', 'contact', 'contact number', 'contact no', 'tel', 'telephone', 'cell', 'whatsapp', 'whatsapp number', 'mobile no', 'phone no', 'number'],
  email: ['email', 'e mail', 'email address', 'mail', 'email id', 'e mail id', 'e mail address', 'gmail'],
  interest: ['interest', 'interested in', 'goal', 'fitness goal', 'looking for', 'program', 'programme', 'service', 'enquiry for', 'requirement'],
  source: ['source', 'lead source', 'channel', 'origin', 'how did you hear', 'referred by', 'came from', 'medium'],
  stage: ['stage', 'status', 'lead status', 'lead stage'],
  planInterest: ['plan', 'plan in mind', 'package', 'membership', 'preferred plan'],
  plan: ['plan', 'membership', 'membership plan', 'package', 'subscription', 'membership type', 'plan type', 'duration'],
  start: ['start date', 'joining date', 'join date', 'joined', 'date of joining', 'doj', 'start', 'membership start', 'joined on', 'from', 'admission date'],
  end: ['end date', 'expiry', 'expiry date', 'valid till', 'valid until', 'valid upto', 'renewal date', 'membership end', 'expires', 'expires on', 'to', 'due date', 'till'],
  amount: ['amount', 'paid', 'fee', 'fees', 'amount paid', 'price', 'payment', 'total', 'paid amount'],
  trainer: ['trainer', 'coach', 'personal trainer', 'assigned trainer', 'pt', 'instructor'],
  goal: ['goal', 'fitness goal', 'objective', 'interest', 'target'],
  notes: ['notes', 'note', 'comments', 'remarks', 'remark', 'description', 'comment'],
};

/** lowercase, drop "(…)", non-alphanumerics → space */
const norm = (s: string) => String(s).toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

export type ColMap = Record<number, FieldKey | ''>;

/** import wizard state, kept in the store so it survives leaving the page mid-import */
export interface ImpState {
  to: ImportTo;
  step: 1 | 2 | 3 | 4;
  file: { name: string; ext: string; rows: number; cols: number; sample: boolean; truncated: boolean } | null;
  headers: string[];
  rows: string[][];
  map: ColMap;
  how: Record<number, How>;
  records: import('./validate').ImportRecord[] | null;
  dupMode: 'skip' | 'update';
  view: 'all' | 'ok' | 'dup' | 'err';
  busy: boolean;
  running: boolean;
  error: string | null;
  result: { added: number; updated: number; skipped: number } | null;
}
export const newImp = (to: ImportTo = 'Leads'): ImpState => ({ to, step: 1, file: null, headers: [], rows: [], map: {}, how: {}, records: null, dupMode: 'skip', view: 'all', busy: false, running: false, error: null, result: null });

export function autoMap(headers: string[], rows: string[][], to: ImportTo) {
  const keys = FIELDS[to].map(f => f[0]), map: ColMap = {}, how: Record<number, How> = {}, used = new Set<FieldKey>();
  headers.forEach((h, i) => {
    const n = norm(h);
    // pass 1: exact synonym
    let best = keys.find(k => !used.has(k) && SYN[k].includes(n));
    // pass 2: contains-match, longest synonym wins ("Membership Start Date" → start, not plan)
    if (!best) {
      let len = 0;
      keys.forEach(k => { if (used.has(k)) return; SYN[k].forEach(s => { if (s.length > 3 && n.includes(s) && s.length > len) { len = s.length; best = k; } }); });
    }
    if (best) { map[i] = best; how[i] = 'auto'; used.add(best); }
  });
  // pass 3: sniff values
  headers.forEach((_, i) => {
    if (map[i]) return;
    const vals = rows.slice(0, 40).map(r => r[i]).filter(Boolean); map[i] = ''; how[i] = 'none';
    if (vals.length < 2) return;
    const er = vals.filter(v => EMAIL_RE.test(v)).length / vals.length, pr = vals.filter(v => PHONE_RE.test(v) && phoneKey(v).length >= 10).length / vals.length;
    if (er > .6 && !used.has('email')) { map[i] = 'email'; how[i] = 'value'; used.add('email'); }
    else if (pr > .6 && !used.has('phone')) { map[i] = 'phone'; how[i] = 'value'; used.add('phone'); }
  });
  return { map, how };
}

/** continue needs a name source and a way to reach them */
export function mapReady(map: ColMap) {
  const vals = Object.values(map);
  const hasName = vals.includes('name') || vals.includes('firstName') || vals.includes('email'), hasReach = vals.includes('phone') || vals.includes('email');
  return { ok: hasName && hasReach, hint: hasName && hasReach ? '' : hasReach ? 'Match a name column to continue' : 'Match a phone or email column to continue' };
}
