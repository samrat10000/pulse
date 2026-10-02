import { create } from 'zustand';
import { ACCOUNTS, createDB, TRAINERS } from '@/data/seed';
import { accounts, clearDB, DB_KEY, loadDB, parseDB, readProfiles, saveDB } from '@/data/persist';
import { checkedInToday, convTotal, findClient, findLead, leastLoadedRep, planOf } from '@/data/rules';
import type { Account, Campaign, Client, DB, Gym, Lead, NotifKey, Payment, PayMode, RoleKey, SegmentKey, StageKey, TeamMember } from '@/data/types';
import { newImp, type ImpState } from '@/import/mapping';
import { addMonths } from '@/lib/dates';
import { store as storage } from '@/lib/env';
import { phoneKey } from '@/lib/format';

/* ---------- roles ---------- */
export type Page = 'dashboard' | 'reports' | 'leads' | 'clients' | 'team' | 'campaigns' | 'checkin' | 'payments' | 'import' | 'settings' | 'profile' | 'me';
const ALLOW: Record<RoleKey, Page[] | null> = {
  owner: null,
  sales: ['dashboard', 'leads', 'clients', 'team', 'campaigns', 'import', 'profile'],
  desk: ['dashboard', 'checkin', 'clients', 'leads', 'payments', 'campaigns', 'profile'],
  member: ['me'],
};
export const can = (me: Account | null, page: Page) => !!me && (me.key === 'member' ? page === 'me' : page !== 'me' && (!ALLOW[me.key] || ALLOW[me.key]!.includes(page)));
export const TITLES: Record<Page, string> = { reports: 'Reports', campaigns: 'Campaigns', me: 'My membership', dashboard: 'Dashboard', leads: 'Leads', clients: 'Clients', team: 'Sales team', checkin: 'Check-in desk', payments: 'Payments', import: 'Import', settings: 'Settings', profile: 'Profile' };

/* ---------- overlays ---------- */
export type ConvCtx = 'convert' | 'new' | 'renew';
export interface Conv { leadId?: string; clientId?: string; name: string; phone: string; plan: string; startOff: number; trainer: string; pt: boolean; pay: PayMode }
export type DrawerState =
  | { k: 'lead'; id: string }
  | { k: 'client'; id: string }
  | { k: 'newLead'; stage?: StageKey; phone?: string; source?: string }
  | { k: 'conv'; ctx: ConvCtx; conv: Conv; key: number }
  | { k: 'collect'; id: string }
  | { k: 'newRep' }
  | { k: 'campaign'; id: string };
export type ModalState = { k: 'receipt'; no: string } | { k: 'enquiry' } | { k: 'composer'; seg?: SegmentKey };

/* ---------- page ui state (kept across navigation, like the prototype) ---------- */
export interface UI {
  lView: 'table' | 'board'; lTab: string; lQuery: string; lOwner: string; lSource: string; lSort: { key: 'name' | 'score' | 'follow' | 'createdAt'; dir: number }; lPage: number; lSel: Set<string>;
  cTab: string; cQuery: string; cPlan: string; cTrainer: string; cSort: { key: 'name' | 'end' | 'visits' | 'paid' | 'since'; dir: number }; cPage: number; cSel: Set<string>;
  pTab: 'receipts' | 'dues'; pQuery: string; pPage: number;
  range: 12 | 6; set: 'gym' | 'plans' | 'notif' | 'look' | 'demo'; fc: 30 | 60 | 90; side: boolean; kiosk: boolean;
}
const initUI = (): UI => ({
  lView: 'table', lTab: 'All', lQuery: '', lOwner: 'all', lSource: 'all', lSort: { key: 'follow', dir: 1 }, lPage: 1, lSel: new Set(),
  cTab: 'All', cQuery: '', cPlan: 'all', cTrainer: 'all', cSort: { key: 'since', dir: 1 }, cPage: 1, cSel: new Set(),
  pTab: 'receipts', pQuery: '', pPage: 1, range: 12, set: 'gym', fc: 90, side: false, kiosk: false,
});

