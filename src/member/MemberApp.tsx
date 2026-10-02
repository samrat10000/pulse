import clsx from 'clsx';
import { Calendar, CreditCard, House, LogOut, QrCode } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Clouds } from '@/components/Clouds';
import { Avatar } from '@/components/ui/Avatar';
import { IconButton } from '@/components/ui/Button';
import { greet } from '@/lib/format';
import { useDB, useStore } from '@/store/useStore';
import { Home, Pass, Plan, RenewSheet, Visits, type Tab } from './tabs';

const TABS: [Tab, typeof House, string][] = [['home', House, 'Home'], ['pass', QrCode, 'Pass'], ['visits', Calendar, 'Visits'], ['plan', CreditCard, 'Plan']];

/** /#/app/me — what a member sees on their phone */
export default function MemberApp() {
  const db = useDB();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>('home');
  const [sheet, setSheet] = useState(false);
  const body = useRef<HTMLElement>(null);
  const c = db.member;
  const go = (t: Tab) => { setTab(t); body.current?.scrollTo({ top: 0 }); };
  const logout = () => { nav('/login', { replace: true }); useStore.getState().logout(); };
  return (
    <div className="ma-wrap">
      <Clouds seed={6} />
      <div className="ma">
        <header className="ma-top">
          <div><Avatar name={c.name} /><div><small>{greet()}</small><b>{c.name.split(' ')[0]}</b></div></div>
          <IconButton icon={LogOut} label="Sign out" onClick={logout} />
        </header>
        <main className="ma-body" ref={body} key={tab}>
          {tab === 'home' && <Home go={go} />}
          {tab === 'pass' && <Pass />}
          {tab === 'visits' && <Visits />}
          {tab === 'plan' && <Plan onRenew={() => setSheet(true)} onLogout={logout} />}
        </main>
        <nav className="ma-tabs" aria-label="Member app">
          {TABS.map(([k, I, l]) => <button key={k} className={clsx(tab === k && 'on')} aria-current={tab === k ? 'page' : undefined} onClick={() => go(k)}><I size={20} /><span>{l}</span></button>)}
        </nav>
        {sheet && <RenewSheet onClose={() => setSheet(false)} />}
      </div>
      <p className="ma-note">This is what members see on their phone</p>
    </div>
  );
}
