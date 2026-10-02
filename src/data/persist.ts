/* Saves the demo database in localStorage so everything entered (leads, members, payments,
   check-ins, imports, settings) is still there after closing the browser.
   Dates are day offsets from "today", so data saved on an earlier day is shifted forward
   on load: a follow-up due "tomorrow" yesterday is due "today" now. */
import { DAY, TODAY0 } from '@/lib/dates';
import { store } from '@/lib/env';
import { ACCOUNTS } from './seed';
import type { Account, DB, RoleKey } from './types';

/* profile edits (name, email, phone) are remembered per demo account */
type Profiles = Partial<Record<RoleKey, Pick<Account, 'name' | 'email' | 'phone'>>>;
export const readProfiles = (): Profiles => { try { return JSON.parse(store.get('local', 'pulse-profiles') || '{}'); } catch { return {}; } };
/** the four demo accounts with any saved profile edits applied */
export const accounts = (): Record<RoleKey, Account> => {
  const p = readProfiles();
  return Object.fromEntries((Object.keys(ACCOUNTS) as RoleKey[]).map(k => [k, { ...ACCOUNTS[k], ...p[k] }])) as Record<RoleKey, Account>;
};

export const DB_KEY = 'pulse-db';
const VERSION = 2;

type Saved = { version: number; day: number; db: Omit<DB, 'member'> & { member: string } };

/** move every day offset forward by `days` days (offsets get smaller, "days ago" get bigger) */
function rebase(db: Saved['db'], days: number) {
  if (!days) return;
  db.leads.forEach(l => { l.createdAt += days; l.lastContact += days; if (l.follow != null) l.follow -= days; });
  db.clients.forEach(c => {
    c.start -= days; c.end -= days; c.since += days; c.lastVisit += days;
    if (c.visitDays) c.visitDays = new Set([...c.visitDays].map(d => d - days));
  });
  db.payments.forEach(p => { p.date -= days; });
}

export function parseDB(raw: string | null): DB | null {
  if (!raw) return null;
  try {
    const saved: Saved = JSON.parse(raw, (_, v) => (v && typeof v === 'object' && Array.isArray(v.__set) ? new Set(v.__set) : v));
    if (saved.version !== VERSION || !saved.db?.clients) return null;
    const db = saved.db;
    rebase(db, Math.round((TODAY0 - saved.day) / DAY));
    const member = db.clients.find(c => c.id === db.member);
    if (!member) return null;
    // a campaign still "sending" when the page closed has finished by now
    db.campaigns.forEach(c => { c.live = false; });
    return { ...db, member };
  } catch { return null; }
}

export const loadDB = () => parseDB(store.get('local', DB_KEY));

let timer = 0;
export function saveDB(db: DB) {
  clearTimeout(timer);
  timer = window.setTimeout(() => {
    try {
      const json = JSON.stringify({ version: VERSION, day: TODAY0, db: { ...db, member: db.member.id } }, (_, v) => (v instanceof Set ? { __set: [...v] } : v));
      store.set('local', DB_KEY, json);
    } catch { /* storage full or blocked: the demo still works, it just won't be remembered */ }
  }, 250);
}

export function clearDB() {
  clearTimeout(timer);
  store.set('local', DB_KEY, null);
}
