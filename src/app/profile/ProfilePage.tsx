import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { PageHead } from '@/components/bits';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { EMAIL_RE } from '@/import/validate';
import { toast, useDB, useStore } from '@/store/useStore';
import { useLogout } from '../AppShell';

const ACCESS = { owner: 'Full access', sales: 'Leads, clients, sales team', desk: 'Check-ins, payments, clients', member: 'Member app' };

export default function ProfilePage() {
  const db = useDB();
  const me = useStore(s => s.me)!;
  const logout = useLogout();
  const [p, setP] = useState({ name: me.name, email: me.email, phone: me.phone });
  const [pErr, setPErr] = useState('');
  const [pw, setPw] = useState({ cur: '', next: '', conf: '' });
  const [wErr, setWErr] = useState('');

  const saveProfile = () => {
    const name = p.name.trim(), email = p.email.trim();
    if (!name) return setPErr("Your name can't be empty.");
    if (!EMAIL_RE.test(email)) return setPErr('That email looks incomplete.');
    setPErr(''); useStore.getState().updateProfile({ name, email, phone: p.phone.trim() }); toast('Profile saved');
  };
  const savePw = () => {
    if (!pw.cur) return setWErr('Enter your current password.');
    if (pw.next.length < 8) return setWErr('New password needs at least 8 characters.');
    if (pw.next !== pw.conf) return setWErr("The new passwords don't match.");
    setWErr(''); setPw({ cur: '', next: '', conf: '' }); toast('Password updated');
  };

  return (
    <>
      <PageHead title="Profile" sub="Your account and sign-in details" />
      <div className="prof">
        <div className="card prof-card">
          <Avatar name={me.name} />
          <h2>{me.name}</h2><p>{me.role}, {db.gym.name}</p>
          <dl className="kv"><dt>Email</dt><dd>{me.email}</dd><dt>Phone</dt><dd className="num">{me.phone}</dd><dt>Access</dt><dd>{ACCESS[me.key]}</dd></dl>
          <Button icon={LogOut} onClick={logout}>Sign out</Button>
        </div>
        <div style={{ display: 'grid', gap: 14 }}>
          <section className="card set-sec">
            <h3>Personal details</h3>
            <div className="form">
              <label>Full name<input value={p.name} onChange={e => setP({ ...p, name: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') saveProfile(); }} /></label>
              <div className="f2">
                <label>Email<input type="email" value={p.email} onChange={e => setP({ ...p, email: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') saveProfile(); }} /></label>
                <label>Phone<input value={p.phone} onChange={e => setP({ ...p, phone: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') saveProfile(); }} /></label>
              </div>
              <p className="f-err" role={pErr ? 'alert' : undefined}>{pErr}</p>
            </div>
            <div className="set-foot"><Button variant="primary" onClick={saveProfile}>Save changes</Button></div>
          </section>
          <section className="card set-sec">
            <h3>Password</h3><p>Use at least 8 characters.</p>
            <div className="form">
              <label>Current password<input type="password" autoComplete="current-password" value={pw.cur} onChange={e => setPw({ ...pw, cur: e.target.value })} /></label>
              <div className="f2">
                <label>New password<input type="password" autoComplete="new-password" value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} /></label>
                <label>Confirm new password<input type="password" autoComplete="new-password" value={pw.conf} onChange={e => setPw({ ...pw, conf: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') savePw(); }} /></label>
              </div>
              <p className="f-err" role={wErr ? 'alert' : undefined}>{wErr}</p>
            </div>
            <div className="set-foot"><Button variant="dark" onClick={savePw}>Update password</Button></div>
          </section>
        </div>
      </div>
    </>
  );
}
