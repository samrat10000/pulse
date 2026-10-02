import clsx from 'clsx';
import { ChevronsUpDown, Download, Kanban, Layers, List, Plus, QrCode, Search, Users, X } from 'lucide-react';
import { sourceOpts, teamOpts } from '@/components/options';
import { createPortal } from 'react-dom';
import { DueChip, Empty, PageHead, Pager, StagePill, TempTag } from '@/components/bits';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Segmented } from '@/components/ui/Segmented';
import { Select } from '@/components/ui/Select';
import { dueToday, isDue, repName } from '@/data/rules';
import type { DB, Lead } from '@/data/types';
import { ago } from '@/lib/format';
import { exportCSV } from '@/lib/csv';
import { toast, useDB, useStore, type UI } from '@/store/useStore';
import LeadBoard from './LeadBoard';

export const PER = 12;
const LTABS: [string, (l: Lead) => boolean][] = [
  ['All', l => l.stage !== 'Lost'], ['Due today', isDue], ['Hot', l => l.stage !== 'Lost' && l.score >= 70],
  ['New this week', l => l.stage !== 'Lost' && l.createdAt <= 7], ['Imported', l => !!l.imported], ['Lost', l => l.stage === 'Lost'],
];

export function filteredLeads(db: DB, U: UI, forBoard = false) {
  const q = U.lQuery.trim().toLowerCase();
  const tab = forBoard ? LTABS[0][1] : (LTABS.find(t => t[0] === U.lTab) || LTABS[0])[1];
  const list = db.leads.filter(l => tab(l) && (U.lOwner === 'all' || l.owner === U.lOwner) && (U.lSource === 'all' || l.source === U.lSource) && (!q || `${l.name} ${l.phone} ${l.email} ${l.interest}`.toLowerCase().includes(q)));
  const { key, dir } = U.lSort;
  const val = (l: Lead) => key === 'follow' ? (l.follow == null ? 999 : l.follow) : l[key];
  return list.sort((a, b) => { const x = val(a), y = val(b); return (typeof x === 'string' ? x.localeCompare(y as string) : (x as number) - (y as number)) * dir; });
}

