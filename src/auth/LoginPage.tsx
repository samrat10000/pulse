import clsx from 'clsx';
import { Check, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { ROLE_ICON } from '@/components/icons';
import { Brand } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { accounts } from '@/data/persist';
import { PASSWORD } from '@/data/seed';
import type { Account, RoleKey } from '@/data/types';
import { EMAIL_RE } from '@/import/validate';
import { reduced } from '@/lib/env';
import { Music, useMusic } from '@/lib/music';
import { can, toast, useDB, useStore } from '@/store/useStore';

function MusicPill() {
  const { playing, muted } = useMusic();
  const flip = () => {
    if (playing) { Music.stop(); Music.muted = true; }
    else { Music.muted = false; if (!Music.start()) toast('Sound is not supported in this browser'); }
  };
  return (
    <button type="button" className={clsx('music', playing && 'on')} aria-pressed={playing} aria-label={playing ? 'Mute music' : 'Play music'} onClick={flip} data-music>
      <span className="eq"><i /><i /><i /><i /></span>
      {playing ? 'Music on' : muted ? 'Music off' : 'Play music'}
    </button>
  );
}

/** sign-in: one centred card */
export default function LoginPage() {
  const db = useDB();
  const nav = useNavigate();
  const ACC = accounts(); // demo accounts with any saved profile edits
  const [as, setAs] = useState<RoleKey>('owner');
  const [email, setEmail] = useState(ACC.owner.email);
  const [pass, setPass] = useState(PASSWORD);
  const [peek, setPeek] = useState(false);
  const [keep, setKeep] = useState(true);
  const [err, setErr] = useState<{ e?: string; p?: string }>({});
  const [busy, setBusy] = useState(false);
  const timer = useRef(0);

  // music starts on the first pointerdown anywhere on the page, unless muted
  useEffect(() => {
    Music.tried = false;
    const onDown = (e: PointerEvent) => {
      if (Music.playing || Music.muted || Music.tried || (e.target as Element).closest?.('[data-music]')) return;
      Music.tried = true; Music.start();
    };
    document.addEventListener('pointerdown', onDown);
    return () => { document.removeEventListener('pointerdown', onDown); clearTimeout(timer.current); };
  }, []);

  const pick = (k: RoleKey) => { setAs(k); setEmail(ACC[k].email); setErr({}); };

  const submit = () => {
    if (busy) return;
    const e = email.trim().toLowerCase();
    if (!EMAIL_RE.test(e)) return setErr({ e: 'Enter a valid email address.' });
    const acc = (Object.values(ACC) as Account[]).find(a => a.email.toLowerCase() === e);
    if (!acc) return setErr({ e: 'No account with this email. Pick a demo account above.' });
    if (pass.length < 6) return setErr({ p: 'Password must be at least 6 characters.' });
    setErr({}); setBusy(true);
    if (Music.playing) Music.stop(2.4);
    timer.current = window.setTimeout(() => {
      const s = useStore.getState(), after = s.after;
      s.login(acc, keep);
      useStore.setState({ after: null });
      nav(acc.key === 'member' ? '/app/me' : `/app/${after && can(acc, after) ? after : 'dashboard'}`, { replace: true });
    }, reduced ? 0 : 650);
  };
  const onEnter = (e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } };

  return (
    <div className="login">
      <header className="login-top"><Brand size={32} style={{ padding: 0 }} /><MusicPill /></header>
      <main className="login-form">
        <h1>Welcome back</h1>
        <p>Sign in to {db.gym.name}</p>
        <div className="role-pick" role="radiogroup" aria-label="Demo account">
          {(Object.values(ACC) as Account[]).map(a => { const I = ROLE_ICON[a.key]; return (
            <button key={a.key} type="button" className={clsx(as === a.key && 'on')} role="radio" aria-checked={as === a.key} onClick={() => pick(a.key)}>
              <I size={15} /><span><b>{a.label}</b><small>{a.name.split(' ')[0]}</small></span>
            </button>
          ); })}
        </div>
        <label className="field">Email
          <span className={clsx('inp', err.e && 'bad')}><Mail size={16} /><input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={onEnter} aria-invalid={!!err.e} /></span>
          <span className="f-err" role={err.e ? 'alert' : undefined}>{err.e}</span>
        </label>
        <label className="field">Password
          <span className={clsx('inp', err.p && 'bad')}><Lock size={16} /><input type={peek ? 'text' : 'password'} autoComplete="current-password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={onEnter} aria-invalid={!!err.p} />
            <button type="button" aria-label={peek ? 'Hide password' : 'Show password'} onClick={() => setPeek(!peek)}>{peek ? <EyeOff size={16} /> : <Eye size={16} />}</button></span>
          <span className="f-err" role={err.p ? 'alert' : undefined}>{err.p}</span>
        </label>
        <div className="login-row">
          <span className="check">
            <button type="button" className={clsx('cb', keep && 'on')} role="checkbox" aria-checked={keep} aria-label="Keep me signed in" onClick={() => setKeep(!keep)}><Check size={11} strokeWidth={3} /></button>
            <span onClick={() => setKeep(!keep)}>Keep me signed in</span>
          </span>
          <button type="button" className="link" onClick={() => toast(email.trim() ? `Reset link sent to ${email.trim()}` : 'Enter your email first')}>Forgot password?</button>
        </div>
        <Button variant="primary" busy={busy} onClick={submit}>{busy ? 'Signing in' : 'Sign in'}</Button>
        <div className="demo-note">Demo accounts are filled in. Pick a role to see what each person gets.</div>
      </main>
      <footer className="login-foot"><span>© 2026 Pulse</span><span>Help · Privacy</span></footer>
    </div>
  );
}
