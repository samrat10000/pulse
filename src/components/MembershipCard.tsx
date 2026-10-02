import clsx from 'clsx';
import { clientStatus } from '@/data/rules';
import type { Client } from '@/data/types';
import { fmtDate } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { QR } from './QR';

/** blue active · amber expiring · grey expired · light blue frozen; striped corner disc; real QR of the member number */
export function MembershipCard({ c, qr = true, style }: { c: Client; qr?: boolean; style?: React.CSSProperties }) {
  const gym = useStore(s => s.db.gym.name);
  const st = clientStatus(c), len = Math.max(1, c.end - c.start), used = Math.min(1, Math.max(0, (0 - c.start) / len));
  return (
    <div className={clsx('mcard', st === 'Expired' ? 'gone' : st === 'Expiring soon' ? 'soon' : st === 'Frozen' && 'frozen')} style={style}>
      <div className="mc-top"><div><small>{gym}</small><b>{c.plan} membership</b></div><span className="mc-id">{c.memberNo}</span></div>
      {qr && <div className="mc-qr" title="Member pass"><QR text={c.memberNo} px={58} /></div>}
      <div className="mc-dates">
        <div><span>Started</span><b>{fmtDate(c.start, true)}</b></div>
        <div style={{ textAlign: 'right' }}><span>{st === 'Expired' ? 'Ended' : 'Valid till'}</span><b>{fmtDate(c.end, true)}</b></div>
      </div>
      <div className="mc-bar" role="progressbar" aria-label="Membership time used" aria-valuenow={Math.round(used * 100)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${(used * 100).toFixed(0)}%` }} /></div>
    </div>
  );
}
