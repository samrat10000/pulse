/* Dashboard blocks shared by the owner, sales and desk dashboards. */
import clsx from 'clsx';
import { Activity, Check, CircleAlert, Clock, IndianRupee, Layers, MessageCircle, Phone, Target, TrendingUp, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router';
import { DueChip, Empty, ExpDate, pressable } from '@/components/bits';
import { Avatar } from '@/components/ui/Avatar';
import { Button, IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Ring } from '@/components/ui/Ring';
import { Segmented } from '@/components/ui/Segmented';
import { atRisk, checkinsToday, duesList, hLabel, hourly, isDue, joined30, mine, renewals30, revenue30, revenueSeries, teamStats } from '@/data/rules';
import { SRC_C, STAGES, TARGET, TARGET_MEMBERS, TARGET_RENEWALS } from '@/data/seed';
import type { Lead } from '@/data/types';
import { money } from '@/lib/format';
import { can, toast, useDB, useStore } from '@/store/useStore';

const full = { height: '100%' };

export function RevenueCard() {
  const db = useDB();
  const n = useStore(s => s.ui.range);
  const data = revenueSeries(db).slice(-n), max = 1000000;
  const ms = Array.from({ length: n }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (n - 1 - i)); return { m: d.toLocaleDateString('en-IN', { month: 'short' }), y: d.getFullYear() }; });
  const cols = ['#EFA9D3', '#B9A9F2', '#F2C94C', '#9DC2F7'];
  const total = data.reduce((a, b) => a + b, 0);
  return (
    <Card style={full} title="Membership revenue" icon={TrendingUp}
      right={<Segmented size="sm" label="Range" value={n} onChange={v => useStore.getState().setUi({ range: v })} options={[{ value: 12, label: '12 months' }, { value: 6, label: '6 months' }]} />}>
      <div className="chart-meta"><span className="big">{money(total)}</span><span className="kpi-delta up" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}>+11.4% vs last year</span></div>
      <div className="bars-wrap">
        <div className="grid-lines">{['₹10L', '₹7.5L', '₹5L', '₹2.5L', '₹0'].map(l => <div key={l}><span>{l}</span></div>)}</div>
        <div className="bars" role="img" aria-label={`Monthly membership revenue, ${money(total)} over ${n} months`} key={n}>
          {data.map((v, i) => (
            <div className="bar-col" key={i}>
              <div className={clsx('bar', i === n - 1 && 'cur')} tabIndex={0} style={{ '--h': `${Math.min(100, v / max * 100).toFixed(1)}%`, '--c': cols[i % 4], '--d': `${i * 40}ms` } as React.CSSProperties}>
                <div className="tip">{money(v)}<small>{i === n - 1 ? 'Last 30 days' : `${ms[i].m} ${ms[i].y}`}</small></div>
              </div>
              <span className="bar-l">{ms[i].m}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function TargetsCard() {
  const db = useDB();
  const r30v = revenue30(db), rev = r30v / TARGET, j = joined30(db), mem = j / TARGET_MEMBERS, r30 = renewals30(db), ren = r30 / TARGET_RENEWALS;
  const row = (c: string, label: string, pct: number, b: React.ReactNode) => (
    <div><i style={{ background: c }} /><span>{label}</span><em style={{ color: c }}>{Math.round(pct * 100)}%</em><b>{b}</b></div>
  );
  return (
    <Card style={full} title="This month's targets" icon={Target}>
      <div className="rings">
        <Ring rings={[{ v: rev, c: '#3D7BF7' }, { v: mem, c: '#D9479B' }, { v: ren, c: '#15A05A' }]} size={150} w={13} />
        <div className="ring-leg">
          {row('#3D7BF7', 'Revenue', rev, <>{money(r30v, true)} <span className="of">/ {money(TARGET, true)}</span></>)}
          {row('#D9479B', 'New members', mem, <>{j} <span className="of">/ {TARGET_MEMBERS}</span></>)}
          {row('#15A05A', 'Renewals', ren, <>{r30} <span className="of">/ {TARGET_RENEWALS}</span></>)}
        </div>
      </div>
    </Card>
  );
}

export function FunnelCard({ title = 'Lead funnel' }: { title?: string }) {
  const db = useDB();
  const me = useStore(s => s.me);
  const nav = useNavigate();
  const f = mine(me);
  const counts = STAGES.map(s => ({ k: s.k as string, c: s.c, n: db.leads.filter(l => l.stage === s.k && f(l)).length }));
  counts.push({ k: 'Joined, 30d', c: '#15A05A', n: joined30(db, c => me?.key !== 'sales' || c.soldBy === me.id) });
  const max = Math.max(1, ...counts.map(x => x.n));
  return (
    <Card style={full} title={title} icon={Layers} right={<button className="link" onClick={() => { useStore.getState().setUi({ lView: 'board' }); nav('/app/leads'); }}>Open board</button>}>
      <div className="funnel">
        {counts.map((x, i) => (
          <div className="fn" key={x.k}><span>{x.k}</span><div className="fn-bar"><i style={{ width: `${Math.max(4, x.n / max * 100)}%`, '--c': x.c, '--d': `${i * 60}ms` } as React.CSSProperties} /></div><b>{x.n}</b></div>
        ))}
      </div>
    </Card>
  );
}

export function SourceCard() {
  const db = useDB();
  const counts = db.sources.map(s => ({ k: s, n: db.leads.filter(l => l.source === s && l.stage !== 'Lost').length })).filter(x => x.n).sort((a, b) => b.n - a.n);
  const total = counts.reduce((a, b) => a + b.n, 0), C = 2 * Math.PI * 70;
  let acc = 0;
  return (
    <Card style={full} title="Where leads come from" icon={Target}>
      <div className="donut-wrap">
        <svg className="donut" viewBox="0 0 180 180" role="img" aria-label={`Leads by source: ${counts.map(x => `${x.k} ${x.n}`).join(', ')}`}>
          {counts.map(x => { const len = x.n / total * C, off = acc; acc += len; return <circle key={x.k} cx="90" cy="90" r="70" fill="none" stroke={SRC_C[x.k] || '#8A94A6'} strokeWidth="20" strokeDasharray={`${Math.max(0, len - 2.5).toFixed(1)} ${C.toFixed(1)}`} strokeDashoffset={(-off).toFixed(1)} transform="rotate(-90 90 90)" />; })}
        </svg>
        <div className="donut-c"><b>{total}</b><span>open leads</span></div>
      </div>
      <div className="legend">{counts.map(x => <div key={x.k}><i style={{ background: SRC_C[x.k] || '#8A94A6' }} />{x.k}<b>{Math.round(x.n / total * 100)}%</b></div>)}</div>
    </Card>
  );
}

export function FollowCard() {
  const db = useDB();
  const me = useStore(s => s.me);
  const s = useStore.getState();
  const list = db.leads.filter(l => mine(me)(l) && isDue(l)).sort((a, b) => a.follow! - b.follow! || b.score - a.score);
  const done = (l: Lead) => { s.followDone(l.id); toast(`${l.name} followed up, next in 3 days`); };
  return (
    <Card style={full} title={me?.key === 'sales' ? 'My follow-ups' : 'Follow-ups due'} icon={Phone} right={<span className="muted" style={{ fontSize: 12.5 }}>{list.length} left</span>}>
      <div className="list">
        {list.length ? list.slice(0, 6).map(l => (
          <div className="fu" key={l.id} {...pressable(() => s.openDrawer({ k: 'lead', id: l.id }))}>
            <Avatar name={l.name} />
            <div className="li-main"><div className="li-t">{l.name}</div><div className="li-s">{l.interest} · {l.stage}</div></div>
            <DueChip d={l.follow} />
            <div className="mini-act" onClick={e => e.stopPropagation()}>
              <IconButton icon={Phone} size="sm" label={`Call ${l.name}`} onClick={() => toast(`Calling ${l.name} on ${l.phone}`)} />
              <IconButton icon={Check} size="sm" label="Mark followed up" onClick={() => done(l)} />
            </div>
          </div>
        )) : <Empty compact icon={Check} title="All caught up" text="No follow-ups due today." />}
      </div>
    </Card>
  );
}

export function ExpiringCard() {
  const db = useDB();
  const nav = useNavigate();
  const s = useStore.getState();
  const soon = db.clients.filter(c => !c.frozen && c.end >= 0 && c.end <= 14).sort((a, b) => a.end - b.end);
  const gone = db.clients.filter(c => !c.frozen && c.end < 0 && c.end >= -7).sort((a, b) => b.end - a.end);
  return (
    <Card style={full} title="Memberships ending soon" icon={Clock} right={<button className="link" onClick={() => { s.setUi({ cTab: 'Expiring soon', cPage: 1 }); nav('/app/clients'); }}>View all</button>}>
      <table className="mini-table"><tbody>
        {[...soon, ...gone].slice(0, 6).map(c => (
          <tr key={c.id} {...pressable(() => s.openDrawer({ k: 'client', id: c.id }))}>
            <td><div className="co"><Avatar name={c.name} size="sm" /><div style={{ minWidth: 0 }}><b>{c.name}</b><small>{c.plan} · {c.visits} visits this month</small></div></div></td>
            <td><ExpDate c={c} withYear={false} /></td>
            <td className="r"><Button size="sm" icon={MessageCircle} aria-label={`Send reminder to ${c.name}`} onClick={e => { e.stopPropagation(); toast(`Renewal reminder sent to ${c.name} on WhatsApp`); }}><span className="lbl">Remind</span></Button></td>
          </tr>
        ))}
      </tbody></table>
    </Card>
  );
}

export function AtRiskCard() {
  const db = useDB();
  const s = useStore.getState();
  const list = atRisk(db);
  return (
    <Card style={full} title="Members at risk" icon={CircleAlert} iconStyle={{ background: 'var(--red-soft)', color: 'var(--red)', borderColor: 'transparent' }} right={<span className="muted" style={{ fontSize: 12.5 }}>{list.length} may not renew</span>}>
      <div className="list">
        {list.slice(0, 5).map(c => (
          <div className="fu" key={c.id} {...pressable(() => s.openDrawer({ k: 'client', id: c.id }))}>
            <Avatar name={c.name} />
            <div className="li-main"><div className="li-t">{c.name}</div><div className="li-s">{c.plan} · trains with {c.trainer.split(' ')[0]}</div></div>
            <span className="risk">{c.lastVisit >= 10 ? `No visit in ${c.lastVisit} days` : `Ends in ${c.end}d, ${c.visits} visits`}</span>
            <div className="mini-act" onClick={e => e.stopPropagation()}>
              <IconButton icon={MessageCircle} size="sm" label={`WhatsApp ${c.name}`} onClick={() => toast(`WhatsApp chat opened with ${c.name}`)} />
              <IconButton icon={Phone} size="sm" label={`Call ${c.name}`} onClick={() => toast(`Calling ${c.name} on ${c.phone}`)} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function CheckinChart({ big }: { big?: boolean }) {
  const db = useDB();
  const h = hourly(db), max = Math.max(8, ...h), now = new Date().getHours(), peak = h.indexOf(Math.max(...h)) + 5, n = checkinsToday(db);
  return (
    <Card style={full} title="Check-ins today" icon={Activity} right={<span className="live-dot">Live</span>}>
      <div className="chart-meta"><span className="big">{n}</span><span className="muted" style={{ fontSize: 13 }}>{n ? `members so far · busiest at ${hLabel(peak)}` : 'Doors open at 5:30 AM'}</span></div>
      <div className={clsx('hours', big && 'big')} role="img" aria-label={`Check-ins per hour today, ${n} so far`}>
        {h.map((v, i) => { const hr = i + 5; return (
          <div key={hr} className={clsx('hr', hr === now && 'cur', hr > now && 'fut')} title={`${v} check-ins at ${hLabel(hr)}`}>
            <i style={{ height: `${hr > now ? 4 : Math.max(4, v / max * 100)}%` }} />
            <span>{i % 3 === 0 ? (hr > 12 ? hr - 12 : hr) + (hr >= 12 ? 'p' : 'a') : ''}</span>
          </div>
        ); })}
      </div>
    </Card>
  );
}

export function TopReps() {
  const db = useDB();
  const me = useStore(s => s.me)!;
  const nav = useNavigate();
  const st = teamStats(db).slice(0, 5);
  const open = (id: string) => { useStore.getState().setUi({ lOwner: id, lTab: 'All', lPage: 1, lView: 'table' }); nav('/app/leads'); };
  return (
    <Card style={full} title="Top performers" icon={Trophy} right={can(me, 'team') && <button className="link" onClick={() => nav('/app/team')}>Sales team</button>}>
      <div className="list">
        {st.map((t, i) => (
          <div key={t.id} className={clsx('li', t.id === me.id && 'me')} {...pressable(() => open(t.id))}>
            <span className={clsx('rank', i === 0 && 'r1')}>{i + 1}</span>
            <Avatar name={t.name} />
            <div className="li-main"><div className="li-t">{t.name}{t.id === me.id && <> <span className="tag">You</span></>}</div><div className="li-s">{t.won} joined · {t.rate}% conversion</div></div>
            <b className="num" style={{ fontWeight: 600 }}>{money(t.revenue, true)}</b>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function DuesCard() {
  const db = useDB();
  const me = useStore(s => s.me)!;
  const nav = useNavigate();
  const s = useStore.getState();
  const list = duesList(db).sort((a, b) => b.due - a.due);
  const pay = can(me, 'payments');
  return (
    <Card style={full} title="Dues to collect" icon={IndianRupee} right={pay && <button className="link" onClick={() => { s.setUi({ pTab: 'dues', pPage: 1 }); nav('/app/payments'); }}>View all</button>}>
      <div className="list">
        {list.length ? list.slice(0, 5).map(c => (
          <div className="fu" key={c.id} {...pressable(() => s.openDrawer({ k: 'client', id: c.id }))}>
            <Avatar name={c.name} />
            <div className="li-main"><div className="li-t">{c.name}</div><div className="li-s">Paid {money(c.paid)} of {money(c.total)}</div></div>
            <b className="num" style={{ color: 'var(--amber)', fontWeight: 600, whiteSpace: 'nowrap' }}>{money(c.due)}</b>
            {pay && <Button size="sm" onClick={e => { e.stopPropagation(); s.openDrawer({ k: 'collect', id: c.id }); }}>Collect</Button>}
          </div>
        )) : <Empty compact icon={Check} title="Nothing pending" text="Every member is fully paid." />}
      </div>
    </Card>
  );
}
