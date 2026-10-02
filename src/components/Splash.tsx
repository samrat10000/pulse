import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { activeCount, checkinsToday, dueToday, duesList, ending7, expiringCount, mMonth, mStreak, revenue30, teamStats } from '@/data/rules';
import { reduced } from '@/lib/env';
import { money } from '@/lib/format';
import { useStore } from '@/store/useStore';

/** three plates per side, largest nearest the collar */
const plates = (side: -1 | 1) => ([[0, 128, 22], [26, 104, 18], [48, 78, 14]] as const).map(([dx, h, w], i) => {
  const x = side < 0 ? 152 - dx - w : 348 + dx;
  return <rect key={side + '' + i} className={`plate p${i}`} style={{ '--from': `${side * 70}px` } as React.CSSProperties} x={x} y={80 - h / 2} width={w} height={h} rx={5} />;
});

/** welcome splash after every sign-in; any click, tap or key closes it, else it leaves after 2.3s */
export function Splash() {
  const n = useStore(s => s.splash);
  const [shown, setShown] = useState(0);
  const [out, setOut] = useState(false);
  const closing = useRef(false);
  const close = useRef(() => {});

  useEffect(() => {
    if (!n) return;
    setShown(n); setOut(false); closing.current = false;
    const done = close.current = () => {
      if (closing.current) return;
      closing.current = true; setOut(true);
      setTimeout(() => setShown(0), 450);
    };
    document.addEventListener('keydown', done, true);
    const t = setTimeout(done, reduced ? 1400 : 2300);
    return () => { clearTimeout(t); document.removeEventListener('keydown', done, true); };
  }, [n]);

  if (!shown) return null;
  const s = useStore.getState(), db = s.db, me = s.me;
  if (!me) return null;
  const first = me.name.split(' ')[0];
  const m = db.member;
  const line = me.key === 'member' ? `${mStreak(m)}-day streak and counting. Your session is waiting.`
    : me.key === 'desk' ? `${checkinsToday(db)} members checked in so far. Let's keep the floor moving.`
    : me.key === 'sales' ? `${dueToday(db, me)} follow-ups are waiting. Let's close some memberships.`
    : `${money(revenue30(db), true)} in the last 30 days. Let's make this month the best yet.`;
  const chips = me.key === 'member' ? [`${Math.max(0, m.end)} days left`, `PT ${m.ptUsed} of ${m.ptTotal}`, `${mMonth(m)} visits in 30 days`]
    : me.key === 'desk' ? [`${checkinsToday(db)} check-ins`, `${duesList(db).length} dues`, `${ending7(db).length} renewals`]
    : me.key === 'sales' ? [`${dueToday(db, me)} follow-ups`, `${db.leads.filter(l => l.owner === me.id && l.score >= 70 && l.stage !== 'Lost').length} hot leads`, `Rank #${teamStats(db).findIndex(x => x.id === me.id) + 1}`]
    : [`${activeCount(db)} active members`, `${dueToday(db, me)} follow-ups`, `${expiringCount(db)} renewals`];

  return (
    <div className={clsx('splash', out && 'out')} role="dialog" aria-label="Welcome" onPointerDown={() => close.current()}>
      <div className="sp-stripes" />
      <svg className="sp-pulse" viewBox="0 0 1200 200" preserveAspectRatio="none" aria-hidden="true"><path d="M0 100H430l30-60 40 130 40-150 36 110 22-30H1200" /></svg>
      <div className="sp-in">
        <svg className="sp-bar" viewBox="0 0 500 160" aria-hidden="true">
          <rect className="bar-line" x="30" y="76" width="440" height="8" rx="4" />
          <rect className="collar" x="168" y="66" width="10" height="28" rx="3" />
          <rect className="collar" x="322" y="66" width="10" height="28" rx="3" />
          {plates(-1)}{plates(1)}
        </svg>
        <small className="sp-eye">{db.gym.name} · {me.label}</small>
        <h1>Let's go, {first}.</h1>
        <p>{line}</p>
        <div className="sp-chips">{chips.map(c => <span key={c}>{c}</span>)}</div>
      </div>
      <div className="sp-skip">Click anywhere to skip</div>
      <i className="sp-prog" />
    </div>
  );
}
