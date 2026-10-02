import clsx from 'clsx';
import { ChevronsUpDown, Download, MessageCircle, Plus, Search, Upload, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { Empty, ExpDate, PageHead, Pager, StatusPill } from '@/components/bits';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Select } from '@/components/ui/Select';
import { activeCount, clientStatus, expiringCount } from '@/data/rules';
import { TRAINERS } from '@/data/seed';
import type { Client, DB } from '@/data/types';
import { exportCSV } from '@/lib/csv';
import { fmtDate, hash, money } from '@/lib/format';
import { rng } from '@/lib/rng';
import { can, toast, useDB, useStore, type UI } from '@/store/useStore';
import { PER } from '../leads/LeadsPage';

const CTABS: [string, (c: Client) => boolean][] = [
  ['All', () => true], ['Active', c => clientStatus(c) === 'Active'], ['Expiring soon', c => clientStatus(c) === 'Expiring soon'],
  ['Expired', c => clientStatus(c) === 'Expired'], ['Frozen', c => c.frozen], ['Imported', c => !!c.imported],
];

function filtered(db: DB, U: UI) {
  const q = U.cQuery.trim().toLowerCase(), tab = (CTABS.find(t => t[0] === U.cTab) || CTABS[0])[1];
  const list = db.clients.filter(c => tab(c) && (U.cPlan === 'all' || c.plan === U.cPlan) && (U.cTrainer === 'all' || c.trainer === U.cTrainer) && (!q || `${c.name} ${c.phone} ${c.email} ${c.memberNo}`.toLowerCase().includes(q)));
  const { key, dir } = U.cSort;
  return list.sort((a, b) => { const x = a[key], y = b[key]; return (typeof x === 'string' ? x.localeCompare(y as string) : (x as number) - (y as number)) * dir; });
}

/** 8-bar mini sparkline of visits */
function VisBars({ c }: { c: Client }) {
  const r = rng(hash(c.id) + 3);
  return (
    <span className="vis" title={`${c.visits} visits in 30 days`} aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => { const v = c.end < 0 && i > 3 ? 0 : Math.round(r() * c.visits / 3); return <i key={i} className={v ? '' : 'z'} style={{ height: `${v ? Math.min(100, 25 + v * 12) : 18}%` }} />; })}
    </span>
  );
}

