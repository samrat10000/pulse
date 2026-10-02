/* Mock data, ported exactly from the prototype. Seeds and draw order must not change. */
import { addMonths, DAY, dayDate, TODAY0 } from '@/lib/dates';
import { between, pick, rng, type Rand } from '@/lib/rng';
import type { Account, Campaign, Client, DB, Lead, PayMode, Plan, StageKey, TeamMember, Template } from './types';

export const ACCOUNTS: Record<'owner' | 'sales' | 'desk' | 'member', Account> = {
  owner: { key: 'owner', id: 'u0', name: 'Rohan Malhotra', role: 'Owner', label: 'Owner', email: 'rohan@ironhousefitness.in', phone: '+91 98140 55211' },
  sales: { key: 'sales', id: 'u2', name: 'Priya Nair', role: 'Membership advisor', label: 'Sales', email: 'priya@ironhousefitness.in', phone: '+91 98140 55302' },
  desk: { key: 'desk', id: 'u4', name: 'Neha Joshi', role: 'Front desk', label: 'Front desk', email: 'neha@ironhousefitness.in', phone: '+91 98140 55418' },
  member: { key: 'member', id: 'm-simran', name: 'Simran Kaur', role: 'Member', label: 'Member', email: 'simran.kaur@gmail.com', phone: '+91 98140 66123' },
};
export const PASSWORD = 'ironhouse2026';

export const TRAINERS = ['Vikram Bhatia', 'Sana Kapoor', 'Dev Thakur', 'Meher Gill'];
export const PT_PRICE = 4000;
export const INTERESTS = ['Weight loss', 'Muscle gain', 'General fitness', 'Personal training', 'Yoga', 'CrossFit', 'Zumba'];
export const STAGES: { k: Exclude<StageKey, 'Lost'>; c: string }[] = [
  { k: 'New', c: '#8A94A6' }, { k: 'Contacted', c: '#5B8DEF' }, { k: 'Trial booked', c: '#7C66E8' }, { k: 'Trial done', c: '#D99A00' }, { k: 'Negotiating', c: '#D9479B' },
];
export const SRC_C: Record<string, string> = { 'Walk-in': '#3D7BF7', Instagram: '#D9479B', Google: '#F2C94C', Referral: '#B9A9F2', Website: '#9DC2F7', 'Corporate tie-up': '#15A05A', 'Enquiry link': '#FF8A3D' };
export const PAY_MODES: PayMode[] = ['UPI', 'Cash', 'Card', 'Bank transfer'];
export const JOIN_URL = 'https://pulse.fit/j/ironhouse';
/** revenue / new members / renewals targets for the month */
export const TARGET = 1000000, TARGET_MEMBERS = 60, TARGET_RENEWALS = 40;

const FIRST = ['Aarav', 'Ishaan', 'Simran', 'Rahul', 'Ananya', 'Kavya', 'Arjun', 'Meera', 'Karan', 'Riya', 'Vihaan', 'Sneha', 'Harpreet', 'Nikhil', 'Pooja', 'Manav', 'Tanvi', 'Gurleen', 'Rohit', 'Diya', 'Yash', 'Aditi', 'Jaskaran', 'Neha', 'Sahil', 'Mehak', 'Varun', 'Isha', 'Kunal', 'Navneet', 'Tara', 'Dhruv', 'Ira', 'Aman', 'Sukhman', 'Prachi'];
const LAST = ['Sharma', 'Gill', 'Kaur', 'Verma', 'Sandhu', 'Mehta', 'Bedi', 'Arora', 'Kapoor', 'Chopra', 'Malhotra', 'Grewal', 'Singh', 'Bansal', 'Saini', 'Dhillon', 'Khanna', 'Bhalla', 'Sethi', 'Joshi', 'Ahuja', 'Nair', 'Rao', 'Iyer'];
const GOALS = ['Lose 8 kg before the wedding', 'Build strength', 'Stay active', 'Train for a half marathon', 'Improve flexibility', 'Get back in shape after an injury'];

