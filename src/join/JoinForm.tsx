import clsx from 'clsx';
import { ArrowRight, Check, User } from 'lucide-react';
import { useState } from 'react';
import { QR } from '@/components/QR';
import { Button } from '@/components/ui/Button';
import { phoneKey } from '@/lib/format';
import { toast, useStore } from '@/store/useStore';

const GOALS_J = ['Weight loss', 'Muscle gain', 'General fitness', 'Personal training', 'Yoga', 'Zumba'];
const TIMES = ['Morning', 'Afternoon', 'Evening'];

/** public free-trial form; used on /join and inside the enquiry modal's phone */
export function JoinForm({ where }: { where: 'phone' | 'page' }) {
  const [goal, setGoal] = useState('Weight loss');
  const [time, setTime] = useState('Morning');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [err, setErr] = useState('');
  const [done, setDone] = useState<{ name: string; phone: string; goal: string; time: string; code: string } | null>(null);

  const submit = () => {
    const n = name.trim();
    if (!n) return setErr('Please add your name.');
    if (phoneKey(phone).length !== 10) return setErr('Please add a 10-digit mobile number.');
    setErr('');
    const s = useStore.getState();
    const { lead, code } = s.addEnquiry(n, phone, goal, time);
    setDone({ name: n, phone: lead.phone, goal, time, code });
    if (s.me && where === 'phone') toast(`New enquiry: ${n} wants a free trial`);
  };
  const again = () => { setDone(null); setName(''); setPhone(''); setGoal('Weight loss'); setTime('Morning'); };
  const enter = (e: React.KeyboardEvent) => { if (e.key === 'Enter') submit(); };

  if (done) return (
    <div className="jf-done">
      <div className="done-ic"><Check size={28} strokeWidth={2.4} /></div>
      <h3>You're in, {done.name.split(' ')[0]}!</h3>
      <p>Our team will call you on {done.phone} within 2 hours to fix your free trial.</p>
      <div className="trial-pass"><div><small>Free trial pass</small><b>{done.code}</b><span>{done.goal} · {done.time}</span></div><QR text={done.code} px={74} /></div>
      <Button onClick={again}>Book for a friend</Button>
    </div>
  );

  const chips = (list: string[], v: string, set: (x: string) => void, label: string) => (
    <div className="chips" role="radiogroup" aria-label={label}>
      {list.map(g => <button key={g} type="button" role="radio" aria-checked={v === g} className={clsx('chip', v === g && 'on')} onClick={() => set(g)}>{g}</button>)}
    </div>
  );
  return (
    <div className="jf">
      <label className="field">Your name<span className="inp"><User size={16} /><input autoComplete="name" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} onKeyDown={enter} /></span></label>
      <label className="field">Phone number<span className="inp"><span className="pre">+91</span><input inputMode="tel" autoComplete="tel" placeholder="98765 43210" value={phone} onChange={e => setPhone(e.target.value)} onKeyDown={enter} /></span></label>
      <div className="field">What's your goal?{chips(GOALS_J, goal, setGoal, "What's your goal?")}</div>
      <div className="field">Best time for you{chips(TIMES, time, setTime, 'Best time for you')}</div>
      <p className="f-err" role={err ? 'alert' : undefined}>{err}</p>
      <button type="button" className="btn btn-primary jf-go" onClick={submit}>Book my free trial <ArrowRight size={16} strokeWidth={2.2} /></button>
      <small className="jf-note">No payment needed. We'll only call about your trial.</small>
    </div>
  );
}
