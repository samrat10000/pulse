import clsx from 'clsx';
import { Activity, Check, Clock, CreditCard, Download, IndianRupee, MessageCircle, Search } from 'lucide-react';
import { Empty, Kpis, PageHead, Pager } from '@/components/bits';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { duesList, findClient } from '@/data/rules';
import { exportCSV } from '@/lib/csv';
import { fmtDate, money } from '@/lib/format';
import { toast, useDB, useStore } from '@/store/useStore';
import { PER } from '../leads/LeadsPage';

const GST = 0.18;

function Receipts() {
  const db = useDB();
  const U = useStore(s => s.ui);
  const fresh = useStore(s => s.fresh);
  const s = useStore.getState();
  const q = U.pQuery.trim().toLowerCase();
  const list = db.payments.slice().sort((a, b) => b.date - a.date || b.no.localeCompare(a.no)).filter(p => { const c = findClient(db, p.clientId); return !q || `${c ? c.name : ''} ${p.no}`.toLowerCase().includes(q); });
  const pages = Math.max(1, Math.ceil(list.length / PER)), page = Math.min(U.pPage, pages), rows = list.slice((page - 1) * PER, page * PER);
  if (!list.length) return <Empty icon={Search} title="No receipts match" text="Try another search." />;
  return (
    <>
      <div className="tbl-wrap"><table className="table">
        <thead><tr><th>Receipt</th><th>Member</th><th>For</th><th>Date</th><th>Mode</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>{rows.map(p => { const c = findClient(db, p.clientId); return (
          <tr key={p.no} className={clsx(fresh.has(p.no) && 'fresh')} tabIndex={0} onClick={() => s.openModal({ k: 'receipt', no: p.no })} onKeyDown={e => { if (e.key === 'Enter') s.openModal({ k: 'receipt', no: p.no }); }}>
            <td className="num"><b style={{ fontWeight: 500 }}>{p.no}</b></td>
            <td><div className="person"><Avatar name={c ? c.name : '?'} size="sm" /><div><b>{c ? c.name : 'Former member'}</b><small>{c?.memberNo}</small></div></div></td>
            <td>{p.item} <span className="tag">{p.kind}</span></td>
            <td className="muted">{fmtDate(p.date, true)}</td>
            <td>{p.mode}</td>
            <td className="num" style={{ fontWeight: 600 }}>{money(p.amount)}</td>
            <td>{p.amount < p.total && p.kind !== 'Balance' ? <Pill tone="amber">Part paid</Pill> : <Pill tone="green">Paid</Pill>}</td>
          </tr>
        ); })}</tbody>
      </table></div>
      <Pager page={page} pages={pages} total={list.length} per={PER} onPage={p => s.setUi({ pPage: p })} />
    </>
  );
}

function Dues() {
  const db = useDB();
  const q = useStore(s => s.ui.pQuery).trim().toLowerCase();
  const s = useStore.getState();
  const list = duesList(db).filter(c => !q || `${c.name} ${c.memberNo} ${c.phone}`.toLowerCase().includes(q)).sort((a, b) => b.due - a.due);
  if (!list.length) return <Empty icon={Check} title="No pending dues" text="Every member is fully paid." />;
  return (
    <div className="tbl-wrap"><table className="table">
      <thead><tr><th>Member</th><th>Plan</th><th>Plan total</th><th>Paid so far</th><th>Balance</th><th>Since</th><th><span className="sr-only">Actions</span></th></tr></thead>
      <tbody>{list.map(c => (
        <tr key={c.id} tabIndex={0} onClick={() => s.openDrawer({ k: 'client', id: c.id })} onKeyDown={e => { if (e.key === 'Enter' && e.target === e.currentTarget) s.openDrawer({ k: 'client', id: c.id }); }}>
          <td><div className="person"><Avatar name={c.name} /><div><b>{c.name}</b><small className="num">{c.memberNo} · {c.phone}</small></div></div></td>
          <td>{c.plan}{c.pt && <> <span className="tag">PT</span></>}</td>
          <td className="num">{money(c.total)}</td>
          <td><span className="row gap6"><span className="lb-bar" style={{ width: 80 }}><i style={{ width: `${(c.paid / c.total * 100).toFixed(0)}%` }} /></span><span className="num">{money(c.paid)}</span></span></td>
          <td className="num" style={{ color: 'var(--amber)', fontWeight: 600 }}>{money(c.due)}</td>
          <td className="muted">{fmtDate(c.start, true)}</td>
          <td className="r" onClick={e => e.stopPropagation()}><span className="row gap6" style={{ justifyContent: 'flex-end' }}>
            <Button size="sm" icon={MessageCircle} onClick={() => toast(`Renewal reminder sent to ${c.name} on WhatsApp`)}>Remind</Button>
            <Button variant="primary" size="sm" onClick={() => s.openDrawer({ k: 'collect', id: c.id })}>Collect</Button>
          </span></td>
        </tr>
      ))}</tbody>
    </table></div>
  );
}