export const TEMPLATES: Template[] = [
  { k: 'renew', t: 'Renewal reminder', seg: 'ending7', btns: ['Renew now', 'Call me'], body: 'Hi {name}, your {plan} membership at {gym} ends on {expiry}. Renew today to keep your streak going and your slot with {trainer}. Tap below to renew in 30 seconds.' },
  { k: 'miss', t: 'We miss you', seg: 'atrisk', btns: ['Book my slot', 'Talk to trainer'], body: "Hi {name}, we haven't seen you at {gym} in a while. {trainer} has saved you a spot this week. Come in for one session, the first step is the hardest." },
  { k: 'back', t: 'Win back', seg: 'expired', btns: ['Claim offer', 'Not now'], body: 'Hi {name}, your {plan} plan ended on {expiry}. Come back this week and get 15 days extra on any plan. Offer ends Sunday.' },
  { k: 'trial', t: 'Free trial follow-up', seg: 'hot', btns: ['Book trial', 'Call me'], body: 'Hi {name}, thanks for your interest in {gym}! Your free trial is waiting. Pick a time that suits you and our trainer will be ready.' },
  { k: 'diwali', t: 'Diwali offer', seg: 'active', btns: ['See offer', 'Share with a friend'], body: 'Happy Diwali from {gym}, {name}! Light up your fitness this festive season: 20% off annual plans and a free PT session for every referral. Valid till 5 Nov.' },
  { k: 'ny', t: 'New Year challenge', seg: 'active', btns: ['Join challenge'], body: 'Hi {name}, the {gym} 30-day New Year challenge starts 1 Jan. Visit 20 times in January to win a free month. Are you in?' },
];

