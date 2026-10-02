import { CheckCheck, MessageCircle, X } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { IconButton } from '@/components/ui/Button';
import { fillVars, segOf } from '@/data/rules';
import { hash } from '@/lib/format';
import { rng } from '@/lib/rng';
import { useDB, useStore } from '@/store/useStore';

export default function CampaignDrawer({ id }: { id: string }) {
  const db = useDB();
  const s = useStore.getState();
  const c = db.campaigns.find(x => x.id === id);
  if (!c) return null;
  const seg = segOf(c.seg), tpl = db.templates.find(t => t.k === c.tpl) || db.templates[0], people = seg.list(db).slice(0, 12), r = rng(hash(c.id));
  const winWord = c.seg === 'hot' ? 'Joined' : 'Renewed';
  const L = { queued: ['Queued', 'muted'], delivered: ['Delivered', ''], read: ['Read', 'blue'], replied: ['Replied', 'violet'], won: [winWord, 'green'] } as const;
  const st = (i: number): keyof typeof L => { const x = r(); return c.status === 'Scheduled' ? 'queued' : i < c.won ? 'won' : x < c.replied / c.n ? 'replied' : x < c.read / c.n ? 'read' : 'delivered'; };
  return (
    <>
      <div className="dw-head"><IconButton icon={X} label="Close" onClick={s.closeDrawer} /></div>
      <div className="dw-id"><span className="wa-ic lg"><MessageCircle size={22} /></span><div><h2>{c.name}</h2><p>{seg.t} · {c.n} people</p></div></div>
      {c.status !== 'Scheduled' && (
        <div className="cp-bigfunnel">
          {([['Sent', c.n], ['Delivered', c.delivered], ['Read', c.read], ['Replied', c.replied], [winWord, c.won]] as const).map(([l, v], i) => (
            <div key={l} style={{ '--w': `${Math.max(6, v / c.n * 100)}%`, '--d': `${i * 80}ms` } as React.CSSProperties}><span>{l}</span><b className="num">{v}</b><i /></div>
          ))}
        </div>
      )}
      <div className="dw-sec"><h4>Message</h4>
        <div className="wa-mini">
          <div className="wa-bubble">{fillVars(db, tpl.body, null)}<small>7:02 PM <CheckCheck size={14} strokeWidth={2} /></small></div>
          <div className="wa-btns">{tpl.btns.map(b => <span key={b}>{b}</span>)}</div>
        </div>
      </div>
      <div className="dw-sec"><h4>Recipients<span className="muted" style={{ fontWeight: 400 }}>{Math.min(12, c.n)} of {c.n}</span></h4>
        {people.map((p, i) => { const [label, cls] = L[st(i)]; return (
          <div className="pay" key={p.id}>
            <span><Avatar name={p.name} size="sm" /></span>
            <div><b>{p.name}</b><small className="num">{p.phone}</small></div>
            <span className={`r rc-st ${cls}`}>{(label === 'Read' || label === 'Delivered') && <CheckCheck size={14} strokeWidth={2} />}{label}</span>
          </div>
        ); })}
      </div>
    </>
  );
}
