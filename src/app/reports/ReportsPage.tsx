import { Activity, CreditCard, Dumbbell, LayoutGrid, Mail, Send, Target, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import { Empty, PageHead, pressable } from '@/components/bits';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Ring } from '@/components/ui/Ring';
import { Segmented } from '@/components/ui/Segmented';
import { activeCount, cohorts, forecast, planOf, renewP } from '@/data/rules';
import { dayDate } from '@/lib/dates';
import { money } from '@/lib/format';
import { toast, useDB, useStore } from '@/store/useStore';

const BUCKETS: [string, number, string][] = [['0–3', 31, '#E0565C'], ['4–8', 58, '#E0A21B'], ['9–15', 79, '#5C98F1'], ['16+', 91, '#15A05A']];
const MIX_C = ['#EFA9D3', '#B9A9F2', '#F2C94C', '#3D7BF7'];

export default function ReportsPage() {
  const db = useDB();
  const me = useStore(s => s.me)!;
  const days = useStore(s => s.ui.fc);
  const s = useStore.getState();
  const F = forecast(db, days), max = Math.max(1, ...F.weeks.map(w => w.likely + w.risk));
  const ltv = Math.round(db.clients.reduce((a, c) => a + c.total, 0) / db.clients.length * 2.6);
  const save = F.list.filter(c => renewP(c) < .6).sort((a, b) => planOf(db, b.plan).price - planOf(db, a.plan).price).slice(0, 5);
  const C = useMemo(cohorts, []);
  const mix = db.plans.map(p => ({ k: p.k, n: db.clients.filter(c => c.plan === p.k && c.end >= 0).length, rev: db.payments.filter(x => x.date > -90 && x.item.startsWith(p.k)).reduce((a, x) => a + x.amount, 0) }));
  const mixMax = Math.max(1, ...mix.map(m => m.rev));
  const wk = (i: number) => dayDate(i * 7).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const full = { height: '100%' };

  return (
    <>
      <PageHead title="Reports" sub="What's coming in, who's staying, and where members slip away">
        <Button icon={Mail} onClick={() => toast(`Report emailed to ${me.email}`)}>Email me this</Button>
      </PageHead>
      <div className="grid">
        <div className="s8">
          <Card className="fc-card" title="Renewal forecast" icon={TrendingUp} right={<Segmented size="sm" label="Forecast window" value={days} onChange={v => s.setUi({ fc: v })} options={[30, 60, 90].map(v => ({ value: v as 30 | 60 | 90, label: `${v} days` }))} />}>
            <div className="fc-head">
              <div><span className="muted">Expected from renewals, next {days} days</span><b className="num">{money(F.total)}</b><small>{F.list.length} plans come up for renewal · {money(F.potential)} if every one renews</small></div>
              <div className="fc-split">
                <div><i style={{ background: 'var(--blue)' }} /><span>Likely</span><b className="num">{money(F.likely, true)}</b><small>{F.sure} members</small></div>
                <div><i className="striped" /><span>At risk</span><b className="num">{money(F.risk, true)}</b><small>{F.list.length - F.sure} members</small></div>
              </div>
            </div>
            <div className="fc-bars" key={days} role="img" aria-label={`Expected renewal revenue per week for the next ${days} days`}>
              {F.weeks.map((w, i) => (
                <div className="fc-col" key={i} title={`Week of ${wk(i)}: ${money(w.likely + w.risk)} expected from ${w.n} renewals`}>
                  <div className="fc-stack" style={{ '--h': `${((w.likely + w.risk) / max * 100).toFixed(1)}%`, '--d': `${i * 50}ms` } as React.CSSProperties}>
                    {w.risk > 0 && <i className="r" style={{ flex: w.risk, ...(w.likely ? {} : { borderRadius: 10 }) }} />}
                    {w.likely > 0 && <i className="l" style={{ flex: w.likely, ...(w.risk ? {} : { borderRadius: 10 }) }} />}
                  </div>
                  <span>{i % (days > 60 ? 2 : 1) === 0 ? wk(i) : ''}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="s4">
          <Card className="health" title="Retention health" icon={Activity}>
            <div className="h-ring"><Ring rings={[{ v: .76, c: '#15A05A' }]} size={150} w={14} /><div><b className="num">76%</b><span>renew their plan</span></div></div>
            <div className="h-stats">
              <div><span>Monthly churn</span><b className="num">4.1%</b><small className="up">0.6% better</small></div>
              <div><span>Lifetime value</span><b className="num">{money(ltv, true)}</b><small>per member</small></div>
              <div><span>Avg. stay</span><b className="num">14 mo</b><small>for annual plans</small></div>
              <div><span>Active now</span><b className="num">{activeCount(db)}</b><small>members</small></div>
            </div>
          </Card>
        </div>
        <div className="s8">
          <Card title="Members still active, by joining month" icon={LayoutGrid} right={<span className="muted" style={{ fontSize: 12.5 }}>% of each month's joiners</span>}>
            <div className="tbl-wrap"><table className="cohort">
              <thead><tr><th>Joined</th><th>People</th>{Array.from({ length: 8 }, (_, k) => <th key={k}>{k === 0 ? 'Start' : `Month ${k}`}</th>)}</tr></thead>
              <tbody>{C.map(c => (
                <tr key={c.label}><td>{c.label}</td><td className="num muted">{c.size}</td>
                  {Array.from({ length: 8 }, (_, k) => { const v = c.row[k]; const a = (v - 30) / 70; return v == null ? <td key={k} /> : <td key={k}><span className="ch num" style={{ '--a': a.toFixed(2), color: a >= .7 ? '#fff' : undefined } as React.CSSProperties}>{v}%</span></td>; })}
                </tr>
              ))}</tbody>
            </table></div>
          </Card>
        </div>
        <div className="s4">
          <Card style={full} title="Save these renewals" icon={Target} iconStyle={{ background: 'var(--amber-soft)', color: 'var(--amber)', borderColor: 'transparent' }}>
            <div className="list">
              {save.length ? save.map(c => (
                <div className="fu" key={c.id} {...pressable(() => s.openDrawer({ k: 'client', id: c.id }))}>
                  <Avatar name={c.name} />
                  <div className="li-main"><div className="li-t">{c.name}</div><div className="li-s">{c.plan} · ends {c.end === 0 ? 'today' : `in ${c.end}d`} · {c.lastVisit >= 10 ? `away ${c.lastVisit}d` : `${c.visits} visits`}</div></div>
                  <b className="num" style={{ color: 'var(--amber)', whiteSpace: 'nowrap' }}>{money(planOf(db, c.plan).price, true)}</b>
                </div>
              )) : <Empty compact title="Nobody at risk" text="Every upcoming renewal looks healthy." />}
            </div>
            {save.length > 0 && <div style={{ padding: '0 18px 18px' }}><Button variant="primary" icon={Send} style={{ width: '100%' }} onClick={() => s.openModal({ k: 'composer', seg: 'atrisk' })}>Message all at-risk members</Button></div>}
          </Card>
        </div>
        <div className="s6">
          <Card style={full} title="Attendance predicts renewals" icon={Dumbbell}>
            <p className="insight">Members who train 9+ times a month renew <b>{(79 / 31).toFixed(1)}×</b> more often than those who come 3 times or less. Getting someone in twice a week is the best renewal tool you have.</p>
            <div className="att-bars">{BUCKETS.map(([l, v, c], i) => <div key={l}><span>{l} visits / month</span><div className="ab"><i style={{ width: `${v}%`, '--c': c, '--d': `${i * 80}ms` } as React.CSSProperties} /></div><b className="num">{v}%</b></div>)}</div>
          </Card>
        </div>
        <div className="s6">
          <Card style={full} title="Revenue by plan, last 90 days" icon={CreditCard}>
            <div className="att-bars mix">{mix.map((m, i) => <div key={m.k}><span>{m.k}<small>{m.n} active</small></span><div className="ab"><i style={{ width: `${(m.rev / mixMax * 100).toFixed(0)}%`, '--c': MIX_C[i % 4], '--d': `${i * 80}ms` } as React.CSSProperties} /></div><b className="num">{money(m.rev, true)}</b></div>)}</div>
          </Card>
        </div>
      </div>
    </>
  );
}
