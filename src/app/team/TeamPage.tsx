import clsx from 'clsx';
import { Plus, Trophy, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { PageHead, pressable } from '@/components/bits';
import { Avatar } from '@/components/ui/Avatar';
import { Button, IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Ring } from '@/components/ui/Ring';
import { Select } from '@/components/ui/Select';
import { teamStats } from '@/data/rules';
import type { TeamMember } from '@/data/types';
import { EMAIL_RE, parseValue } from '@/import/validate';
import { money } from '@/lib/format';
import { toast, useDB, useStore } from '@/store/useStore';

export function NewRep() {
  const s = useStore.getState();
  const [f, setF] = useState({ name: '', email: '', role: 'Membership advisor' as TeamMember['role'], target: '80000' });
  const [err, setErr] = useState('');
  const save = () => {
    const name = f.name.trim(), email = f.email.trim(), target = parseValue(f.target);
    if (!name) return setErr('Add a name.');
    if (email && !EMAIL_RE.test(email)) return setErr('That email looks incomplete.');
    if (!target) return setErr('Add a monthly target in rupees.');
    s.addRep({ name, email, role: f.role, target });
    s.closeDrawer();
    toast(`${name} added to the team`);
  };
  const enter = (e: React.KeyboardEvent) => { if (e.key === 'Enter') save(); };
  return (
    <>
      <div className="dw-head"><IconButton icon={X} label="Close" onClick={s.closeDrawer} /></div>
      <div className="dw-id"><div><h2>Add team member</h2><p>They can be assigned leads straight away.</p></div></div>
      <div className="form">
        <label>Full name<input data-autofocus autoComplete="off" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} onKeyDown={enter} /></label>
        <label>Work email<input type="email" autoComplete="off" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} onKeyDown={enter} /></label>
        <div className="f2">
          <label>Role<Select value={f.role} onChange={v => setF({ ...f, role: v as TeamMember['role'] })} options={['Membership advisor', 'Sales manager', 'Front desk']} /></label>
          <label>Monthly target (₹)<input inputMode="numeric" value={f.target} onChange={e => setF({ ...f, target: e.target.value })} onKeyDown={enter} /></label>
        </div>
        <p className="f-err" role={err ? 'alert' : undefined}>{err}</p>
        <Button variant="primary" onClick={save}>Add team member</Button>
      </div>
    </>
  );
}

export default function TeamPage() {
  const db = useDB();
  const me = useStore(s => s.me)!;
  const nav = useNavigate();
  const s = useStore.getState();
  const st = teamStats(db), tot = st.reduce((a, t) => a + t.revenue, 0);
  const open = (id: string) => { s.setUi({ lOwner: id, lTab: 'All', lPage: 1, lView: 'table' }); nav('/app/leads'); };
  return (
    <>
      <PageHead title="Sales team" sub={`Last 30 days · ${st.reduce((a, t) => a + t.won, 0)} new members, ${money(tot)} sold`}>
        {me.key === 'owner' && <Button variant="primary" icon={Plus} onClick={() => s.openDrawer({ k: 'newRep' })}>Add team member</Button>}
      </PageHead>
      <div className="team">
        {st.map((t, i) => (
          <div key={t.id} className="card rep" {...pressable(() => open(t.id))} aria-label={`${t.name}, rank ${i + 1}. Open their leads`}>
            <div className="rep-h"><Avatar name={t.name} size="lg" /><div><b>{t.name}</b><small>{t.role}</small></div><span className={clsx('rank', i === 0 && 'r1')} title="Rank, last 30 days">{i + 1}</span></div>
            <div className="rep-b">
              <div className="rep-ring"><Ring rings={[{ v: t.pct, c: i === 0 ? '#D99A00' : '#3D7BF7' }]} size={84} w={9} /><b>{Math.round(t.pct * 100)}%</b></div>
              <div className="rep-stats">
                <div><span>Sold</span><b>{money(t.revenue, true)}</b></div><div><span>New members</span><b>{t.won}</b></div>
                <div><span>Open leads</span><b>{t.open}</b></div><div><span>Conversion</span><b>{t.rate}%</b></div>
              </div>
            </div>
            <div className="rep-f"><span>30-day target {money(t.target, true)}</span><span>{t.due ? <span className="due over">{t.due} follow-ups due</span> : <span className="due later">All followed up</span>}</span></div>
          </div>
        ))}
      </div>
      <Card style={{ marginTop: 14 }}>
        <div className="card-h" style={{ paddingBottom: 6 }}><div className="card-t"><span className="t-ic"><Trophy size={14} /></span>Leaderboard</div></div>
        <div className="tbl-wrap"><table className="table">
          <thead><tr><th>#</th><th>Team member</th><th>Open leads</th><th>Trials</th><th>Follow-ups due</th><th>New members</th><th>Conversion</th><th>Sold</th><th>Target</th></tr></thead>
          <tbody>{st.map((t, i) => (
            <tr key={t.id} tabIndex={0} onClick={() => open(t.id)} onKeyDown={e => { if (e.key === 'Enter') open(t.id); }}>
              <td><span className={clsx('rank', i === 0 && 'r1')}>{i + 1}</span></td>
              <td><div className="person"><Avatar name={t.name} /><div><b>{t.name}</b><small>{t.role}</small></div></div></td>
              <td className="num">{t.open}</td><td className="num">{t.trials}</td>
              <td>{t.due ? <span className="due over">{t.due}</span> : <span className="muted">0</span>}</td>
              <td className="num">{t.won}</td><td className="num">{t.rate}%</td>
              <td className="num" style={{ fontWeight: 600 }}>{money(t.revenue)}</td>
              <td><span className="row gap6"><span className="lb-bar"><i style={{ width: `${Math.min(100, t.pct * 100).toFixed(0)}%` }} /></span><span className="num muted" style={{ fontSize: 12 }}>{Math.round(t.pct * 100)}%</span></span></td>
            </tr>
          ))}</tbody>
        </table></div>
      </Card>
    </>
  );
}
