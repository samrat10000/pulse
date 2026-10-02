/* Decorated option lists for <Select>, so the same kind of choice looks the same everywhere. */
import { Banknote, CalendarClock, CalendarX, CreditCard, Landmark, Smartphone } from 'lucide-react';
import { stageC } from '@/data/rules';
import { SRC_C, STAGES } from '@/data/seed';
import type { DB, PayMode } from '@/data/types';
import { fmtDate, money } from '@/lib/format';
import type { Option } from './ui/Select';

export const teamOpts = (db: DB): Option[] => db.team.map(t => ({ value: t.id, label: t.name, avatar: t.name, hint: t.role }));
export const peopleOpts = (names: string[]): Option[] => names.map(n => ({ value: n, label: n, avatar: n }));
export const stageOpts = (withJoined = false): Option[] => [
  ...STAGES.map(s => ({ value: s.k, label: s.k, color: stageC(s.k) })),
  ...(withJoined ? [{ value: 'Joined', label: 'Joined', hint: 'Make them a member', color: '#15A05A' }] : []),
];
export const sourceOpts = (sources: string[]): Option[] => sources.map(s => ({ value: s, label: s, color: SRC_C[s] || '#8A94A6' }));
export const planOpts = (db: DB): Option[] => db.plans.map(p => ({ value: p.k, label: p.k, hint: `${p.months} month${p.months > 1 ? 's' : ''} · ${money(p.price)}` }));

const PAY_ICON: Record<PayMode, typeof Smartphone> = { UPI: Smartphone, Cash: Banknote, Card: CreditCard, 'Bank transfer': Landmark };
export const payOpts = (modes: PayMode[]): Option[] => modes.map(m => { const I = PAY_ICON[m]; return { value: m, label: m, icon: <I size={15} /> }; });

/** follow-up reschedule, with the real date each choice lands on */
export const followOpts = (): Option[] => [
  { value: '0', label: 'Today', hint: fmtDate(0, true), icon: <CalendarClock size={15} /> },
  { value: '1', label: 'Tomorrow', hint: fmtDate(1, true), icon: <CalendarClock size={15} /> },
  { value: '3', label: 'In 3 days', hint: fmtDate(3, true), icon: <CalendarClock size={15} /> },
  { value: '7', label: 'Next week', hint: fmtDate(7, true), icon: <CalendarClock size={15} /> },
  { value: '', label: 'No follow-up', hint: 'Clear the reminder', icon: <CalendarX size={15} /> },
];
