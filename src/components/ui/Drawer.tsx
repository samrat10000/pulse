import clsx from 'clsx';
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useDialog, usePresence } from './Modal';

/**
 * Right-hand sheet (470px). Slides in, backdrop click and Esc close, focus trapped.
 * `contentKey` scrolls back to the top when the drawer switches to another record.
 */
export function Drawer({ open, onClose, label, contentKey, children }: { open: boolean; onClose: () => void; label: string; contentKey?: string; children: ReactNode }) {
  const { mounted, shown } = usePresence(open, 380);
  const ref = useRef<HTMLElement>(null);
  useDialog(ref, mounted && open, onClose);
  useEffect(() => { ref.current?.scrollTo({ top: 0 }); }, [contentKey]);
  if (!mounted) return null;
  return createPortal(
    <>
      <div className={clsx('backdrop', shown && 'open')} onClick={onClose} />
      <aside ref={ref} tabIndex={-1} className={clsx('drawer', shown && 'open')} role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </aside>
    </>,
    document.body,
  );
}