function LeadTable() {
  const db = useDB();
  const U = useStore(s => s.ui);
  const fresh = useStore(s => s.fresh);
  const s = useStore.getState();
  const list = filteredLeads(db, U), pages = Math.max(1, Math.ceil(list.length / PER)), page = Math.min(U.lPage, pages);
  const rows = list.slice((page - 1) * PER, page * PER);
  const sel = U.lSel, allOn = rows.length > 0 && rows.every(l => sel.has(l.id));
  const setSel = (next: Set<string>) => s.setUi({ lSel: next });
  const toggle = (id: string) => { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSel(n); };
  const th = (k: UI['lSort']['key'], l: string) => (
    <th className={clsx(U.lSort.key === k && 'sorted')} aria-sort={U.lSort.key === k ? (U.lSort.dir > 0 ? 'ascending' : 'descending') : undefined}>
      <button onClick={() => s.setUi({ lSort: { key: k, dir: U.lSort.key === k ? -U.lSort.dir : (k === 'score' ? -1 : 1) } })}>{l}<ChevronsUpDown size={12} /></button>
    </th>
  );

  if (!list.length) return <Empty icon={Search} title="No leads match" text="Try another tab or clear the search." action={<Button size="sm" onClick={() => s.setUi({ lTab: 'All', lQuery: '', lOwner: 'all', lSource: 'all', lPage: 1 })}>Clear filters</Button>} />;
  return (
    <>
      <div className="tbl-wrap"><table className="table">
        <thead><tr>
          <th style={{ width: 40 }}><Checkbox checked={allOn} label="Select page" onChange={() => { const n = new Set(sel); rows.forEach(l => allOn ? n.delete(l.id) : n.add(l.id)); setSel(n); }} /></th>
          {th('name', 'Lead')}<th>Interested in</th><th>Source</th><th>Stage</th>{th('score', 'Temperature')}<th>Assigned to</th>{th('follow', 'Follow-up')}{th('createdAt', 'Added')}
        </tr></thead>
        <tbody>
          {rows.map(l => (
            <tr key={l.id} className={clsx(sel.has(l.id) && 'sel', fresh.has(l.id) && 'fresh')} tabIndex={0} onClick={() => s.openDrawer({ k: 'lead', id: l.id })} onKeyDown={e => { if (e.key === 'Enter' && e.target === e.currentTarget) s.openDrawer({ k: 'lead', id: l.id }); }}>
              <td onClick={e => e.stopPropagation()}><Checkbox checked={sel.has(l.id)} label={`Select ${l.name}`} onChange={() => toggle(l.id)} /></td>
              <td><div className="person"><Avatar name={l.name} /><div><b>{l.name}</b><small className="num">{l.phone || l.email}</small></div></div></td>
              <td>{l.interest}</td><td>{l.source}</td><td><StagePill stage={l.stage} /></td><td><TempTag score={l.score} /></td>
              <td><span className="row gap6"><Avatar name={repName(db, l.owner)} size="xs" />{repName(db, l.owner).split(' ')[0]}</span></td>
              <td>{l.stage === 'Lost' ? <span className="muted">Closed</span> : <DueChip d={l.follow} />}</td>
              <td className="muted">{ago(l.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
      <Pager page={page} pages={pages} total={list.length} per={PER} onPage={p => s.setUi({ lPage: p })} />
      {createPortal(
        <div className={clsx('bulk', sel.size && 'show')} aria-hidden={!sel.size}>
          <b>{sel.size} selected</b>
          <Select label="Assign to" value="" style={{ height: 32, backgroundColor: 'transparent', color: 'inherit', borderColor: 'rgba(127,127,127,.4)' }}
            placeholder="Assign to…" options={teamOpts(db)}
            onChange={v => { const ids = [...sel]; s.assignLeads(ids, v); setSel(new Set()); toast(`${ids.length} leads assigned to ${repName(db, v)}`); }} />
          <button onClick={() => exportCSV(db.leads.filter(l => sel.has(l.id)), [[l => l.name, 'Name'], [l => l.phone, 'Phone'], [l => l.email, 'Email'], [l => l.interest, 'Interested in'], [l => l.source, 'Source'], [l => l.stage, 'Stage'], [l => repName(db, l.owner), 'Assigned to']], 'pulse-leads.csv')}><Download size={14} /> Export</button>
          <button aria-label="Clear selection" onClick={() => setSel(new Set())}><X size={14} /></button>
        </div>, document.body)}
    </>
  );
}

export default function LeadsPage() {
  const db = useDB();
  const U = useStore(s => s.ui);
  const me = useStore(s => s.me);
  const s = useStore.getState();
  const tabs = LTABS.filter(([k, f]) => k !== 'Imported' || db.leads.some(f));
  return (
    <>
      <PageHead title="Leads" sub={`${db.leads.filter(l => l.stage !== 'Lost').length} people interested in joining, ${dueToday(db, me)} to follow up today`}>
        <Segmented className="view-seg" label="View" value={U.lView} onChange={v => s.setUi({ lView: v })} options={[{ value: 'table', label: 'Table', icon: List }, { value: 'board', label: 'Board', icon: Kanban }]} />
        <Button icon={QrCode} onClick={() => s.openModal({ k: 'enquiry' })}>Enquiry link</Button>
        <Button variant="primary" icon={Plus} onClick={() => s.openDrawer({ k: 'newLead' })}>Add lead</Button>
      </PageHead>
      <div className="card" style={U.lView === 'board' ? { marginBottom: 14 } : undefined}>
        <div className="toolbar">
          {U.lView === 'table'
            ? <div className="tabs" role="tablist">{tabs.map(([k, f]) => <button key={k} role="tab" aria-selected={U.lTab === k} className={clsx(U.lTab === k && 'on')} onClick={() => s.setUi({ lTab: k, lPage: 1 })}>{k}<span>{db.leads.filter(f).length}</span></button>)}</div>
            : <div className="muted" style={{ fontSize: 13, paddingLeft: 4 }}>Drag a lead to move it. Drop on Joined to convert.</div>}
          <div className="tb-r">
            <label className="search"><Search size={15} /><input placeholder="Search name, phone or goal" aria-label="Search leads" value={U.lQuery} onChange={e => s.setUi({ lQuery: e.target.value, lPage: 1 })} /></label>
            <Select label="Assigned to" value={U.lOwner} onChange={v => s.setUi({ lOwner: v, lPage: 1 })} options={[{ value: 'all', label: 'Everyone', icon: <Users size={15} /> }, ...teamOpts(db)]} />
            <Select label="Source" value={U.lSource} onChange={v => s.setUi({ lSource: v, lPage: 1 })} options={[{ value: 'all', label: 'All sources', icon: <Layers size={15} /> }, ...sourceOpts(db.sources)]} />
          </div>
        </div>
        {U.lView === 'table' && <LeadTable />}
      </div>
      {U.lView === 'board' && <LeadBoard />}
    </>
  );
}