export type Theme = 'light' | 'dark' | 'system';
export interface Toast { id: number; msg: string; out: boolean }

interface State {
  db: DB;
  /** bumped after every DB mutation; components re-render through useDB() */
  v: number;
  me: Account | null;
  /** page asked for while signed out */
  after: Page | null;
  theme: Theme;
  ui: UI;
  fresh: Set<string>;
  drawer: DrawerState | null;
  modal: ModalState | null;
  cmdk: boolean;
  splash: number;
  toasts: Toast[];
  imp: ImpState;
  setImp: (patch: Partial<ImpState>) => void;

  toast: (msg: string) => void;
  mutate: (fn: (db: DB) => void) => void;
  setUi: (patch: Partial<UI>) => void;
  markFresh: (...ids: string[]) => void;
  openDrawer: (d: DrawerState) => void;
  closeDrawer: () => void;
  openModal: (m: ModalState) => void;
  closeModal: () => void;
  setCmdk: (open: boolean) => void;
  setTheme: (t: Theme) => void;

  login: (acc: Account, keep?: boolean) => void;
  logout: () => void;
  updateProfile: (p: Pick<Account, 'name' | 'email' | 'phone'>) => void;

  addLead: (l: Omit<Lead, 'id' | 'createdAt' | 'lastContact' | 'imported'> & { note?: string }) => Lead;
  updateLead: (id: string, patch: Partial<Lead>) => void;
  followDone: (id: string) => void;
  markLost: (id: string) => void;
  reopenLead: (id: string) => void;
  assignLeads: (ids: string[], owner: string) => void;
  addNote: (id: string, text: string) => void;
  addEnquiry: (name: string, phone: string, goal: string, time: string) => { lead: Lead; code: string };
  receiveLead: (lead: Lead, note: DB['notes'][string]) => void;

  startConv: (ctx: ConvCtx, src?: Lead | Client) => void;
  saveMembership: (ctx: ConvCtx, c: Conv, recv: number) => Client;
  toggleFreeze: (id: string) => void;
  setTrainer: (id: string, trainer: string) => void;
  recordPayment: (c: Client, amount: number, mode: PayMode, item: string, kind: Payment['kind'], total: number) => Payment;
  collect: (id: string, amount: number, mode: PayMode) => Payment;
  checkin: (id: string) => number;
  memberRenew: (planKey: string) => Payment;

  addRep: (t: Omit<TeamMember, 'id'>) => void;
  saveGym: (g: Gym) => void;
  savePlans: (rows: { k: string; months: number; price: number }[]) => boolean;
  setNotif: (k: NotifKey, on: boolean) => void;

  /** back to the seeded demo data */
  resetDemo: () => void;
  addCampaign: (c: Campaign) => void;
  patchCampaign: (id: string, patch: Partial<Campaign>) => void;
}

let toastSeq = 0;
let lastToast = { msg: '', at: 0 };

export { accounts };

/** signed in for this tab, or across restarts when "Keep me signed in" was ticked */
const restore = (): Account | null => {
  const k = (storage.get('session', 'pulse-auth') || storage.get('local', 'pulse-auth')) as RoleKey | null;
  return k && ACCOUNTS[k] ? accounts()[k] : null;
};
const initialTheme = (): Theme => (storage.get('local', 'pulse-theme') as Theme | null) || 'system';

