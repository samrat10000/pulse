import clsx from 'clsx';
import { Check, Dumbbell, Flame, IndianRupee, LogOut, Phone, QrCode, RefreshCw, ScanLine, Snowflake } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/Logo';
import { MembershipCard } from '@/components/MembershipCard';
import { QR } from '@/components/QR';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Ring } from '@/components/ui/Ring';
import { checkedInToday, crowd, mBest, mMonth, mStreak, planOf, timeOf, weekdayIdx } from '@/data/rules';
import { dayDate } from '@/lib/dates';
import { reduced } from '@/lib/env';
import { fmtDate, money } from '@/lib/format';
import { toast, useDB, useStore } from '@/store/useStore';

export type Tab = 'home' | 'pass' | 'visits' | 'plan';
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function Home({ go }: { go: (t: Tab) => void }) {
  const db = useDB();
  const c = db.member, streak = mStreak(c), len = c.end - c.start, left = Math.max(0, c.end);
  const todayIdx = weekdayIdx(0);
  const wk = DAYS.map((d, i) => { const off = i - todayIdx; return { d, on: c.visitDays!.has(off), today: off === 0, fut: off > 0 }; });
  const cr = crowd(db), coach = c.trainer.split(' ')[0];
  return (
    <>
      <div className="ma-hero">
        <div className="ma-streak"><span className="fl"><Flame size={26} strokeWidth={2} /></span><div><b className="num">{streak}-day streak</b><small>Best ever: {mBest(c)} days. {streak >= 3 ? "Don't break it now." : 'Come in today to start one.'}</small></div></div>
        <div className="ma-week" aria-label="This week">{wk.map((x, i) => <div key={i} className={clsx(x.on && 'on', x.today && 'today', x.fut && 'fut')}><i>{x.on && <Check size={13} strokeWidth={3} />}</i><span>{x.d}</span></div>)}</div>
      </div>
      <div className="ma-row">
        <button className="ma-card ma-plan" onClick={() => go('plan')} aria-label={`${left} days left on your ${c.plan} plan`}>
          <Ring rings={[{ v: left / len, c: '#3D7BF7' }]} size={92} w={9} /><div className="mp-c"><b className="num">{left}</b><span>days left</span></div><small>{c.plan} plan</small>
        </button>
        <div className="ma-card ma-crowd"><span className="muted">At the gym now</span><b>{cr.label}</b><div className="cr-bar"><i style={{ width: `${Math.max(6, cr.pct)}%` }} /></div><small className="num">{cr.n} people checked in this hour</small></div>
      </div>
      <div className="ma-card ma-pt">
        <div className="row" style={{ gap: 12 }}><Avatar name={c.trainer} /><div style={{ flex: 1, minWidth: 0 }}><b>Personal training with {coach}</b><small>Next session tomorrow, 7:00 AM</small></div></div>
        <div className="pt-dots" aria-label={`${c.ptUsed} of ${c.ptTotal} sessions used`}>{Array.from({ length: c.ptTotal! }, (_, i) => <i key={i} className={i < c.ptUsed! ? 'on' : ''} />)}</div>
        <div className="row" style={{ justifyContent: 'space-between' }}><small className="muted num">{c.ptUsed} of {c.ptTotal} sessions used</small><button className="link" onClick={() => toast(`${coach} will confirm your session on WhatsApp`)}>Reschedule</button></div>
      </div>
      <div className="ma-card ma-stats">
        <div><b className="num">{mMonth(c)}</b><span>visits in 30 days</span></div>
        <div><b className="num">#4</b><span>in {new Date().toLocaleDateString('en-IN', { month: 'long' })} challenge</span></div>
        <div><b className="num">{Math.round(c.visitDays!.size / 16 * 10) / 10}</b><span>visits a week</span></div>
      </div>
      <Button variant="primary" className="ma-cta" icon={QrCode} onClick={() => go('pass')}>Show my pass</Button>
    </>
  );
}

