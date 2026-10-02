import clsx from 'clsx';
import { X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { reduced } from '@/lib/env';
import { IconButton } from './Button';

/**
 * Keeps an overlay mounted through its exit transition.
 * `shown` flips one frame after mount so the CSS enter transition runs.
 */
export function usePresence(open: boolean, ms: number) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      let b = 0;
      const a = requestAnimationFrame(() => { b = requestAnimationFrame(() => setShown(true)); });
      return () => { cancelAnimationFrame(a); cancelAnimationFrame(b); };
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), reduced ? 0 : ms);
    return () => clearTimeout(t);
  }, [open, ms]);
  return { mounted, shown };
}

/* only the top-most dialog reacts to Esc and traps Tab */
const stack: symbol[] = [];
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function useDialog(ref: RefObject<HTMLElement | null>, active: boolean, onClose: () => void) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!active) return;
    const id = Symbol('dialog');
    stack.push(id);
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    // the dialog itself takes focus (no stray ring on mouse open); a field can opt in with data-autofocus
    (el?.querySelector<HTMLElement>('[data-autofocus]') ?? el)?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id || !el) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close.current(); return; }
      if (e.key !== 'Tab') return;
      const f = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(x => x.offsetParent !== null || x === document.activeElement);
      if (!f.length) { e.preventDefault(); return; }
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === a || !el.contains(document.activeElement))) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && (document.activeElement === z || !el.contains(document.activeElement))) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      stack.splice(stack.indexOf(id), 1);
      if (prev && document.contains(prev)) prev.focus({ preventScroll: true });
    };
  }, [active, ref]);
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** accessible name; also the bar title unless `bar` is given */
  label: string;
  /** custom bar content (title + actions); pass `false` for no bar */
  bar?: ReactNode | false;
  wide?: boolean;
  className?: string;
  children: ReactNode;
}

/** Centred dialog: fade + scale .98 → 1, backdrop click and Esc close, focus trapped. */
export function Modal({ open, onClose, label, bar, wide, className, children }: ModalProps) {
  const { mounted, shown } = usePresence(open, 300);
  const ref = useRef<HTMLDivElement>(null);
  useDialog(ref, mounted && open, onClose);
  if (!mounted) return null;
  return createPortal(
    <>
      <div className={clsx('backdrop modal-bd', shown && 'open')} onClick={onClose} />
      <div ref={ref} tabIndex={-1} className={clsx('modal', wide && 'wide', shown && 'open', className)} role="dialog" aria-modal="true" aria-label={label}>
        {bar !== false && (
          <div className="modal-bar">
            {bar ?? <b>{label}</b>}
            {bar === undefined && <IconButton icon={X} size="sm" iconSize={15} label="Close" onClick={onClose} />}
          </div>
        )}
        {children}
      </div>
    </>,
    document.body,
  );
}
