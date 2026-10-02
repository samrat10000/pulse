import { Check, X } from 'lucide-react';
import { useState } from 'react';
import { payOpts } from '@/components/options';
import { Avatar } from '@/components/ui/Avatar';
import { Button, IconButton } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { findClient } from '@/data/rules';
import { PAY_MODES } from '@/data/seed';
import type { PayMode } from '@/data/types';
import { parseValue } from '@/import/validate';
import { money } from '@/lib/format';
import { toast, useDB, useStore } from '@/store/useStore';

export default function CollectDrawer({ id }: { id: string }) {
  const db = useDB();
  const s = useStore.getState();
  const c = findClient(db, id);
  const [amt, setAmt] = useState(String(c?.due ?? 0));
  const [mode, setMode] = useState<PayMode>('UPI');
  const [err, setErr] = useState('');
  if (!c) return null;
  const save = () => {
    const a = parseValue(amt);
    if (!a || a < 1) return setErr('Enter the amount received.');
    if (a > c.due) return setErr(`That's more than the ${money(c.due)} due.`);
    const p = s.collect(c.id, a, mode);
    toast(`${money(a)} received from ${c.name}`);
    s.openModal({ k: 'receipt', no: p.no });
  };
  return (
    <>
      <div className="dw-head"><IconButton icon={X} label="Close" onClick={s.closeDrawer} /></div>
      <div className="dw-id"><Avatar name={c.name} size="lg" /><div><h2>Collect payment</h2><p>{c.name} · {c.memberNo}</p></div></div>
      <div className="sum" style={{ marginTop: 20 }}>
        <div><span>{c.plan} plan{c.pt ? ' + PT' : ''}</span><span className="num">{money(c.total)}</span></div>
        <div><span>Paid so far</span><span className="num">{money(c.paid)}</span></div>
        <div><span>Balance due</span><span className="num" style={{ color: 'var(--amber)' }}>{money(c.due)}</span></div>
      </div>
      <div className="form">
        <div className="f2">
          <label>Amount received (₹)<input data-autofocus inputMode="numeric" value={amt} onChange={e => setAmt(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save(); }} /></label>
          <label>Paid by<Select value={mode} onChange={v => setMode(v as PayMode)} options={payOpts(PAY_MODES)} /></label>
        </div>
        <p className="f-err" role={err ? 'alert' : undefined}>{err}</p>
        <Button variant="primary" icon={Check} onClick={save}>Record payment and make receipt</Button>
      </div>
    </>
  );
}
