import clsx from 'clsx';
import { Bell, Building, CreditCard, Sun } from 'lucide-react';
import { useState } from 'react';
import { PageHead } from '@/components/bits';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { PT_PRICE } from '@/data/seed';
import type { NotifKey } from '@/data/types';
import { parseValue } from '@/import/validate';
import { money } from '@/lib/format';
import { toast, useDB, useStore, type Theme, type UI } from '@/store/useStore';

const SETS: [UI['set'], typeof Building, string][] = [['gym', Building, 'Gym details'], ['plans', CreditCard, 'Membership plans'], ['notif', Bell, 'Notifications'], ['look', Sun, 'Appearance']];

const NOTIFS: [NotifKey, string, string][] = [
  ['renew', 'Renewal reminders on WhatsApp', 'Sent to members 7 days and 1 day before their plan ends'],
  ['digest', 'Morning follow-up list', 'Each advisor gets their follow-ups for the day at 8 AM'],
  ['newLead', 'New lead alerts', 'Notify the assigned advisor as soon as a lead comes in'],
  ['lowAttend', 'Low attendance nudge', "Message members who haven't visited in 10 days"],
];

function GymForm() {
  const db = useDB();
  const [g, setG] = useState(db.gym);
  const field = (k: keyof typeof g, label: string) => <label>{label}<input value={g[k]} onChange={e => setG({ ...g, [k]: e.target.value })} /></label>;
  const save = () => { useStore.getState().saveGym({ ...g, name: g.name.trim() || db.gym.name }); toast('Gym details saved'); };
  return (
    <>
      <h3>Gym details</h3><p>Shown on receipts, reminders and the member card.</p>
      <div className="form">
        {field('name', 'Gym name')}
        <div className="f2">{field('branch', 'Branch')}{field('hours', 'Opening hours')}</div>
        <div className="f2">{field('phone', 'Phone')}{field('email', 'Email')}</div>
        {field('address', 'Address')}{field('gst', 'GSTIN')}
      </div>
      <div className="set-foot"><Button variant="primary" onClick={save}>Save changes</Button></div>
    </>
  );
}

function PlansForm() {
  const db = useDB();
  const [rows, setRows] = useState(db.plans.map(p => ({ k: p.k, months: String(p.months), price: String(p.price) })));
  const set = (i: number, f: 'k' | 'months' | 'price', v: string) => setRows(rows.map((r, j) => (j === i ? { ...r, [f]: v } : r)));
  const save = () => {
    const bad = useStore.getState().savePlans(rows.map(r => ({ k: r.k, months: parseValue(r.months), price: parseValue(r.price) })));
    setRows(useStore.getState().db.plans.map(p => ({ k: p.k, months: String(p.months), price: String(p.price) })));
    toast(bad ? 'Saved. Empty or zero values were kept as before.' : 'Membership plans saved');
  };
  return (
    <>
      <h3>Membership plans</h3><p>Prices used when you convert a lead or renew a member.</p>
      <div className="tbl-wrap" style={{ marginTop: 16 }}><table className="map-table plan-t" style={{ minWidth: 520 }}>
        <thead><tr><th>Plan</th><th>Months</th><th>Price (₹)</th><th>Members</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td><input aria-label="Plan name" value={r.k} onChange={e => set(i, 'k', e.target.value)} /></td>
              <td style={{ width: 110 }}><input aria-label="Months" inputMode="numeric" value={r.months} onChange={e => set(i, 'months', e.target.value)} /></td>
              <td style={{ width: 150 }}><input aria-label="Price" inputMode="numeric" value={r.price} onChange={e => set(i, 'price', e.target.value)} /></td>
              <td className="num muted">{db.clients.filter(c => c.plan === db.plans[i].k).length}</td>
            </tr>
          ))}
          <tr><td colSpan={4}><span className="muted" style={{ fontSize: 12.5 }}>Personal training add-on: {money(PT_PRICE)} for 12 sessions</span></td></tr>
        </tbody>
      </table></div>
      <div className="set-foot"><Button variant="primary" onClick={save}>Save plans</Button></div>
    </>
  );
}

export default function SettingsPage() {
  const db = useDB();
  const k = useStore(s => s.ui.set);
  const theme = useStore(s => s.theme);
  const s = useStore.getState();
  return (
    <>
      <PageHead title="Settings" sub="Gym details, plans and notifications" />
      <div className="set">
        <nav className="card set-nav" aria-label="Settings sections">
          {SETS.map(([kk, I, l]) => <button key={kk} className={clsx(k === kk && 'on')} aria-current={k === kk ? 'page' : undefined} onClick={() => s.setUi({ set: kk })}><I size={16} />{l}</button>)}
        </nav>
        <section className="card set-sec">
          {k === 'gym' && <GymForm />}
          {k === 'plans' && <PlansForm />}
          {k === 'notif' && <>
            <h3>Notifications</h3><p>What Pulse sends to members and to your team.</p>
            <div style={{ marginTop: 12 }}>{NOTIFS.map(([kk, t, d]) => (
              <div className="tgl-row" key={kk}><div><b>{t}</b><small>{d}</small></div><Toggle on={db.notif[kk]} label={t} onChange={on => { s.setNotif(kk, on); toast(on ? 'Turned on' : 'Turned off'); }} /></div>
            ))}</div>
          </>}
          {k === 'look' && <>
            <h3>Appearance</h3><p>Choose how Pulse looks on this device.</p>
            <div className="theme-opts" role="radiogroup" aria-label="Theme">
              {([['light', 'Light', 'linear-gradient(135deg,#F1F2F4 50%,#fff 50%)'], ['dark', 'Dark', 'linear-gradient(135deg,#0B0C0F 50%,#16181D 50%)'], ['system', 'Match device', 'linear-gradient(90deg,#F1F2F4 50%,#0B0C0F 50%)']] as [Theme, string, string][]).map(([v, l, bg]) => (
                <button key={v} role="radio" aria-checked={theme === v} className={clsx('theme-o', theme === v && 'on')} onClick={() => s.setTheme(v)}><i style={{ background: bg }} />{l}</button>
              ))}
            </div>
          </>}
        </section>
      </div>
    </>
  );
}
