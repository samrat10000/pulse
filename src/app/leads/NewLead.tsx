import { X } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'react-router';
import { Button, IconButton } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { sourceOpts, stageOpts, teamOpts } from '@/components/options';
import { INTERESTS } from '@/data/seed';
import type { StageKey } from '@/data/types';
import { EMAIL_RE } from '@/import/validate';
import { phoneKey } from '@/lib/format';
import { toast, useDB, useStore } from '@/store/useStore';

/** Add lead: a name plus a phone (10 digits) or email; no duplicate phone among leads or members */
export default function NewLead({ stage, phone: phone0, source: source0 }: { stage?: StageKey; phone?: string; source?: string }) {
  const db = useDB();
  const s = useStore.getState();
  const loc = useLocation();
  const [f, setF] = useState({ name: '', phone: phone0 || '', email: '', interest: INTERESTS[0], source: source0 || db.sources[0], owner: db.team[0].id, stage: stage || 'New' as StageKey });
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });

  const save = () => {
    const name = f.name.trim(), phone = f.phone.trim(), email = f.email.trim();
    const fail = (m: string) => setErr(m);
    if (!name) return fail('Add a name.');
    if (!phone && !email) return fail('Add a phone number so the team can call them.');
    if (phone && phoneKey(phone).length < 10) return fail('That phone number looks too short.');
    if (email && !EMAIL_RE.test(email)) return fail('That email looks incomplete.');
    if (phone && db.leads.some(l => phoneKey(l.phone) === phoneKey(phone))) return fail('A lead with this phone number already exists.');
    if (phone && db.clients.some(c => phoneKey(c.phone) === phoneKey(phone))) return fail('This number belongs to an existing member.');
    s.addLead({ name, phone, email, interest: f.interest, source: f.source, planInterest: 'Quarterly', stage: f.stage, owner: f.owner, follow: 0, score: 60 });
    s.closeDrawer();
    if (loc.pathname.endsWith('/leads')) s.setUi({ lTab: 'All', lPage: 1 });
    toast(`${name} added to leads`);
  };
  const enter = (e: React.KeyboardEvent) => { if (e.key === 'Enter') save(); };

  return (
    <>
      <div className="dw-head"><IconButton icon={X} label="Close" onClick={s.closeDrawer} /></div>
      <div className="dw-id"><div><h2>Add lead</h2><p>Someone interested in joining. A name and phone number are enough.</p></div></div>
      <div className="form">
        <label>Full name<input data-autofocus autoComplete="off" value={f.name} onChange={e => set('name')(e.target.value)} onKeyDown={enter} /></label>
        <div className="f2">
          <label>Phone<input inputMode="tel" autoComplete="off" placeholder="+91" value={f.phone} onChange={e => set('phone')(e.target.value)} onKeyDown={enter} /></label>
          <label>Email (optional)<input type="email" autoComplete="off" value={f.email} onChange={e => set('email')(e.target.value)} onKeyDown={enter} /></label>
        </div>
        <div className="f2">
          <label>Interested in<Select value={f.interest} onChange={set('interest')} options={INTERESTS} /></label>
          <label>Came from<Select value={f.source} onChange={set('source')} options={sourceOpts(db.sources)} /></label>
        </div>
        <div className="f2">
          <label>Assign to<Select value={f.owner} onChange={set('owner')} options={teamOpts(db)} /></label>
          <label>Stage<Select value={f.stage} onChange={set('stage')} options={stageOpts()} /></label>
        </div>
        <p className="f-err" role={err ? 'alert' : undefined}>{err}</p>
        <Button variant="primary" onClick={save}>Add lead</Button>
      </div>
    </>
  );
}
