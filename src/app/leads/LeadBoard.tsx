import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent, type KeyboardCoordinateGetter,
} from '@dnd-kit/core';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Plus, UserPlus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { IconButton } from '@/components/ui/Button';
import { reduced } from '@/lib/env';
import { DueChip, TempTag } from '@/components/bits';
import { Avatar } from '@/components/ui/Avatar';
import { useNavigate } from 'react-router';
import { findLead, recentJoins, repName } from '@/data/rules';
import { ago, money } from '@/lib/format';
import { STAGES } from '@/data/seed';
import type { Lead, StageKey } from '@/data/types';
import { toast, useDB, useStore } from '@/store/useStore';
import { filteredLeads } from './LeadsPage';

/** arrow keys jump a picked-up card to the next column instead of nudging it 25px */
const columnHop: KeyboardCoordinateGetter = (e, { context: { droppableRects, collisionRect }, currentCoordinates }) => {
  if (!collisionRect || (e.code !== 'ArrowRight' && e.code !== 'ArrowLeft')) return undefined;
  e.preventDefault();
  const rects = [...droppableRects.values()].sort((a, b) => a.left - b.left);
  const cx = collisionRect.left + collisionRect.width / 2;
  let i = rects.findIndex(r => cx >= r.left && cx <= r.right);
  i = e.code === 'ArrowRight' ? Math.min(rects.length - 1, i + 1) : Math.max(0, i - 1);
  const r = rects[i];
  return { x: currentCoordinates.x + (r.left + r.width / 2 - cx), y: currentCoordinates.y };
};

/**
 * Horizontal navigation for the stage columns, in place of a browser scrollbar:
 * which columns are on screen, arrow steps of one column, jump-to-stage, edge fades,
 * and drag-the-background panning.
 */
function useBoardNav(n: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [st, setSt] = useState({ overflow: false, canL: false, canR: false, seen: Array(n).fill(true) as boolean[] });
  const [panning, setPanning] = useState(false);

  const measure = useCallback(() => {
    const el = ref.current; if (!el) return;
    const box = el.getBoundingClientRect();
    const cols = [...el.children] as HTMLElement[];
    // a column counts as on screen when at least 60% of it is visible
    const seen = cols.map(c => { const r = c.getBoundingClientRect(); return Math.min(r.right, box.right) - Math.max(r.left, box.left) >= r.width * .6; });
    const max = el.scrollWidth - el.clientWidth;
    setSt({ overflow: max > 2, canL: el.scrollLeft > 2, canR: el.scrollLeft < max - 2, seen });
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, [measure]);

  const colW = () => { const c = ref.current?.children[0] as HTMLElement | undefined; return c ? c.getBoundingClientRect().width + 12 : 244; };
  const behavior: ScrollBehavior = reduced ? 'auto' : 'smooth';
  const step = (dir: number) => ref.current?.scrollBy({ left: dir * colW(), behavior });
  const jump = (i: number) => { const el = ref.current, c = el?.children[i] as HTMLElement | undefined; if (el && c) el.scrollTo({ left: c.offsetLeft - el.offsetLeft - 4, behavior }); };

  // drag the empty board background sideways to pan (cards still drag to move leads)
  const panStart = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.button !== 0 || e.pointerType !== 'mouse' || (e.target as Element).closest('.lead-c,button,a,input,select')) return;
    e.preventDefault(); // no text selection while panning
    const x0 = e.clientX, s0 = el.scrollLeft;
    let moved = false;
    const move = (ev: PointerEvent) => { const dx = ev.clientX - x0; if (!moved && Math.abs(dx) < 4) return; if (!moved) { moved = true; setPanning(true); } el.scrollLeft = s0 - dx; };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); setPanning(false); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const first = Math.max(0, st.seen.indexOf(true)), last = Math.max(first, st.seen.lastIndexOf(true));
  return { ref, ...st, first, last, measure, step, jump, panStart, panning };
}

function CardBody({ l }: { l: Lead }) {
  const db = useDB();
  return (
    <>
      <div className="top"><Avatar name={l.name} size="xs" /><b>{l.name}</b><TempTag score={l.score} /></div>
      <div className="meta"><span className="tag">{l.interest}</span><span className="tag">{l.planInterest}</span></div>
      <div className="foot"><Avatar name={repName(db, l.owner)} size="xs" />{l.source}<DueChip d={l.follow} /></div>
    </>
  );
}

function LeadCard({ l, landed }: { l: Lead; landed: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: l.id });
  const open = () => useStore.getState().openDrawer({ k: 'lead', id: l.id });
  return (
    <div ref={setNodeRef} className={clsx('lead-c', isDragging && 'dragging', landed && 'landed')} {...attributes} {...listeners}
      aria-roledescription="Draggable lead" aria-label={`${l.name}, ${l.stage}. Press Space to move, Enter to open.`}
      onClick={open}
      onKeyDown={e => { listeners?.onKeyDown?.(e); if (e.key === 'Enter' && !e.defaultPrevented) open(); }}>
      <CardBody l={l} />
    </div>
  );
}

function Column({ id, children, className, style }: { id: string; children: ReactNode; className?: string; style?: React.CSSProperties }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return <div ref={setNodeRef} className={clsx('col', className, isOver && 'over')} style={style} role="group" aria-label={`${id} column`}>{children}</div>;
}

