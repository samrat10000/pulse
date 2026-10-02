import clsx from 'clsx';
import { IndianRupee, MessageCircle, Phone, RefreshCw, Snowflake, X } from 'lucide-react';
import { StatusPill, Timeline } from '@/components/bits';
import { MembershipCard } from '@/components/MembershipCard';
import { peopleOpts } from '@/components/options';
import { Avatar } from '@/components/ui/Avatar';
import { Button, IconButton } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { checkedInToday, clientStatus, findClient, repName } from '@/data/rules';
import { TRAINERS } from '@/data/seed';
import type { Client } from '@/data/types';
import { ago, fmtDate, hash, money } from '@/lib/format';
import { rng } from '@/lib/rng';
import { can, toast, useDB, useStore } from '@/store/useStore';

/** 12-week attendance grid; deterministic per member */
function Attendance({ c, inToday }: { c: Client; inToday: boolean }) {
  const r = rng(hash(c.id) + 9);
  const cols = Array.from({ length: 12 }, (_, w) => {
    const weekOff = -(11 - w) * 7;
    return Array.from({ length: 7 }, (_, d) => {
      const off = weekOff + d - 6;
      // today's check-in, and Simran's real history, always show
      if (off === 0 && inToday) return 3;
      if (c.visitDays) return c.visitDays.has(off) ? 3 : 0;
      const active = off >= c.start && off <= Math.min(0, c.end) && !c.frozen;
      const v = active ? r() * (c.visits / 14) : 0;
      return v > .9 ? 3 : v > .55 ? 2 : v > .3 ? 1 : 0;
    });
  });
  return (
    <>
      <div className="att" role="img" aria-label={`Attendance over the last 12 weeks, ${c.visits} visits in 30 days`}>{cols.map((col, i) => <div key={i}>{col.map((lv, j) => <i key={j} className={lv ? 'l' + lv : ''} />)}</div>)}</div>
      <div className="att-leg"><span>12 weeks ago</span><span>This week</span></div>
    </>
  );
}

export default function ClientDrawer({ id }: { id: string }) {
  const db = useDB();
  const me = useStore(s => s.me);
  const s = useStore.getState();
  const c = findClient(db, id);
  if (!c) return <div className="dw-head"><IconButton icon={X} label="Close" onClick={s.closeDrawer} /></div>;
  const st = clientStatus(c);
  const pays = db.payments.filter(p => p.clientId === c.id).sort((x, y) => y.date - x.date || y.no.localeCompare(x.no));
  const remind = () => toast(`Renewal reminder sent to ${c.name} on WhatsApp`);
  const since = c.since <= 0 ? 'Today' : fmtDate(-c.since, true);
  return (
    <>
      <div className="dw-head">
        <IconButton icon={X} label="Close" onClick={s.closeDrawer} />
        <div>
          <IconButton icon={Phone} label="Call" onClick={() => toast(`Calling ${c.name} on ${c.phone}`)} />
          <IconButton icon={MessageCircle} label="WhatsApp" onClick={() => toast(`WhatsApp chat opened with ${c.name}`)} />
        </div>
      </div>
      <div className="dw-id">
        <Avatar name={c.name} size="lg" />
        <div style={{ minWidth: 0 }}><h2>{c.name}</h2><p className="num">{c.phone}</p>
          <div className="row gap6 mt8"><StatusPill s={st} />{c.pt && <span className="tag">Personal training</span>}{!!c.imported && <span className="tag">Imported</span>}</div></div>
      </div>
      <MembershipCard c={c} />
      <div className="dw-actions">
        <Button variant="primary" icon={RefreshCw} onClick={() => s.startConv('renew', c)}>Renew</Button>
        <Button icon={Snowflake} disabled={st === 'Expired'} onClick={() => { s.toggleFreeze(c.id); toast(!c.frozen ? `${c.name}'s membership is active again` : `${c.name}'s membership is frozen`); }}>{c.frozen ? 'Unfreeze' : 'Freeze'}</Button>
        <Button icon={MessageCircle} onClick={remind}>Remind</Button>
      </div>
      {c.due > 0 && (
        <div className="due-bar">
          <div><b>{money(c.due)} due</b><small>Paid {money(c.paid)} of {money(c.total)}</small></div>
          {can(me, 'payments') ? <Button variant="primary" size="sm" onClick={() => s.openDrawer({ k: 'collect', id: c.id })}>Collect</Button> : <Button size="sm" onClick={remind}>Remind</Button>}
        </div>
      )}
      <div className="dw-stats">
        <div><span>Visits, 30 days</span><b>{c.visits}</b></div>
        <div><span>Last visit</span><b>{c.visits ? ago(c.lastVisit) : 'None'}</b></div>
        <div><span>Paid</span><b>{money(c.paid)}</b></div>
      </div>
      <div className="dw-sec"><h4>Attendance</h4><Attendance c={c} inToday={!!checkedInToday(db, c.id)} /></div>
      <div className="dw-sec"><h4>Details</h4>
        <dl className="kv">
          <dt>Email</dt><dd>{c.email || <span className="muted">None</span>}</dd>
          <dt>Goal</dt><dd>{c.goal}</dd>
          <dt>Trainer</dt><dd><Select label="Trainer" value={c.trainer} options={peopleOpts(TRAINERS.includes(c.trainer) ? TRAINERS : [c.trainer, ...TRAINERS])} onChange={v => { s.setTrainer(c.id, v); toast(`${c.name} will train with ${v}`); }} /></dd>
          <dt>Came from</dt><dd>{c.source}</dd>
          <dt>Sold by</dt><dd><span className="row gap6"><Avatar name={repName(db, c.soldBy)} size="xs" />{repName(db, c.soldBy)}</span></dd>
          <dt>Member since</dt><dd>{since}</dd>
        </dl>
      </div>
      <div className="dw-sec"><h4>Payments</h4>
        {pays.length ? pays.map(x => (
          <div key={x.no} className={clsx('pay')} style={{ cursor: 'pointer' }} role="button" tabIndex={0} onClick={() => s.openModal({ k: 'receipt', no: x.no })} onKeyDown={e => { if (e.key === 'Enter') s.openModal({ k: 'receipt', no: x.no }); }}>
            <span className="tl-ic"><IndianRupee size={14} /></span><div><b>{x.item}</b><small>{fmtDate(x.date, true)} · {x.mode} · {x.no}</small></div><span className="r">{money(x.amount)}</span>
          </div>
        )) : <p className="muted" style={{ fontSize: 13 }}>No payments recorded yet.</p>}
      </div>
      <Timeline id={c.id} acts={c.imported && c.since === 0 ? [{ ic: 'upload', t: 'Imported', p: 'Added from a file import', d: 0 }] : [{ ic: 'card', t: 'Membership started', p: `${c.plan} plan, ${money(c.paid)}`, d: -c.start }]} by={repName(db, c.soldBy)} />
    </>
  );
}