export default function ClientsPage() {
  const db = useDB();
  const U = useStore(s => s.ui);
  const me = useStore(s => s.me);
  const fresh = useStore(s => s.fresh);
  const nav = useNavigate();
  const s = useStore.getState();
  const list = filtered(db, U), pages = Math.max(1, Math.ceil(list.length / PER)), page = Math.min(U.cPage, pages);
  const rows = list.slice((page - 1) * PER, page * PER);
  const sel = U.cSel, allOn = rows.length > 0 && rows.every(c => sel.has(c.id));
  const setSel = (n: Set<string>) => s.setUi({ cSel: n });
  const toggle = (id: string) => { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSel(n); };
  const th = (k: UI['cSort']['key'], l: string) => (
    <th className={clsx(U.cSort.key === k && 'sorted')} aria-sort={U.cSort.key === k ? (U.cSort.dir > 0 ? 'ascending' : 'descending') : undefined}>
      <button onClick={() => s.setUi({ cSort: { key: k, dir: U.cSort.key === k ? -U.cSort.dir : (['visits', 'paid'].includes(k) ? -1 : 1) } })}>{l}<ChevronsUpDown size={12} /></button>
    </th>
  );
  const tabs = CTABS.filter(([k, f]) => k !== 'Imported' || db.clients.some(f));

  return (
    <>
      <PageHead title="Clients" sub={`${db.clients.length} members, ${activeCount(db)} active, ${expiringCount(db)} ending in the next 14 days`}>
        {can(me, 'import') && <Button icon={Upload} onClick={() => nav('/app/import')}>Import</Button>}
        <Button variant="primary" icon={Plus} onClick={() => s.startConv('new')}>Add client</Button>
      </PageHead>
      <div className="card">
        <div className="toolbar">
          <div className="tabs" role="tablist">{tabs.map(([k, f]) => <button key={k} role="tab" aria-selected={U.cTab === k} className={clsx(U.cTab === k && 'on')} onClick={() => s.setUi({ cTab: k, cPage: 1 })}>{k}<span>{db.clients.filter(f).length}</span></button>)}</div>
          <div className="tb-r">
            <label className="search"><Search size={15} /><input placeholder="Search name, phone or member ID" aria-label="Search clients" value={U.cQuery} onChange={e => s.setUi({ cQuery: e.target.value, cPage: 1 })} /></label>
            <Select label="Plan" value={U.cPlan} onChange={v => s.setUi({ cPlan: v, cPage: 1 })} options={[{ value: 'all', label: 'All plans' }, ...db.plans.map(p => p.k)]} />
            <Select label="Trainer" value={U.cTrainer} onChange={v => s.setUi({ cTrainer: v, cPage: 1 })} options={[{ value: 'all', label: 'All trainers' }, ...TRAINERS]} />
          </div>
        </div>
        {list.length ? (
          <>
            <div className="tbl-wrap"><table className="table">
              <thead><tr>
                <th style={{ width: 40 }}><Checkbox checked={allOn} label="Select page" onChange={() => { const n = new Set(sel); rows.forEach(c => allOn ? n.delete(c.id) : n.add(c.id)); setSel(n); }} /></th>
                {th('name', 'Member')}<th>Plan</th><th>Status</th>{th('end', 'Expires')}<th>Trainer</th>{th('visits', 'Visits, 30d')}{th('paid', 'Paid')}{th('since', 'Member since')}
              </tr></thead>
              <tbody>
                {rows.map(c => (
                  <tr key={c.id} className={clsx(sel.has(c.id) && 'sel', fresh.has(c.id) && 'fresh')} tabIndex={0} onClick={() => s.openDrawer({ k: 'client', id: c.id })} onKeyDown={e => { if (e.key === 'Enter' && e.target === e.currentTarget) s.openDrawer({ k: 'client', id: c.id }); }}>
                    <td onClick={e => e.stopPropagation()}><Checkbox checked={sel.has(c.id)} label={`Select ${c.name}`} onChange={() => toggle(c.id)} /></td>
                    <td><div className="person"><Avatar name={c.name} /><div><b>{c.name}</b><small className="num">{c.memberNo} · {c.phone}</small></div></div></td>
                    <td>{c.plan}{c.pt && <> <span className="tag">PT</span></>}</td>
                    <td><StatusPill s={clientStatus(c)} /></td>
                    <td><ExpDate c={c} /></td>
                    <td>{c.trainer}</td>
                    <td><span className="row gap6"><VisBars c={c} /><span className="num">{c.visits}</span></span></td>
                    <td className="num">{money(c.paid)}{c.due > 0 && <small className="due-s">{money(c.due)} due</small>}</td>
                    <td className="muted">{c.since <= 0 ? 'Today' : fmtDate(-c.since, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
            <Pager page={page} pages={pages} total={list.length} per={PER} onPage={p => s.setUi({ cPage: p })} />
          </>
        ) : <Empty icon={Search} title="No members match" text="Try another tab or clear the search." action={<Button size="sm" onClick={() => s.setUi({ cTab: 'All', cQuery: '', cPlan: 'all', cTrainer: 'all', cPage: 1 })}>Clear filters</Button>} />}
      </div>
      {createPortal(
        <div className={clsx('bulk', sel.size && 'show')} aria-hidden={!sel.size}>
          <b>{sel.size} selected</b>
          <button onClick={() => { const n = sel.size; setSel(new Set()); toast(`Renewal reminders sent to ${n} members`); }}><MessageCircle size={14} /> Send renewal reminder</button>
          <button onClick={() => exportCSV(db.clients.filter(c => sel.has(c.id)), [[c => c.memberNo, 'Member ID'], [c => c.name, 'Name'], [c => c.phone, 'Phone'], [c => c.email, 'Email'], [c => c.plan, 'Plan'], [c => fmtDate(c.end, true), 'Valid till'], [c => clientStatus(c), 'Status'], [c => c.trainer, 'Trainer'], [c => c.paid, 'Paid']], 'pulse-clients.csv')}><Download size={14} /> Export</button>
          <button aria-label="Clear selection" onClick={() => setSel(new Set())}><X size={14} /></button>
        </div>, document.body)}
    </>
  );
}
