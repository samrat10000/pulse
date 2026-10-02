/* Small domain pieces reused across screens. */
import clsx from 'clsx';
import { ArrowUpRight, ChevronLeft, ChevronRight, Flame, Activity, Snowflake, PenLine, type LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { clientStatus, STATUS_TONE, stageC, temp, type Act, type ClientStatus } from '@/data/rules';
import type { Client, Note } from '@/data/types';
import { ago, agoMs, dueLabel, fmtDate, greet, money, num } from '@/lib/format';
import { useCountUp } from '@/lib/useCountUp';
import { useStore } from '@/store/useStore';
import { ICONS } from './icons';
import { Button, IconButton } from './ui/Button';
import { Pill } from './ui/Pill';

export const StagePill = ({ stage }: { stage: string }) =>
  stage === 'Lost' ? <Pill tone="red">Lost</Pill> : <Pill color={stageC(stage)}>{stage}</Pill>;

export const StatusPill = ({ s }: { s: ClientStatus }) => <Pill tone={STATUS_TONE[s]}>{s}</Pill>;

export function TempTag({ score }: { score: number }) {
  const t = temp(score), I = t === 'hot' ? Flame : t === 'warm' ? Activity : Snowflake;
  return <span className={`temp ${t}`}><I size={13} strokeWidth={2} />{t[0].toUpperCase() + t.slice(1)}</span>;
}

export function DueChip({ d }: { d: number | null }) {
  if (d == null) return <span className="muted">None</span>;
  const x = dueLabel(d);
  return <span className={`due ${x.c}`}>{x.t}</span>;
}

/** expiry date with "Nd left" / "Ended Nd ago" underneath */
export function ExpDate({ c, withYear = true }: { c: Client; withYear?: boolean }) {
  const st = clientStatus(c);
  return (
    <span className={clsx('exp-d', c.end < 0 ? 'gone' : st === 'Expiring soon' && 'soon')}>
      {fmtDate(c.end, withYear)}
      <small>{c.end < 0 ? `Ended ${-c.end}d ago` : c.end === 0 ? 'Ends today' : `${c.end}d left`}</small>
    </span>
  );
}

export function Empty({ icon: I, title, text, action, compact }: { icon?: LucideIcon; title: string; text: string; action?: ReactNode; compact?: boolean }) {
  return (
    <div className="empty" style={compact ? { padding: '40px 10px' } : undefined}>
      {I && <span className="t-ic"><I size={18} /></span>}
      <b>{title}</b>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function PageHead({ title, sub, children, date }: { title: ReactNode; sub?: ReactNode; children?: ReactNode; date?: boolean }) {
  return (
    <div className="ph">
      <div>
        {date && <div className="date">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</div>}
        <h1 className="h1">{title}</h1>
        {sub != null && <p className="muted">{sub}</p>}
      </div>
      {children && <div className="ph-actions">{children}</div>}
    </div>
  );
}

export const greeting = (name: string) => `${greet()}, ${name.split(' ')[0]}`;

export type Fmt = 'num' | 'money' | 'pct';
const fmtCount = (v: number, f: Fmt) => f === 'money' ? money(v, true) : f === 'pct' ? v.toFixed(1) + '%' : num(Math.round(v));
export interface Kpi { label: string; v: number; fmt: Fmt; d: string; up: boolean; bg: string; icon: LucideIcon; to: string }

function KpiCard({ k }: { k: Kpi }) {
  const nav = useNavigate();
  const v = useCountUp(k.v);
  return (
    <div className="kpi" style={{ '--k': k.bg } as React.CSSProperties}>
      <div className="kpi-top">
        <span className="kpi-ic"><k.icon size={15} /></span>
        <span className={`kpi-delta ${k.up ? 'up' : 'down'}`}>{k.d}</span>
        <button className="kpi-go" aria-label={`Open ${k.label}`} onClick={() => nav('/app/' + k.to)}><ArrowUpRight size={14} /></button>
      </div>
      <div className="kpi-v">{fmtCount(v, k.fmt)}</div>
      <div className="kpi-l">{k.label}</div>
    </div>
  );
}
export const Kpis = ({ list }: { list: Kpi[] }) => <div className="kpis">{list.map(k => <KpiCard key={k.label} k={k} />)}</div>;

/** notes box + activity timeline shared by the lead and client drawers */
export function Timeline({ id, acts, by }: { id: string; acts: Act[]; by: string }) {
  const notes: Note[] = useStore(s => s.db.notes[id]) || [];
  useStore(s => s.v);
  const me = useStore(s => s.me);
  const [text, setText] = useState('');
  const save = () => {
    const t = text.trim(); if (!t) return;
    const s = useStore.getState(); s.addNote(id, t); s.toast('Note saved'); setText('');
  };
  return (
    <div className="dw-sec">
      <h4>Activity</h4>
      <div className="note-box">
        <textarea placeholder="Add a note" rows={2} value={text} aria-label="Add a note" onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save(); }} />
        <div><Button variant="dark" size="sm" onClick={save}>Save note</Button></div>
      </div>
      <ol className="timeline">
        {notes.map((n, i) => (
          <li key={'n' + i}><span className="tl-ic"><PenLine size={14} /></span><div><b>Note</b><p>{n.text}</p><small>{agoMs(n.at)} by {me?.name}</small></div></li>
        ))}
        {acts.map((a, i) => { const I = ICONS[a.ic] || PenLine; return (
          <li key={'a' + i}><span className="tl-ic"><I size={14} /></span><div><b>{a.t}</b><p>{a.p}</p><small>{ago(a.d)} by {by}</small></div></li>
        ); })}
      </ol>
    </div>
  );
}

export function Pager({ page, pages, total, per, onPage }: { page: number; pages: number; total: number; per: number; onPage: (p: number) => void }) {
  return (
    <div className="tbl-foot">
      <span className="num">Showing {(page - 1) * per + 1}–{Math.min(page * per, total)} of {total}</span>
      <div className="ph-actions">
        <IconButton icon={ChevronLeft} size="sm" iconSize={14} label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)} />
        <IconButton icon={ChevronRight} size="sm" iconSize={14} label="Next page" disabled={page >= pages} onClick={() => onPage(page + 1)} />
      </div>
    </div>
  );
}

/** keyboard activation for clickable non-button cards */
export const pressable = (fn: () => void) => ({
  tabIndex: 0,
  onClick: fn,
  onKeyDown: (e: React.KeyboardEvent) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); fn(); } },
});