export function createDB(): DB {
  const team: TeamMember[] = [
    { id: 'u1', name: 'Aman Sethi', role: 'Sales manager', target: 55000, email: 'aman@ironhousefitness.in' },
    { id: 'u2', name: 'Priya Nair', role: 'Membership advisor', target: 80000, email: 'priya@ironhousefitness.in' },
    { id: 'u3', name: 'Kabir Singh', role: 'Membership advisor', target: 70000, email: 'kabir@ironhousefitness.in' },
    { id: 'u4', name: 'Neha Joshi', role: 'Front desk', target: 25000, email: 'neha@ironhousefitness.in' },
    { id: 'u5', name: 'Arjun Rao', role: 'Membership advisor', target: 60000, email: 'arjun@ironhousefitness.in' },
  ];
  const plans: Plan[] = [{ k: 'Monthly', months: 1, price: 2499 }, { k: 'Quarterly', months: 3, price: 6499 }, { k: 'Half-yearly', months: 6, price: 11999 }, { k: 'Annual', months: 12, price: 19999 }];
  const planOf = (k: string) => plans.find(p => p.k === k) || plans[0];
  const sources = ['Walk-in', 'Instagram', 'Google', 'Referral', 'Website', 'Corporate tie-up'];
  let seq = 0;

  const used = new Set<string>();
  const personName = (r: Rand) => { let n; do { n = `${pick(FIRST, r)} ${pick(LAST, r)}`; } while (used.has(n)); used.add(n); return n; };
  const mkPhone = (r: Rand) => `+91 9${between(1000, 9999, r)} ${String(between(0, 99999, r)).padStart(5, '0')}`;
  const mkEmail = (n: string, r: Rand) => r() < .78 ? `${n.toLowerCase().replace(/\s+/g, '.')}${r() < .3 ? between(1, 99, r) : ''}@${pick(['gmail.com', 'gmail.com', 'yahoo.in', 'outlook.com', 'hotmail.com'], r)}` : '';

  /* makeLeads(54) */
  const leads: Lead[] = [];
  { const r = rng(11);
    for (let i = 0; i < 54; i++) {
      const name = personName(r), s = r();
      const stage: StageKey = s < .24 ? 'New' : s < .46 ? 'Contacted' : s < .64 ? 'Trial booked' : s < .78 ? 'Trial done' : s < .92 ? 'Negotiating' : 'Lost';
      const created = between(0, 40, r);
      leads.push({ id: 'l' + (++seq), name, phone: mkPhone(r), email: mkEmail(name, r), source: pick(sources, r), interest: pick(INTERESTS, r), planInterest: pick(['Monthly', 'Quarterly', 'Quarterly', 'Half-yearly', 'Annual'], r),
        stage, owner: team[Math.floor(r() * team.length)].id, createdAt: created, lastContact: Math.min(created, between(0, 9, r)),
        follow: stage === 'Lost' ? null : Math.max(-created, between(-4, 9, r)), score: between(15, 97, r), imported: 0 });
    } }

  /* makeClients(260) */
  const clients: Client[] = [];
  { const r = rng(23);
    for (let i = 0; i < 260; i++) {
      const name = personName(r), p = pick(['Monthly', 'Quarterly', 'Quarterly', 'Half-yearly', 'Annual', 'Annual'], r), pl = planOf(p);
      const len = pl.months * 30; const elapsed = between(0, len + 25, r); const end = len - elapsed;
      const since = elapsed + (r() < .5 ? between(0, 500, r) : 0);
      const pt = r() < .22;
      const slack = end >= 0 && r() < .13;
      const visits = end < 0 ? 0 : slack ? between(0, 3, r) : between(4, 24, r);
      const total = pl.price + (pt ? PT_PRICE : 0), part = end >= 0 && r() < .11;
      const paidNow = part ? Math.round(total * (.4 + r() * .35) / 100) * 100 : total;
      clients.push({ id: 'm' + (++seq), memberNo: 'IHF-' + String(1040 + i * 3).padStart(4, '0'), name, phone: mkPhone(r), email: mkEmail(name, r), plan: p, start: -elapsed, end, since,
        frozen: end > 20 && r() < .05, trainer: pick(TRAINERS, r), pt, paid: paidNow, total, due: total - paidNow, mode: pick<PayMode>(['UPI', 'UPI', 'UPI', 'Cash', 'Card'], r), visits,
        lastVisit: end < 0 ? -end + between(1, 9, r) : slack ? between(10, 26, r) : between(0, 6, r),
        source: pick(sources, r), soldBy: team[Math.floor(r() * team.length)].id, goal: pick(GOALS, r), imported: 0 });
    } }
  // added after generation so the seeds above stay unchanged
  sources.push('Enquiry link');

  /* payments: one receipt per member's current plan, numbered in date order */
  const payments: DB['payments'] = [];
  let invNo = 3180;
  clients.filter(c => c.start > -400).sort((a, b) => a.start - b.start).forEach(c => {
    if (c.paid > 0) payments.push({ no: 'IHF/26-27/' + (++invNo), clientId: c.id, date: c.start, item: `${c.plan} plan${c.pt ? ' + PT' : ''}`, amount: c.paid, total: c.total, mode: c.mode, kind: c.since > -c.start + 5 ? 'Renewal' : 'New' });
  });
  // the 11 months before this one; the current bar is always worked out from payments (rules.revenue30)
  const revenue = [612000, 588000, 545000, 702000, 668000, 731000, 694000, 655000, 742000, 786000, 761000];

  /* today's check-ins so far (only after doors open at 5:30) */
  const checkins: DB['checkins'] = [];
  { const r = rng(31), now = new Date(), mins = (now.getHours() - 5) * 60 + now.getMinutes() - 30;
    if (mins > 0) {
      const pool = clients.filter(c => !c.frozen && c.end >= 0 && c.lastVisit < 10);
      const n = Math.min(pool.length - 20, Math.round(mins / 60 * 13));
      const usedC = new Set<string>();
      for (let i = 0; i < n; i++) {
        let c: Client; do { c = pool[Math.floor(r() * pool.length)]; } while (usedC.has(c.id)); usedC.add(c.id);
        const peak = r() < .55 ? (r() < .6 ? 90 + r() * 120 : 750 + r() * 150) : r() * mins;
        const m = peak <= mins ? peak : r() * mins;
        checkins.push({ id: c.id, at: TODAY0 + (5.5 * 60 + m) * 60000 });
        c.lastVisit = 0;
      }
      checkins.sort((a, b) => b.at - a.at);
    } }

  /* Simran: a real member row, so staff see her check-ins and payments */
  const member: Client = { id: 'm-simran', memberNo: 'IHF-1520', name: 'Simran Kaur', phone: '+91 98140 66123', email: 'simran.kaur@gmail.com', plan: 'Annual', start: -112, end: 0, since: 112, frozen: false, trainer: 'Sana Kapoor', pt: true, total: 23999, paid: 23999, due: 0, mode: 'UPI', visits: 17, lastVisit: 1, source: 'Instagram', soldBy: 'u2', goal: 'Build strength', imported: 0, ptUsed: 7, ptTotal: 12 };
  member.end = addMonths(member.start, 12);
  clients.push(member);
  payments.push({ no: 'IHF/26-27/' + (++invNo), clientId: member.id, date: member.start, item: 'Annual plan + PT', amount: 23999, total: 23999, mode: 'UPI', kind: 'New' });
  { const r = rng(1520), visits: number[] = [];
    for (let d = -1; d >= -112; d--) { const dow = dayDate(d).getDay(); const p = d > -7 ? .86 : dow === 0 ? .1 : .58; if (r() < p) visits.push(d); }
    member.visitDays = new Set(visits);
    // staff screens read visits / lastVisit; derive them from the same history the member app shows
    member.visits = visits.filter(d => d >= -29).length;
    member.lastVisit = visits.length ? -Math.max(...visits) : 0; }

  const mk = (id: string, name: string, seg: Campaign['seg'], tpl: string, daysAgo: number, n: number, rates: number[], won: number, rev: number): Campaign =>
    ({ id, name, seg, tpl, at: Date.now() - daysAgo * DAY, status: daysAgo < 0 ? 'Scheduled' : 'Sent', n, delivered: Math.round(n * rates[0]), read: Math.round(n * rates[1]), replied: Math.round(n * rates[2]), won, revenue: rev });

  return {
    gym: { name: 'Ironhouse Fitness', branch: 'Main branch', phone: '+91 98140 55210', email: 'hello@ironhousefitness.in', address: 'SCO 42, Model Town Road', gst: '03AAICI4521K1ZP', hours: '5:30 AM to 10:30 PM' },
    team, plans, leads, clients, payments, checkins, revenue, sources, member,
    notes: {},
    imports: [
      { file: 'walk-in-register-sep.xlsx', to: 'Leads', at: Date.now() - DAY * 5, added: 38 },
      { file: 'old-members-list.docx', to: 'Clients', at: Date.now() - DAY * 17, added: 214 },
      { file: 'instagram-enquiries.csv', to: 'Leads', at: Date.now() - DAY * 26, added: 61 },
    ],
    campaigns: [
      mk('cp4', 'Diwali offer', 'active', 'diwali', -1.6, 203, [0, 0, 0], 0, 0),
      mk('cp3', 'October renewals', 'ending7', 'renew', 5, 38, [.97, .82, .24], 6, 71994),
      mk('cp2', 'We miss you', 'atrisk', 'miss', 12, 44, [.98, .8, .16], 11, 0),
      mk('cp1', 'Trial follow-up, September', 'hot', 'trial', 19, 26, [1, .85, .31], 4, 25996),
    ],
    templates: TEMPLATES.map(t => ({ ...t })),
    notif: { renew: true, digest: true, newLead: true, lowAttend: false },
    seq, memberNo: 1820, invNo,
  };
}
