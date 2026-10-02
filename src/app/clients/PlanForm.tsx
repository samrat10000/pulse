import clsx from 'clsx';
import { Check, X } from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button, IconButton } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import { convTotal, findClient, planOf } from '@/data/rules';
import { PAY_MODES, PT_PRICE, TRAINERS } from '@/data/seed';
import type { PayMode } from '@/data/types';
import { parseDate, parseValue } from '@/import/validate';
import { addMonths, dayDate } from '@/lib/dates';
import { fmtDate, money, phoneKey } from '@/lib/format';
import { toast, useDB, useStore, type Conv, type ConvCtx } from '@/store/useStore';

const iso = (off: number) => { const d = dayDate(off); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** one form for converting a lead, adding a client and renewing a membership */
export default function PlanForm({ ctx, init }: { ctx: ConvCtx; init: Conv }) {
  const db = useDB();
  const s = useStore.getState();
  const [C, setC] = useState(init);
  const carry = ctx === 'renew' ? (findClient(db, C.clientId!)?.due ?? 0) : 0;
  const p = planOf(db, C.plan), total = convTotal(db, C.plan, C.pt, carry);
  const [recv, setRecv] = useState<string | null>(null); // null = follow the total
  const [err, setErr] = useState('');
  const set = (patch: Partial<Conv>) => setC({ ...C, ...patch });

  const save = () => {
    const r = recv == null ? total : parseValue(recv);
    if (recv != null && recv.trim() === '') return setErr(`Amount received should be between ₹0 and ${money(total)}.`);
    if (r < 0 || r > total) return setErr(`Amount received should be between ₹0 and ${money(total)}.`);
    if (ctx === 'new') {
      if (!C.name.trim()) return setErr("Add the member's name.");
      if (phoneKey(C.phone).length < 10) return setErr('Add a 10-digit phone number.');
      if (db.clients.some(c => phoneKey(c.phone) === phoneKey(C.phone))) return setErr('A member with this phone number already exists.');
    }
    const c = s.saveMembership(ctx, C, r);
    s.openDrawer({ k: 'client', id: c.id });
    toast(ctx === 'renew' ? `${c.name} renewed till ${fmtDate(c.end, true)}${r < total ? `, ${money(total - r)} due` : ''}` : `${c.name} is now a member${r < total ? `, ${money(total - r)} due` : ''}`);
  };

  const title = ctx === 'renew' ? 'Renew membership' : ctx === 'new' ? 'Add client' : 'Convert to client';
  const sub = ctx === 'renew' ? `${C.name}'s new plan starts ${C.startOff > 0 ? `when the current one ends (${fmtDate(C.startOff, true)})` : 'today'}.`
    : ctx === 'new' ? 'Add a member who has already paid.' : `${C.name} becomes a member of ${db.gym.name}.`;

  return (
    <>
      <div className="dw-head"><IconButton icon={X} label="Close" onClick={s.closeDrawer} /></div>
      <div className="dw-id">{ctx !== 'new' && <Avatar name={C.name} size="lg" />}<div><h2>{title}</h2><p>{sub}</p></div></div>
      <div className="form">
        {ctx === 'new' && (
          <div className="f2">
            <label>Full name<input data-autofocus autoComplete="off" value={C.name} onChange={e => set({ name: e.target.value })} /></label>
            <label>Phone<input inputMode="tel" autoComplete="off" placeholder="+91" value={C.phone} onChange={e => set({ phone: e.target.value })} /></label>
          </div>
        )}
        <div>
          <span style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 500 }} id="plan-l">Membership plan</span>
          <div className="plans" role="radiogroup" aria-labelledby="plan-l">
            {db.plans.map(x => (
              <button key={x.k} type="button" role="radio" aria-checked={x.k === C.plan} className={clsx('plan', x.k === C.plan && 'on')} onClick={() => set({ plan: x.k })}>
                <b>{x.k}</b><span>{money(x.price)}</span><small>{x.months} month{x.months > 1 ? 's' : ''} · {money(Math.round(x.price / x.months))}/mo</small>
              </button>
            ))}
          </div>
        </div>
        {ctx !== 'renew' && (
          <div className="f2">
            <label>Start date<input type="date" value={iso(C.startOff)} onChange={e => { const o = parseDate(e.target.value); if (o != null) set({ startOff: o }); }} /></label>
            <label>Trainer<Select value={C.trainer} onChange={v => set({ trainer: v })} options={TRAINERS} /></label>
          </div>
        )}
        <div className="tgl-row" style={{ border: 0, padding: '4px 0' }}>
          <div><b>Personal training add-on</b><small>{money(PT_PRICE)} for 12 one-on-one sessions</small></div>
          <Toggle on={C.pt} onChange={v => set({ pt: v })} label="Personal training add-on" />
        </div>
        <div className="f2">
          <label>Amount received now (₹)<input inputMode="numeric" value={recv ?? String(total)} onChange={e => setRecv(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save(); }} /></label>
          <label>Paid by<Select value={C.pay} onChange={v => set({ pay: v as PayMode })} options={PAY_MODES} /></label>
        </div>
        <div className="sum">
          <div><span>{p.k} plan</span><span className="num">{money(p.price)}</span></div>
          {C.pt && <div><span>Personal training</span><span className="num">{money(PT_PRICE)}</span></div>}
          {carry > 0 && <div><span>Previous balance due</span><span className="num" style={{ color: 'var(--amber)' }}>{money(carry)}</span></div>}
          <div><span>Valid till</span><span className="num">{fmtDate(addMonths(C.startOff, p.months), true)}</span></div>
          <div><span>{carry > 0 ? 'Total to pay, incl. 18% GST' : 'Total, incl. 18% GST'}</span><span className="num">{money(total)}</span></div>
        </div>
        <p className="f-err" role={err ? 'alert' : undefined}>{err}</p>
        <Button variant="primary" icon={Check} onClick={save}>{ctx === 'renew' ? `Renew for ${money(total)}` : ctx === 'new' ? 'Add client' : 'Confirm and add member'}</Button>
      </div>
    </>
  );
}
