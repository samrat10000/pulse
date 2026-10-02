import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'dark' | 'ghost' | 'white' | 'glass';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm';
  icon?: LucideIcon;
  /** shows the spinner in place of the icon and blocks clicks */
  busy?: boolean;
}

export function Button({ variant = 'ghost', size, icon: Icon, busy, className, children, disabled, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={clsx('btn', `btn-${variant}`, size === 'sm' && 'btn-sm', className)} disabled={disabled || busy} aria-busy={busy || undefined} {...rest}>
      {busy ? <span className="spin" /> : Icon && <Icon size={size === 'sm' ? 13 : 15} />}
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  size?: 'sm';
  iconSize?: number;
  children?: ReactNode;
}

/** square icon button; `label` becomes aria-label and tooltip */
export function IconButton({ icon: Icon, label, size, iconSize, className, children, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button type={type} className={clsx('icon-btn', size, className)} aria-label={label} title={label} {...rest}>
      <Icon size={iconSize ?? (size === 'sm' ? 13 : 16)} />
      {children}
    </button>
  );
}
