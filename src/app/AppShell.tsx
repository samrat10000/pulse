import clsx from 'clsx';
import { Bell, ChevronRight, Menu, Moon, Search, Sun } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { ROLE_ICON } from '@/components/icons';
import { IconButton } from '@/components/ui/Button';
import { dueToday, expiringCount } from '@/data/rules';
import { MOD } from '@/lib/env';
import { TITLES, useDB, useStore, type Page, type Theme } from '@/store/useStore';
import CommandPalette from './CommandPalette';
import Sidebar from './Sidebar';
import CampaignsPage from './campaigns/CampaignsPage';
import CheckinPage from './checkin/CheckinPage';
import ClientsPage from './clients/ClientsPage';
import Dashboard from './dashboard/Dashboard';
import ImportPage from './import/ImportPage';
import LeadsPage from './leads/LeadsPage';
import PaymentsPage from './payments/PaymentsPage';
import ProfilePage from './profile/ProfilePage';
import ReportsPage from './reports/ReportsPage';
import SettingsPage from './settings/SettingsPage';
import TeamPage from './team/TeamPage';

const VIEWS: Record<Exclude<Page, 'me'>, () => ReactNode> = {
  dashboard: Dashboard, reports: ReportsPage, leads: LeadsPage, clients: ClientsPage, team: TeamPage, campaigns: CampaignsPage,
  checkin: CheckinPage, payments: PaymentsPage, import: ImportPage, settings: SettingsPage, profile: ProfilePage,
};

export const isDark = (t: Theme) => t === 'dark' || (t === 'system' && (() => { try { return matchMedia('(prefers-color-scheme: dark)').matches; } catch { return false; } })());

/** sign out: leave the app first so the guard doesn't remember the page */
export function useLogout() {
  const nav = useNavigate();
  return () => { nav('/login', { replace: true }); useStore.getState().logout(); };
}

function Topbar({ page }: { page: Page }) {
  const db = useDB();
  const me = useStore(s => s.me)!;
  const theme = useStore(s => s.theme);
  const s = useStore.getState();
  const dark = isDark(theme);
  const RI = ROLE_ICON[me.key];
  return (
    <header className="topbar"><div className="topbar-in">
      <IconButton icon={Menu} className="menu-btn" iconSize={17} label="Open menu" onClick={() => s.setUi({ side: true })} />
      <div className="crumb"><span className="hide-s">{db.gym.name}</span><span className="hide-s"><ChevronRight size={13} /></span><b>{TITLES[page]}</b></div>
      <div className="tb-right row" style={{ gap: 8 }}>
        <span className="role-chip hide-s" title="Signed in as"><RI size={13} />{me.label}</span>
        <button className="searchbtn" onClick={() => s.setCmdk(true)} aria-label="Search members, leads and pages"><Search size={15} /><span>Search members, leads</span><kbd>{MOD} K</kbd></button>
        <IconButton icon={dark ? Sun : Moon} label="Switch theme" onClick={() => s.setTheme(dark ? 'light' : 'dark')} />
        <IconButton icon={Bell} className="bell" label="Notifications" onClick={() => s.toast(`${dueToday(db, me)} follow-ups and ${expiringCount(db)} renewals need attention`)}><i /></IconButton>
      </div>
    </div></header>
  );
}

export default function AppShell({ page }: { page: Exclude<Page, 'me'> }) {
  const kiosk = useStore(s => s.ui.kiosk);
  const View = VIEWS[page];

  useEffect(() => { window.scrollTo(0, 0); useStore.getState().setUi({ side: false }); }, [page]);
  useEffect(() => { if (page !== 'checkin' && useStore.getState().ui.kiosk) useStore.getState().setUi({ kiosk: false }); }, [page]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useStore.getState();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); s.setCmdk(!s.cmdk); return; }
      if (e.key === 'Escape' && s.ui.side && !s.drawer && !s.modal && !s.cmdk) s.setUi({ side: false });
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className={clsx('shell', kiosk && 'kiosk')}>
      <Sidebar page={page} />
      <div className="main">
        <Topbar page={page} />
        <main className="page">
          <motion.div key={page} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .25, ease: [.22, .61, .36, 1] }}>
            <View />
          </motion.div>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
