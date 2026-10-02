import clsx from 'clsx';
import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Avatar } from './Avatar';

/** a plain string, or a value with a label and optional decoration */
export type Option = string | { value: string; label: string; hint?: string; avatar?: string; color?: string; icon?: ReactNode };
type Opt = Exclude<Option, string>;
const norm = (o: Option): Opt => (typeof o === 'string' ? { value: o, label: o } : o);

function Deco({ o }: { o: Opt }) {
  if (o.avatar) return <Avatar name={o.avatar} size="xs" />;
  if (o.color) return <i className="sel-dot" style={{ background: o.color }} />;
  if (o.icon) return <span className="sel-ic">{o.icon}</span>;
  return null;
}

/**
 * Custom dropdown (the native one can't be styled). Listbox semantics with aria-activedescendant,
 * so focus stays on the button: arrows, Home/End, Enter/Space, Esc, type-ahead.
 * The menu is portalled to <body> so drawers, tables and modals never clip it, and it flips up near the bottom.
 */
export function Select({ value, onChange, options, label, className, style, id, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  label?: string;
  className?: string;
  style?: CSSProperties;
  id?: string;
  /** shown on the button when `value` matches no option (an action menu like "Reschedule…") */
  placeholder?: string;
}) {
  const opts = options.map(norm);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ left: number; top: number; width: number; up: boolean } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const typed = useRef({ s: '', t: 0 });
  const uid = useId();
  const cur = opts.find(o => o.value === value) ?? (placeholder != null ? null : opts[0]);

  const place = () => {
    const b = btn.current?.getBoundingClientRect(); if (!b) return;
    const h = Math.min(menu.current?.offsetHeight ?? 300, 320), room = innerHeight - b.bottom;
    const up = room < h + 12 && b.top > room;
    setPos({ left: Math.min(b.left, innerWidth - Math.max(b.width, 200) - 8), top: up ? b.top - 6 : b.bottom + 6, width: b.width, up });
  };
  const show = () => { setActive(Math.max(0, opts.findIndex(o => o.value === value))); setOpen(true); };
  const close = (refocus = true) => { setOpen(false); if (refocus) btn.current?.focus({ preventScroll: true }); };
  const choose = (i: number) => { const o = opts[i]; close(); if (o && o.value !== value) onChange(o.value); };

  useLayoutEffect(() => { if (open) place(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { const t = e.target as Node; if (!btn.current?.contains(t) && !menu.current?.contains(t)) close(false); };
    // Esc closes just the menu, before any surrounding drawer or modal hears it
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); } };
    const move = (e: Event) => { if (!menu.current?.contains(e.target as Node)) place(); };
    document.addEventListener('pointerdown', away, true);
    window.addEventListener('keydown', esc, true);
    window.addEventListener('scroll', move, true);
    window.addEventListener('resize', place);
    return () => { document.removeEventListener('pointerdown', away, true); window.removeEventListener('keydown', esc, true); window.removeEventListener('scroll', move, true); window.removeEventListener('resize', place); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) menu.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' }); }, [active, open]);

  const onKey = (e: React.KeyboardEvent) => {
    const k = e.key;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(k)) { e.preventDefault(); show(); }
      return;
    }
    if (k === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(opts.length - 1, a + 1)); }
    else if (k === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
    else if (k === 'Home') { e.preventDefault(); setActive(0); }
    else if (k === 'End') { e.preventDefault(); setActive(opts.length - 1); }
    else if (k === 'Enter' || k === ' ') { e.preventDefault(); choose(active); }
    else if (k === 'Tab') close(false);
    else if (k.length === 1 && /\S/.test(k)) {
      // type-ahead: jump to the next option starting with what was typed
      const now = Date.now(), T = typed.current;
      T.s = now - T.t > 700 ? k.toLowerCase() : T.s + k.toLowerCase(); T.t = now;
      const i = opts.findIndex((o, j) => j > (T.s.length > 1 ? active - 1 : active) && o.label.toLowerCase().startsWith(T.s));
      const any = i >= 0 ? i : opts.findIndex(o => o.label.toLowerCase().startsWith(T.s));
      if (any >= 0) setActive(any);
    }
  };

  return (
    <>
      <button
        ref={btn} id={id} type="button" className={clsx('select sel-btn', open && 'open', className)} style={style}
        role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={uid} aria-label={label}
        aria-activedescendant={open ? `${uid}-${active}` : undefined}
        onClick={() => (open ? close() : show())} onKeyDown={onKey}
      >
        {cur && <Deco o={cur} />}
        <span className={clsx('sel-val', !cur && 'sel-ph')}>{cur ? cur.label : placeholder}</span>
        <ChevronDown size={14} className="sel-chev" />
      </button>
      {open && createPortal(
        <div ref={menu} id={uid} role="listbox" aria-label={label} className={clsx('sel-menu', pos?.up && 'up')}
          style={pos ? { left: pos.left, top: pos.top, minWidth: Math.max(pos.width, 180), transform: pos.up ? 'translateY(-100%)' : undefined } : { visibility: 'hidden' }}>
          {opts.map((o, i) => (
            <div key={o.value} id={`${uid}-${i}`} data-i={i} role="option" aria-selected={o.value === value}
              className={clsx('sel-opt', i === active && 'act', o.value === value && 'on')}
              onPointerMove={() => setActive(i)} onClick={() => choose(i)}>
              <Deco o={o} />
              <span className="sel-txt"><b>{o.label}</b>{o.hint && <small>{o.hint}</small>}</span>
              {o.value === value && <Check size={15} strokeWidth={2.4} className="sel-tick" />}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
