import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  icon?: LucideIcon;
  /** style override for the small icon tile, e.g. the red "at risk" tile */
  iconStyle?: CSSProperties;
  /** right side of the header: a link, a segmented control, a count */
  right?: ReactNode;
}

/** `.card` with the optional prototype header (`.card-h` › `.card-t` + `.t-ic`). */
export function Card({ title, icon: Icon, iconStyle, right, className, children, ...rest }: CardProps) {
  return (
    <div className={clsx('card', className)} {...rest}>
      {(title || right) && (
        <div className="card-h">
          <div className="card-t">
            {Icon && <span className="t-ic" style={iconStyle}><Icon size={14} /></span>}
            {title}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}