export const useStore = create<State>()((set, get) => {
  const bump = () => { set(s => ({ v: s.v + 1 })); saveDB(get().db); };
  const mutate = (fn: (db: DB) => void) => { fn(get().db); bump(); };
  const nextId = (p: 'l' | 'm') => p + (++get().db.seq);
  const me0 = restore();

  return {
    db: loadDB() ?? createDB(), v: 0, me: me0, after: null, theme: initialTheme(),
    ui: { ...initUI(), lOwner: me0?.key === 'sales' ? me0.id : 'all' },
    fresh: new Set(), drawer: null, modal: null, cmdk: false, splash: 0, toasts: [],
    imp: newImp('Leads'),
    setImp: patch => set(s => ({ imp: { ...s.imp, ...patch } })),

    toast: msg => {
      // StrictMode and double handlers can fire the same toast twice in a row
      if (msg === lastToast.msg && Date.now() - lastToast.at < 400) return;
      lastToast = { msg, at: Date.now() };
      const id = ++toastSeq;
      set({ toasts: [...get().toasts, { id, msg, out: false }].slice(-3) });
      setTimeout(() => {
        set({ toasts: get().toasts.map(t => (t.id === id ? { ...t, out: true } : t)) });
        setTimeout(() => set({ toasts: get().toasts.filter(t => t.id !== id) }), 300);
      }, 2600);
    },
    mutate,
    setUi: patch => set(s => ({ ui: { ...s.ui, ...patch } })),
    markFresh: (...ids) => {
      set(s => ({ fresh: new Set([...s.fresh, ...ids]) }));
      setTimeout(() => set(s => { const f = new Set(s.fresh); ids.forEach(i => f.delete(i)); return { fresh: f }; }), 3200);
    },
    openDrawer: d => set({ drawer: d, modal: null, cmdk: false }),
    closeDrawer: () => set({ drawer: null }),
    openModal: m => set({ modal: m, drawer: null, cmdk: false }),
    closeModal: () => set({ modal: null }),
    setCmdk: open => set({ cmdk: open, ...(open ? { drawer: null } : {}) }),
    setTheme: t => {
      const root = document.documentElement;
      if (t === 'system') delete root.dataset.theme; else root.dataset.theme = t;
      storage.set('local', 'pulse-theme', t);
      set({ theme: t });
    },

    login: (acc, keep = true) => {
      storage.set('session', 'pulse-auth', acc.key);
      storage.set('local', 'pulse-auth', keep ? acc.key : null);
      set(s => ({ me: accounts()[acc.key], ui: { ...s.ui, lOwner: acc.key === 'sales' ? acc.id : 'all', lPage: 1, kiosk: false }, splash: s.splash + 1 }));
    },
    logout: () => {
      storage.set('session', 'pulse-auth', null);
      storage.set('local', 'pulse-auth', null);
      set(s => ({ me: null, drawer: null, modal: null, cmdk: false, ui: { ...s.ui, kiosk: false, side: false } }));
      get().toast('Signed out');
    },
    updateProfile: p => {
      const me = get().me; if (!me) return;
      const all = readProfiles(); all[me.key] = p;
      storage.set('local', 'pulse-profiles', JSON.stringify(all));
      set({ me: { ...me, ...p } });
      // staff are also on the sales team list; keep their name there in step
      mutate(db => { const t = db.team.find(x => x.id === me.id); if (t) { t.name = p.name; t.email = p.email; } });
    },

    addLead: f => {
      const { note, ...rest } = f;
      const l: Lead = { ...rest, id: nextId('l'), createdAt: 0, lastContact: 0, imported: 0 };
      mutate(db => { db.leads.unshift(l); if (note) db.notes[l.id] = [{ text: note, at: Date.now() }]; });
      get().markFresh(l.id);
      return l;
    },
    updateLead: (id, patch) => mutate(db => { const l = findLead(db, id); if (l) Object.assign(l, patch); }),
    followDone: id => mutate(db => {
      const l = findLead(db, id); if (!l) return;
      l.follow = 3; l.lastContact = 0;
      (db.notes[id] = db.notes[id] || []).unshift({ text: 'Followed up. Next call in 3 days.', at: Date.now() });
    }),
    markLost: id => mutate(db => { const l = findLead(db, id); if (l) { l.stage = 'Lost'; l.follow = null; } }),
    reopenLead: id => mutate(db => { const l = findLead(db, id); if (l) { l.stage = 'Contacted'; l.follow = 0; } }),
    assignLeads: (ids, owner) => mutate(db => db.leads.forEach(l => { if (ids.includes(l.id)) l.owner = owner; })),
    addNote: (id, text) => mutate(db => {
      (db.notes[id] = db.notes[id] || []).unshift({ text, at: Date.now() });
      const l = findLead(db, id); if (l) l.lastContact = 0;
    }),
    addEnquiry: (name, phone, goal, time) => {
      const db = get().db, k = phoneKey(phone), fp = `+91 ${k.slice(0, 5)} ${k.slice(5)}`;
      const lead = get().addLead({ name, phone: fp, email: '', source: 'Enquiry link', interest: goal, planInterest: 'Quarterly', stage: 'New', owner: leastLoadedRep(db).id, follow: 0, score: 74, note: `Booked a free trial from the enquiry link. Prefers ${time.toLowerCase()}.` });
      try { new BroadcastChannel('pulse').postMessage({ type: 'lead', lead, note: db.notes[lead.id] }); } catch { /* not supported */ }
      return { lead, code: 'TRIAL-' + (4800 + db.leads.length) };
    },
    receiveLead: (lead, note) => {
      if (get().db.leads.some(l => l.id === lead.id)) return;
      mutate(db => { db.leads.unshift(lead); db.notes[lead.id] = note; });
      get().markFresh(lead.id);
    },

    startConv: (ctx, src) => {
      const db = get().db;
      let conv: Conv;
      if (ctx === 'convert' && src && !('memberNo' in src)) conv = { leadId: src.id, name: src.name, phone: src.phone, plan: src.planInterest || 'Quarterly', startOff: 0, trainer: TRAINERS[0], pt: src.interest === 'Personal training', pay: 'UPI' };
      else if (ctx === 'renew' && src && 'memberNo' in src) conv = { clientId: src.id, name: src.name, phone: src.phone, plan: planOf(db, src.plan).k, startOff: Math.max(0, src.end), trainer: src.trainer, pt: src.pt, pay: 'UPI' };
      else conv = { name: '', phone: '', plan: 'Quarterly', startOff: 0, trainer: TRAINERS[0], pt: false, pay: 'UPI' };
      get().openDrawer({ k: 'conv', ctx, conv, key: Date.now() });
    },
    saveMembership: (ctx, C, recv) => {
      const { db, me } = get(), p = planOf(db, C.plan);
      if (ctx === 'renew') {
        const c = findClient(db, C.clientId!)!;
        // whatever is still owed on the old plan moves onto the renewal instead of vanishing
        const carry = c.due, total = convTotal(db, p.k, C.pt, carry);
        const item = `${p.k} plan${C.pt ? ' + PT' : ''}${carry ? ' + previous balance' : ''}`;
        mutate(() => Object.assign(c, { plan: p.k, start: C.startOff, end: addMonths(C.startOff, p.months), pt: C.pt, total, paid: recv, due: total - recv, frozen: false, mode: C.pay }));
        if (recv > 0) get().recordPayment(c, recv, C.pay, item, 'Renewal', total);
        return c;
      }
      const total = convTotal(db, p.k, C.pt), item = `${p.k} plan${C.pt ? ' + PT' : ''}`;
      const lead = C.leadId ? findLead(db, C.leadId) : undefined;
      const c: Client = { id: nextId('m'), memberNo: 'IHF-' + (++db.memberNo), name: C.name.trim(), phone: C.phone, email: lead ? lead.email : '', plan: p.k, start: C.startOff, end: addMonths(C.startOff, p.months), since: Math.max(0, -C.startOff), frozen: false, trainer: C.trainer, pt: C.pt, total, paid: recv, due: total - recv, mode: C.pay, visits: 0, lastVisit: 0, source: lead ? lead.source : 'Walk-in', soldBy: lead ? lead.owner : me?.id || 'u0', goal: lead ? lead.interest : 'Not given', imported: 0 };
      mutate(db => {
        if (lead) { db.leads = db.leads.filter(l => l.id !== lead.id); if (db.notes[lead.id]) db.notes[c.id] = db.notes[lead.id]; }
        db.clients.unshift(c);
      });
      get().markFresh(c.id);
      if (recv > 0) get().recordPayment(c, recv, C.pay, item, 'New', total);
      return c;
    },
    toggleFreeze: id => mutate(db => { const c = findClient(db, id); if (c) c.frozen = !c.frozen; }),
    setTrainer: (id, trainer) => mutate(db => { const c = findClient(db, id); if (c) c.trainer = trainer; }),
    recordPayment: (c, amount, mode, item, kind, total) => {
      const db = get().db;
      const p: Payment = { no: 'IHF/26-27/' + (++db.invNo), clientId: c.id, date: 0, item, amount, total, mode, kind };
      mutate(db => { db.payments.push(p); });
      get().markFresh(p.no);
      return p;
    },
    collect: (id, amount, mode) => {
      const c = findClient(get().db, id)!;
      mutate(() => { c.paid += amount; c.due -= amount; });
      return get().recordPayment(c, amount, mode, `Balance for ${c.plan} plan`, 'Balance', c.total);
    },
    checkin: id => {
      const at = Date.now();
      mutate(db => {
        if (checkedInToday(db, id)) return;
        const c = findClient(db, id); if (!c) return;
        db.checkins.unshift({ id, at }); c.visits++; c.lastVisit = 0;
        if (c.visitDays) c.visitDays.add(0);
      });
      return at;
    },
    memberRenew: planKey => {
      const db = get().db, c = db.member, p = planOf(db, planKey), from = Math.max(0, c.end);
      mutate(() => Object.assign(c, { plan: p.k, start: from, end: addMonths(from, p.months), total: p.price, paid: p.price, due: 0 }));
      return get().recordPayment(c, p.price, 'UPI', `${p.k} plan`, 'Renewal', p.price);
    },

    addRep: t => mutate(db => db.team.push({ ...t, id: 'u' + (db.team.length + 1) + (Date.now() % 1000) })),
    saveGym: g => mutate(db => { db.gym = g; }),
    savePlans: rows => {
      let bad = false;
      mutate(db => rows.forEach((r, i) => {
        const p = db.plans[i], k = r.k.trim();
        if (k && k !== p.k) {
          // a renamed plan keeps its members
          db.clients.forEach(c => { if (c.plan === p.k) c.plan = k; });
          db.leads.forEach(l => { if (l.planInterest === p.k) l.planInterest = k; });
          p.k = k;
        }
        if (r.months > 0) p.months = r.months; else bad = true;
        if (r.price > 0) p.price = r.price; else bad = true;
      }));
      return bad;
    },
    setNotif: (k, on) => mutate(db => { db.notif[k] = on; }),

    resetDemo: () => {
      clearDB(); storage.set('local', 'pulse-profiles', null);
      const me = get().me;
      set({ db: createDB(), me: me && accounts()[me.key], fresh: new Set(), drawer: null, modal: null, imp: newImp('Leads') });
      bump();
    },

    addCampaign: c => mutate(db => { db.campaigns.unshift(c); }),
    patchCampaign: (id, patch) => mutate(db => { const c = db.campaigns.find(x => x.id === id); if (c) Object.assign(c, patch); }),
  };
});

// another tab saved changes: pick them up so both tabs show the same data
try {
  window.addEventListener('storage', e => {
    if (e.key !== DB_KEY) return;
    const db = e.newValue ? parseDB(e.newValue) : null;
    if (db) useStore.setState(s => ({ db, v: s.v + 1 }));
  });
} catch { /* no storage events here */ }

/** subscribe a component to DB changes and return the (mutable) database */
export function useDB() {
  useStore(s => s.v);
  return useStore.getState().db;
}

export const toast = (msg: string) => useStore.getState().toast(msg);
