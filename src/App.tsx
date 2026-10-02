import { LucideProvider } from 'lucide-react';
import { MotionConfig } from 'motion/react';
import { useEffect, useRef } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router';
import AppShell from '@/app/AppShell';
import Overlays from '@/app/Overlays';
import LoginPage from '@/auth/LoginPage';
import { Splash } from '@/components/Splash';
import { Toasts } from '@/components/ui/Toasts';
import JoinPage from '@/join/JoinPage';
import MemberApp from '@/member/MemberApp';
import type { DB, Note } from '@/data/types';
import { can, TITLES, useStore, type Page } from '@/store/useStore';

const PAGES = Object.keys(TITLES) as Page[];

/** /app/:page — sign-in and role guard */
function Guard() {
  const me = useStore(s => s.me);
  const { page = 'dashboard' } = useParams();
  const loc = useLocation();
  const warned = useRef('');
  const p = (PAGES.includes(page as Page) ? page : 'dashboard') as Page;
  const blocked = !!me && me.key !== 'member' && !can(me, p);

  useEffect(() => {
    if (blocked && warned.current !== loc.key) {
      warned.current = loc.key;
      useStore.getState().toast(`${TITLES[p]} isn't part of the ${me!.label.toLowerCase()} role`);
    }
  }, [blocked, p, me, loc.key]);

  useEffect(() => { if (!me) useStore.setState({ after: p }); }, [me, p]);

  if (!me) return <Navigate to="/login" replace />;
  if (me.key === 'member') return p === 'me' ? <MemberApp /> : <Navigate to="/app/me" replace />;
  if (p === 'me' || blocked || p !== page) return <Navigate to="/app/dashboard" replace />;
  return <AppShell page={p} />;
}

function Login() {
  const me = useStore(s => s.me);
  if (me) return <Navigate to={me.key === 'member' ? '/app/me' : '/app/dashboard'} replace />;
  return <LoginPage />;
}

/** page titles + a second tab's enquiries arriving over BroadcastChannel */
function Effects() {
  const loc = useLocation();
  const me = useStore(s => s.me);
  const gym = useStore(s => s.db.gym.name);
  useEffect(() => {
    const p = loc.pathname.split('/')[2] as Page | undefined;
    document.title = loc.pathname.startsWith('/join') ? `Free trial · ${gym}` : !me ? 'Sign in · Pulse' : me.key === 'member' ? `${gym} · My membership` : `${TITLES[p && TITLES[p] ? p : 'dashboard']} · Pulse`;
  }, [loc.pathname, me, gym]);
  useEffect(() => {
    let ch: BroadcastChannel | null = null;
    try {
      ch = new BroadcastChannel('pulse');
      ch.onmessage = (e: MessageEvent<{ type: string; lead: DB['leads'][number]; note: Note[] }>) => {
        const d = e.data, s = useStore.getState();
        if (d?.type !== 'lead' || s.db.leads.some(l => l.id === d.lead.id)) return;
        s.receiveLead(d.lead, d.note);
        if (s.me) s.toast(`New enquiry: ${d.lead.name} wants a free trial`);
      };
    } catch { /* BroadcastChannel unavailable */ }
    return () => ch?.close();
  }, []);
  return null;
}

export default function App() {
  return (
    <LucideProvider size={16} strokeWidth={1.75}>
      <MotionConfig reducedMotion="user">
        <HashRouter>
          <Effects />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/join" element={<JoinPage />} />
            <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
            <Route path="/app/:page" element={<Guard />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          <Overlays />
          <Splash />
        </HashRouter>
        <Toasts />
      </MotionConfig>
    </LucideProvider>
  );
}