export function Pass() {
  const db = useDB();
  const c = db.member, done = checkedInToday(db, c.id);
  return (
    <>
      <div className="ma-pass">
        <div className="mp-top"><div><Logo size={30} /><b>{db.gym.name}</b></div><span className="mc-id">{c.memberNo}</span></div>
        <div className="mp-qr"><QR text={c.memberNo} px={210} /></div>
        <b className="mp-name">{c.name}</b><small>{c.plan} member · valid till {fmtDate(c.end, true)}</small>
        <div className="mp-perf"><span><Flame size={13} strokeWidth={2} /> {mStreak(c)}-day streak</span><span><Dumbbell size={13} /> PT {c.ptUsed}/{c.ptTotal}</span></div>
      </div>
      <p className="ma-hint">Show this code at the front desk. Turn your screen brightness up if it doesn't scan.</p>
      {done
        ? <div className="ma-done" role="status"><Check size={18} strokeWidth={2.6} /><div><b>You're checked in</b><small>{timeOf(done.at)} today. Have a strong session.</small></div></div>
        : <Button variant="primary" className="ma-cta" icon={ScanLine} onClick={() => { useStore.getState().checkin(c.id); toast('Checked in. Have a strong session'); }}>Check in now</Button>}
    </>
  );
}

export function Visits() {
  const db = useDB();
  const c = db.member, v = c.visitDays!;
  const startOff = -weekdayIdx(0) - 28, cells = Array.from({ length: 35 }, (_, i) => startOff + i);
  const dow = [0, 0, 0, 0, 0, 0, 0]; v.forEach(d => dow[weekdayIdx(d)]++);
  const dmax = Math.max(1, ...dow), inWin = cells.filter(o => v.has(o)).length;
  return (
    <>
      <div className="ma-card">
        <div className="row" style={{ justifyContent: 'space-between' }}><b>Last 5 weeks</b><span className="muted num">{inWin} visit{inWin === 1 ? '' : 's'}</span></div>
        <div className="cal" role="grid" aria-label="Visits in the last 5 weeks">
          {DAYS.map((d, i) => <span key={'h' + i} className="dh">{d}</span>)}
          {cells.map(off => <span key={off} className={clsx('cd', v.has(off) && 'on', off === 0 && 'today', off > 0 && 'fut')} aria-label={`${dayDate(off).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}${v.has(off) ? ', visited' : ''}`}>{dayDate(off).getDate()}</span>)}
        </div>
      </div>
      <div className="ma-card ma-stats">
        <div><b className="num">{mStreak(c)}</b><span>current streak</span></div>
        <div><b className="num">{mBest(c)}</b><span>best streak</span></div>
        <div><b className="num">{v.size}</b><span>total visits</span></div>
      </div>
      <div className="ma-card"><b>When you train</b>
        <div className="dow">{dow.map((n, i) => <div key={i}><i style={{ height: `${Math.max(6, n / dmax * 100)}%` }} /><span>{DAYS[i]}</span></div>)}</div>
        <small className="muted">You come most on {['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'][dow.indexOf(Math.max(...dow))]}.</small>
      </div>
    </>
  );
}

