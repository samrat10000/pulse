import clsx from 'clsx';
import {
  ChevronsUpDown, IndianRupee, LayoutDashboard, LogOut, ScanLine, Send, Settings, TrendingUp, Trophy, Upload, User, UserPlus, Users, type LucideIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { Brand } from '@/components/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { IconButton } from '@/components/ui/Button';
import { checkinsToday, dueToday, duesList, expiringCount, revenue30, teamStats } from '@/data/rules';
import { TARGET } from '@/data/seed';
import { money } from '@/lib/format';
import { can, useDB, useStore, type Page } from '@/store/useStore';
import { useLogout } from './AppShell';

export const NAV: [string, [Page, LucideIcon, string][]][] = [
  ['Overview', [['dashboard', LayoutDashboard, 'Dashboard'], ['reports', TrendingUp, 'Reports']]],
  ['People', [['leads', UserPlus, 'Leads'], ['clients', Users, 'Clients'], ['team', Trophy, 'Sales team'], ['campaigns', Send, 'Campaigns']]],
  ['Front desk', [['checkin', ScanLine, 'Check-in desk'], ['payments', IndianRupee, 'Payments']]],
  ['Data', [['import', Upload, 'Import']]],
  ['Account', [['settings', Settings, 'Settings'], ['profile', User, 'Profile']]],
];

function TargetCard() {
  const db = useDB();
  const me = useStore(s => s.me)!;
  const unit = (t: string) => <span style={{ opacity: .8, fontSize: 12.5 }}> {t}</span>;
  if (me.key === 'desk') {
    const n = checkinsToday(db);
    return <div className="target"><small>Check-ins today</small><b>{n}</b>{unit('members')}<div className="tbar"><i style={{ width: `${Math.min(100, n / 180 * 100)}%` }} /></div><p>Usual day is around 180</p></div>;
  }
  if (me.key === 'sales') {
    const t = teamStats(db).find(x => x.id === me.id) || { revenue: 0, target: 1 };
    const pct = Math.round(t.revenue / t.target * 100);
    return <div className="target"><small>My target, last 30 days</small><b>{money(t.revenue, true)}</b>{unit(`of ${money(t.target, true)}`)}<div className="tbar"><i style={{ width: `${Math.min(100, pct)}%` }} /></div><p>{pct >= 100 ? `Target beaten, ${pct}%` : `${pct}% there`}</p></div>;
  }
  const rev = revenue30(db), pct = Math.min(100, Math.round(rev / TARGET * 100));
  return <div className="target"><small>{new Date().toLocaleDateString('en-IN', { month: 'long' })} revenue target</small><b>{money(rev, true)}</b>{unit(`of ${money(TARGET, true)}`)}<div className="tbar"><i style={{ width: `${pct}%` }} /></div><p>{pct}% there, {Math.max(0, 30 - new Date().getDate())} days to go</p></div>;
}

export default function Sidebar({ page }: { page: Page }) {
  const db = useDB();
  const me = useStore(s => s.me)!;
  const open = useStore(s => s.ui.side);
  const s = useStore.getState();
  const nav = useNavigate();
  const logout = useLogout();
  const badges: Partial<Record<Page, [number, string, string]>> = {
    leads: [dueToday(db, me), 'hot', 'Follow-ups due'], clients: [expiringCount(db), '', 'Ending in 14 days'],
    payments: [duesList(db).length, '', 'Members with dues'], checkin: [checkinsToday(db), 'live', 'Checked in today'],
  };
  const go = (p: Page) => { nav('/app/' + p); s.setUi({ side: false }); };
  return (
    <>
      <aside className={clsx('side', open && 'open')} aria-label="Main navigation">
        <div className="side-in">
          <Brand />
          <button className="gym" onClick={() => s.toast('Only one branch on this account')}>
            <span className="gym-m">IH</span><span style={{ minWidth: 0 }}><b>{db.gym.name}</b><small>{db.gym.branch}</small></span><ChevronsUpDown size={15} />
          </button>
          <nav>
            {NAV.map(([label, items]) => {
              const vis = items.filter(([k]) => can(me, k));
              if (!vis.length) return null;
              return (
                <div key={label}>
                  <div className="nav-l">{label}</div>
                  {vis.map(([k, I, l]) => { const b = badges[k]; return (
                    <button key={k} className={clsx('nav-i', page === k && 'on')} aria-current={page === k ? 'page' : undefined} onClick={() => go(k)}>
                      <I size={17} />{l}
                      {b && b[0] > 0 && <span className={`badge ${b[1]}`} title={b[2]} aria-label={`${b[0]} ${b[2].toLowerCase()}`}>{b[1] === 'live' && <i />}{b[0]}</span>}
                    </button>
                  ); })}
                </div>
              );
            })}
          </nav>
          <div className="side-sp" />
          <TargetCard />
          <div className="me-row">
            <button onClick={() => go('profile')}><Avatar name={me.name} /><span style={{ minWidth: 0 }}><b>{me.name}</b><small>{me.role}</small></span></button>
            <IconButton icon={LogOut} size="sm" iconSize={15} label="Sign out" onClick={logout} />
          </div>
        </div>
      </aside>
      <div className={clsx('side-bd', open && 'open')} onClick={() => s.setUi({ side: false })} />
    </>
  );
}