export default function PaymentsPage() {
  const db = useDB();
  const U = useStore(s => s.ui);
  const s = useStore.getState();
  const recent = db.payments.filter(p => p.date > -30), coll = recent.reduce((a, p) => a + p.amount, 0);
  const dues = duesList(db), dueSum = dues.reduce((a, c) => a + c.due, 0);
  return (
    <>
      <PageHead title="Payments" sub={`${money(coll)} collected in the last 30 days, ${money(dueSum)} still to collect`}>
        <Button icon={Download} onClick={() => exportCSV(db.payments.slice().sort((a, b) => b.date - a.date), [[p => p.no, 'Receipt'], [p => findClient(db, p.clientId)?.name, 'Member'], [p => p.item, 'For'], [p => fmtDate(p.date, true), 'Date'], [p => p.mode, 'Mode'], [p => p.amount, 'Amount'], [p => Math.round(p.amount * GST / (1 + GST)), 'GST']], 'pulse-payments.csv')}>Export</Button>
        <Button variant="primary" icon={IndianRupee} onClick={() => s.setUi({ pTab: 'dues', pPage: 1 })}>Collect dues</Button>
      </PageHead>
      <Kpis list={[
        { label: 'Collected, 30 days', v: coll, fmt: 'money', d: `${recent.length} receipts`, up: true, bg: '#D6E7FF', icon: IndianRupee, to: 'payments' },
        { label: 'Pending dues', v: dueSum, fmt: 'money', d: `${dues.length} members`, up: false, bg: '#FFE36B', icon: Clock, to: 'payments' },
        { label: 'GST collected, 30 days', v: Math.round(coll * GST / (1 + GST)), fmt: 'money', d: '18%', up: true, bg: '#E5DEFC', icon: CreditCard, to: 'payments' },
        { label: 'UPI share', v: recent.filter(p => p.mode === 'UPI').length / Math.max(1, recent.length) * 100, fmt: 'pct', d: 'of receipts', up: true, bg: '#F8D9EE', icon: Activity, to: 'payments' },
      ]} />
      <div className="card" style={{ marginTop: 14 }}>
        <div className="toolbar">
          <div className="tabs" role="tablist">
            {([['receipts', 'Receipts', db.payments.length], ['dues', 'Pending dues', dues.length]] as const).map(([k, l, n]) => (
              <button key={k} role="tab" aria-selected={U.pTab === k} className={clsx(U.pTab === k && 'on')} onClick={() => s.setUi({ pTab: k, pPage: 1 })}>{l}<span>{n}</span></button>
            ))}
          </div>
          <div className="tb-r"><label className="search"><Search size={15} /><input placeholder="Search member or receipt no." aria-label="Search payments" value={U.pQuery} onChange={e => s.setUi({ pQuery: e.target.value, pPage: 1 })} /></label></div>
        </div>
        {U.pTab === 'dues' ? <Dues /> : <Receipts />}
      </div>
    </>
  );
}