export default function LeadBoard() {
  const db = useDB();
  const U = useStore(s => s.ui);
  const s = useStore.getState();
  const [active, setActive] = useState<Lead | null>(null);
  const [landed, setLanded] = useState('');
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: columnHop, keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] } }),
  );
  const fresh = useStore(st => st.fresh);
  const nav = useNavigate();
  const nav_ = useBoardNav(STAGES.length);
  const list = filteredLeads(db, U, true);
  // the Joined column follows the "Assigned to" filter: who that rep signed up in the last 30 days
  const joined = recentJoins(db, c => U.lOwner === 'all' || c.soldBy === U.lOwner);

  const onStart = (e: DragStartEvent) => setActive(findLead(db, String(e.active.id)) || null);
  const onEnd = (e: DragEndEvent) => {
    setActive(null);
    const l = findLead(db, String(e.active.id)), to = e.over?.id as StageKey | 'Joined' | undefined;
    if (!l || !to) return;
    if (to === 'Joined') return s.startConv('convert', l);
    if (l.stage === to) return;
    s.updateLead(l.id, { stage: to, lastContact: 0 });
    setLanded(l.id); setTimeout(() => setLanded(''), 600);
    toast(`${l.name} moved to ${to}`);
  };

  return (
    <DndContext sensors={sensors} onDragStart={onStart} onDragEnd={onEnd} onDragCancel={() => setActive(null)}
      accessibility={{ announcements: {
        onDragStart: ({ active: a }) => `Picked up ${findLead(db, String(a.id))?.name}.`,
        onDragOver: ({ over }) => over ? `Over ${over.id}.` : 'Not over a column.',
        onDragEnd: ({ over }) => over ? `Dropped on ${over.id}.` : 'Dropped.',
        onDragCancel: () => 'Move cancelled.',
      } }}>
      <div className="board-wrap">
      {nav_.overflow && (
        <div className="board-nav">
          <div className="stage-chips" role="group" aria-label="Jump to stage">
            {STAGES.map((st, i) => (
              <button key={st.k} className={clsx(nav_.seen[i] && 'on')} style={{ '--c': st.c } as React.CSSProperties} aria-pressed={nav_.seen[i]} onClick={() => nav_.jump(i)}>
                <i />{st.k}<span>{list.filter(l => l.stage === st.k).length}</span>
              </button>
            ))}
          </div>
          <div className="board-arrows">
            <span className="pos num" aria-live="polite">Stages {nav_.first + 1}–{nav_.last + 1} of {STAGES.length}</span>
            <IconButton icon={ChevronLeft} label="Earlier stages" disabled={!nav_.canL} onClick={() => nav_.step(-1)} />
            <IconButton icon={ChevronRight} label="Later stages" disabled={!nav_.canR} onClick={() => nav_.step(1)} />
          </div>
        </div>
      )}
      <div className={clsx('board-scroll', nav_.canL && 'fade-l', nav_.canR && 'fade-r')}>
      <div className={clsx('board', nav_.panning && 'pan')} ref={nav_.ref} onScroll={nav_.measure} onPointerDown={nav_.panStart}>
        {STAGES.map(st => { const items = list.filter(l => l.stage === st.k); return (
          <Column key={st.k} id={st.k}>
            <div className="col-h" style={{ '--c': st.c } as React.CSSProperties}><i />{st.k}<span className="cnt">{items.length}</span></div>
            {items.map(l => <LeadCard key={l.id} l={l} landed={landed === l.id} />)}
            <button className="col-add" onClick={() => s.openDrawer({ k: 'newLead', stage: st.k })}><Plus size={14} /> Add lead</button>
          </Column>
        ); })}
      </div>
      </div>
        <Column id="Joined" className="won">
          <div className="col-h" style={{ '--c': '#15A05A' } as React.CSSProperties}><i />Joined<span className="cnt">{joined.length}</span><span className="tot">30 days</span></div>
          <div className="drop-hint" style={{ flex: 'none', minHeight: 110 }}><span><UserPlus size={20} style={{ margin: '0 auto 6px' }} />Drop a lead here to make them a client</span></div>
          {joined.slice(0, 8).map(c => (
            <div key={c.id} className={clsx('lead-c joined-c', fresh.has(c.id) && 'landed')} role="button" tabIndex={0} style={{ cursor: 'pointer' }}
              onClick={() => s.openDrawer({ k: 'client', id: c.id })} onKeyDown={e => { if (e.key === 'Enter') s.openDrawer({ k: 'client', id: c.id }); }}>
              <div className="top"><Avatar name={c.name} size="xs" /><b>{c.name}</b><span className="tag">{c.plan}</span></div>
              <div className="foot"><Avatar name={repName(db, c.soldBy)} size="xs" />{c.since === 0 ? 'Joined today' : `Joined ${ago(c.since).toLowerCase()}`}{c.due > 0 && <span className="due today" style={{ marginLeft: 'auto' }}>{money(c.due)} due</span>}</div>
            </div>
          ))}
          {joined.length > 8 && <button className="col-add" onClick={() => { s.setUi({ cTab: 'All', cPage: 1 }); nav('/app/clients'); }}>+{joined.length - 8} more in Clients</button>}
        </Column>
      </div>
      <DragOverlay dropAnimation={null}>{active && <div className="lead-c overlay"><CardBody l={active} /></div>}</DragOverlay>
    </DndContext>
  );
}