export function Plan({ onRenew, onLogout }: { onRenew: () => void; onLogout: () => void }) {
  const db = useDB();
  const s = useStore.getState();
  const c = db.member, pays = db.payments.filter(p => p.clientId === c.id).sort((a, b) => b.date - a.date || b.no.localeCompare(a.no));
  return (
    <>
      <MembershipCard c={c} qr={false} style={{ marginTop: 0 }} />
      <Button variant="primary" className="ma-cta" icon={RefreshCw} onClick={onRenew}>Renew or upgrade</Button>
      <div className="ma-card"><b>Includes</b>
        <ul className="incl">
          <li><Check size={14} strokeWidth={2.4} />Full gym floor, {db.gym.hours}</li>
          <li><Check size={14} strokeWidth={2.4} />{c.ptTotal} personal training sessions with {c.trainer.split(' ')[0]}</li>
          <li><Check size={14} strokeWidth={2.4} />Group classes: Zumba, yoga, HIIT</li>
          <li><Check size={14} strokeWidth={2.4} />Freeze up to 30 days a year</li>
        </ul>
      </div>
      <div className="ma-card"><b>Payments</b>
        {pays.map(p => (
          <div key={p.no} className="pay" role="button" tabIndex={0} style={{ cursor: 'pointer' }} onClick={() => s.openModal({ k: 'receipt', no: p.no })} onKeyDown={e => { if (e.key === 'Enter') s.openModal({ k: 'receipt', no: p.no }); }}>
            <span className="tl-ic"><IndianRupee size={14} /></span><div><b>{p.item}</b><small>{fmtDate(p.date, true)} · {p.mode}</small></div><span className="r">{money(p.amount)}</span>
          </div>
        ))}
      </div>
      <div className="ma-card ma-acc">
        <button onClick={() => toast('Freeze request sent to the front desk')}><Snowflake size={16} />Freeze my membership</button>
        <button onClick={() => toast(db.gym.phone)}><Phone size={16} />Call the gym</button>
        <button onClick={onLogout}><LogOut size={16} />Sign out</button>
      </div>
    </>
  );
}

/** bottom sheet: pick a plan, pay with UPI (simulated), get a real Renewal payment */
export function RenewSheet({ onClose }: { onClose: () => void }) {
  const db = useDB();
  const c = db.member;
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState(planOf(db, c.plan).k);
  const [phase, setPhase] = useState<'pick' | 'paying' | { no: string; end: number; price: number }>('pick');
  useEffect(() => { const a = requestAnimationFrame(() => setOpen(true)); return () => cancelAnimationFrame(a); }, []);
  const close = () => { setOpen(false); setTimeout(onClose, reduced ? 0 : 300); };
  const p = planOf(db, pick);
  const pay = () => {
    setPhase('paying');
    setTimeout(() => { const pmt = useStore.getState().memberRenew(pick); setPhase({ no: pmt.no, end: useStore.getState().db.member.end, price: p.price }); }, reduced ? 50 : 1600);
  };
  return (
    <div className={clsx('ma-sheet-wrap', open && 'open')}>
      <div className="ma-sheet-bd" onClick={phase === 'paying' ? undefined : close} />
      <div className="ma-sheet" role="dialog" aria-modal="true" aria-label="Renew your plan">
        <i className="grab" />
        {phase === 'pick' && <>
          <h3>Renew your plan</h3>
          <p className="muted">Starts when your current plan ends on {fmtDate(c.end, true)}.</p>
          <div className="ma-plans" role="radiogroup" aria-label="Plans">
            {db.plans.map(x => { const save = Math.round(db.plans[0].price * x.months - x.price); return (
              <button key={x.k} role="radio" aria-checked={pick === x.k} className={clsx(pick === x.k && 'on')} onClick={() => setPick(x.k)}>
                <span><b>{x.k}</b><small>{money(Math.round(x.price / x.months))}/month</small></span>{save > 0 && <em>Save {money(save)}</em>}<strong className="num">{money(x.price)}</strong>
              </button>
            ); })}
          </div>
          <Button variant="primary" className="ma-cta" onClick={pay}>Pay {money(p.price)} with UPI</Button>
          <small className="muted" style={{ display: 'block', textAlign: 'center', marginTop: 8 }}>GST included · receipt sent on WhatsApp</small>
        </>}
        {phase === 'paying' && <div className="ma-paying" role="status"><div className="spin" /><b>Waiting for UPI</b><small>Approve {money(p.price)} in your UPI app</small></div>}
        {typeof phase === 'object' && (
          <div className="ma-paying ok" role="status">
            <div className="done-ic"><Check size={28} strokeWidth={2.4} /></div>
            <b>Renewed till {fmtDate(phase.end, true)}</b><small>{money(phase.price)} paid · {phase.no}</small>
            <Button variant="primary" className="ma-cta" onClick={close}>Done</Button>
          </div>
        )}
      </div>
    </div>
  );
}
