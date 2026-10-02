import clsx from 'clsx';
import { ArrowRight, Check, Clock, Delete, Expand, QrCode, RefreshCw, Search, Snowflake, UserPlus, Users, X, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Empty, PageHead, pressable, StatusPill } from '@/components/bits';
import { Hill } from '@/components/Hill';
import { Logo } from '@/components/Logo';
import { QR } from '@/components/QR';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Ring } from '@/components/ui/Ring';
import { checkedInToday, checkinsToday, clientStatus, demoMembers, findClient, memberDigits, streakOf, timeOf, todaysCheckins } from '@/data/rules';
import type { Client } from '@/data/types';
import { reduced } from '@/lib/env';
import { ago, fmtDate, phoneKey } from '@/lib/format';
import { toast, useDB, useStore } from '@/store/useStore';
import { CheckinChart } from '../dashboard/blocks';

type Kind = 'ok' | 'soon' | 'expired' | 'frozen' | 'again' | 'none';
interface Result { kind: Kind; c?: Client; at?: number; code?: string; key: number }

const LIFE: Record<Kind, number> = { ok: 4200, again: 4200, soon: 9000, expired: 9000, frozen: 9000, none: 9000 };
const TONE: Record<Kind, string> = { ok: 'ok', soon: 'soon', expired: 'bad', frozen: 'frozen', again: 'info', none: 'bad' };
const ICON: Record<Kind, LucideIcon> = { ok: Check, soon: Clock, expired: X, frozen: Snowflake, again: Check, none: Search };
const BADGE: Record<Kind, string> = { ok: 'Checked in', soon: 'Checked in', again: 'Already in', none: 'Not found', expired: 'Entry paused', frozen: 'Entry paused' };

function ResultCard({ r, out, onClose, onUnfreeze }: { r: Result; out: boolean; onClose: () => void; onUnfreeze: () => void }) {
  const s = useStore.getState();
  const c = r.c, first = c?.name.split(' ')[0] ?? '';
  const title = { ok: `Welcome back, ${first}`, soon: `Welcome, ${first}`, expired: 'Membership has ended', frozen: 'Membership is frozen', again: 'Already checked in', none: 'No member found' }[r.kind];
  const text = {
    ok: 'Have a strong session.',
    soon: c ? `Your plan ends ${c.end === 0 ? 'today' : `in ${c.end} day${c.end > 1 ? 's' : ''}`}. Renew at the desk to keep your streak.` : '',
    expired: c ? `Ended ${-c.end} days ago on ${fmtDate(c.end, true)}. Please renew to check in.` : '',
    frozen: 'Unfreeze it to start training again.',
    again: r.at ? `Checked in at ${timeOf(r.at)} today. Enjoy the session.` : '',
    none: `Nothing matches ${r.code}. New here? Add them as a lead.`,
  }[r.kind];
  const I = ICON[r.kind], daysLeft = c ? Math.max(0, c.end) : 0, len = c ? Math.max(1, c.end - c.start) : 1;
  return (
    <div className={clsx('k-result', TONE[r.kind], out && 'out')} role="status" style={{ '--life': `${LIFE[r.kind]}ms` } as React.CSSProperties}>
      <div className="kr-in">
        {c ? <div className="kr-av"><Avatar name={c.name} size="lg" /><Ring rings={[{ v: daysLeft / len, c: '#fff' }]} size={104} w={6} /></div> : <div className="kr-ic"><I size={40} strokeWidth={2} /></div>}
        <div className="kr-badge"><I size={15} strokeWidth={2.6} />{BADGE[r.kind]}</div>
        <h2>{title}</h2><p>{text}</p>
        {c && (
          <>
            <div className="kr-stats">
              <div><b>{c.visits}</b><span>visits this month</span></div>
              {r.kind === 'expired' || r.kind === 'frozen' ? <div><b>{c.lastVisit ? ago(c.lastVisit) : 'Today'}</b><span>last visit</span></div> : <div><b>{streakOf(c)}</b><span>day streak</span></div>}
              <div><b>{daysLeft}</b><span>days left</span></div>
              <div><b>{c.trainer.split(' ')[0]}</b><span>trainer</span></div>
            </div>
            <small className="kr-id">{c.memberNo} · {c.plan} plan</small>
          </>
        )}
        <div className="kr-acts">
          {(r.kind === 'expired' || r.kind === 'soon') && <Button variant="white" icon={RefreshCw} onClick={() => { onClose(); s.startConv('renew', c); }}>Renew now</Button>}
          {r.kind === 'frozen' && <Button variant="white" icon={Snowflake} onClick={onUnfreeze}>Unfreeze and check in</Button>}
          {r.kind === 'none' && <Button variant="white" icon={UserPlus} onClick={() => { onClose(); s.openDrawer({ k: 'newLead', phone: r.code!.length === 10 ? '+91 ' + r.code : '', source: 'Walk-in' }); }}>Add as lead</Button>}
          <Button variant="glass" onClick={onClose}>Done</Button>
        </div>
      </div>
      <i className="kr-timer" />
    </div>
  );
}

function Kiosk() {
  const db = useDB();
  const kiosk = useStore(s => s.ui.kiosk);
  const s = useStore.getState();
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [res, setRes] = useState<Result | null>(null);
  const [out, setOut] = useState(false);
  const [scan, setScan] = useState<{ c: Client; hit: boolean } | null>(null);
  const [now, setNow] = useState(new Date());
  const timer = useRef(0);
  const state = useRef({ code, res, scan });
  state.current = { code, res, scan };

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 10000); return () => { clearInterval(t); clearTimeout(timer.current); }; }, []);

  const close = () => {
    clearTimeout(timer.current);
    if (!state.current.res) return;
    setOut(true);
    timer.current = window.setTimeout(() => { setRes(null); setOut(false); }, 300);
  };
  const show = (r: Omit<Result, 'key'>) => {
    clearTimeout(timer.current); setOut(false);
    setRes({ ...r, key: Date.now() });
    timer.current = window.setTimeout(close, LIFE[r.kind]);
  };
  const submit = (raw = state.current.code) => {
    if (raw.length !== 4 && raw.length !== 10) { setMsg('Enter a 10-digit phone number or a 4-digit member ID'); return; }
    const db = s.db;
    const c = raw.length === 4 ? db.clients.find(x => memberDigits(x) === raw) : db.clients.find(x => phoneKey(x.phone) === raw);
    setCode(''); setMsg('');
    if (!c) return show({ kind: 'none', code: raw });
    const prior = checkedInToday(db, c.id), st = clientStatus(c);
    if (prior) return show({ kind: 'again', c, at: prior.at });
    if (st === 'Expired') return show({ kind: 'expired', c });
    if (st === 'Frozen') return show({ kind: 'frozen', c });
    s.checkin(c.id);
    show({ kind: c.end <= 7 ? 'soon' : 'ok', c });
  };
  const press = (k: string) => {
    setMsg('');
    if (k === 'back') setCode(x => x.slice(0, -1));
    else if (k === 'clear') setCode('');
    else setCode(x => (x.length < 10 ? x + k : x));
  };
  const unfreeze = () => {
    const c = state.current.res?.c; if (!c) return;
    s.toggleFreeze(c.id); close(); toast(`${c.name}'s membership is active again`);
    setTimeout(() => submit(memberDigits(c)), 320);
  };
  const startScan = () => {
    const pool = s.db.clients.filter(c => !c.frozen && c.end >= 0 && !checkedInToday(s.db, c.id));
    const c = pool[Math.floor(Math.random() * pool.length)]; if (!c) return;
    setScan({ c, hit: false });
    setTimeout(() => setScan(x => x && { ...x, hit: true }), reduced ? 50 : 1300);
    setTimeout(() => { setScan(null); submit(memberDigits(c)); }, reduced ? 100 : 1750);
  };

  // physical keyboard: digits, Backspace and Enter whenever no input has focus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useStore.getState(), t = e.target as HTMLElement;
      if (st.drawer || st.modal || st.cmdk || e.metaKey || e.ctrlKey || e.altKey || t.matches?.('input,textarea,select')) return;
      if (e.key === 'Escape') {
        if (state.current.res) { e.preventDefault(); close(); }
        else if (st.ui.kiosk) { e.preventDefault(); toggleKiosk(false); }
        return;
      }
      if (/^\d$/.test(e.key)) { e.preventDefault(); if (state.current.res) close(); press(e.key); return; }
      if (e.key === 'Backspace') { e.preventDefault(); press('back'); return; }
      if (e.key === 'Enter' && !state.current.res && !(t.closest?.('button'))) { e.preventDefault(); submit(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="kiosk-card">
      <div className="k-top">
        <div className="row" style={{ gap: 10 }}><Logo size={34} /><div><b>{db.gym.name}</b><small>Member check-in</small></div></div>
        <div className="k-clock"><b>{now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</b><small style={{ display: 'block' }}>{now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</small></div>
        {kiosk && <button className="k-exit" aria-label="Exit kiosk mode" onClick={() => toggleKiosk(false)}><X size={18} /></button>}
      </div>
      <div className="k-body">
        <div className="k-left">
          <h2>Ready to train?</h2><p>Enter your phone number or 4-digit member ID</p>
          <div className={clsx('k-display', msg && 'bad')} aria-live="polite" aria-label="Entered code">
            <span className={code ? '' : 'ph'}>{code ? code.replace(/^(\d{5})(\d)/, '$1 $2') : 'Phone or member ID'}</span><i className="caret" />
          </div>
          <p className="k-msg" role={msg ? 'alert' : undefined}>{msg}</p>
          <div className="k-demo"><span>Try a demo member:</span>
            {demoMembers(db).map(([l, c]) => <button key={l} onClick={() => { const d = memberDigits(c); setCode(d); setMsg(''); setTimeout(() => submit(d), reduced ? 0 : 350); }}>{l} <b>{memberDigits(c)}</b></button>)}
          </div>
        </div>
        <div className="k-pad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'].map(k => (
            <button key={k} className={clsx('key', k.length > 1 && 'fn')} aria-label={k === 'back' ? 'Delete' : k === 'clear' ? 'Clear' : k} onClick={() => press(k)}>
              {k === 'back' ? <Delete size={22} /> : k === 'clear' ? 'Clear' : k}
            </button>
          ))}
          <button className="key go" onClick={() => submit()}><ArrowRight size={20} strokeWidth={2.2} /> Check in</button>
          <button className="key scan" onClick={startScan}><QrCode size={18} /> Scan pass</button>
        </div>
      </div>
      <Hill seed={12} peak={120} base={200} blades={260} poppies={16} daisies={16} id="ki" w={1200} h={200} />
      {res && <ResultCard key={res.key} r={res} out={out} onClose={close} onUnfreeze={unfreeze} />}
      {scan && (
        <div className={clsx('k-scan', scan.hit && 'hit')} role="status">
          <div className="scan-frame"><i /><i /><i /><i /><div className="scan-line" /><div className="scan-qr"><QR text={scan.c.memberNo} px={150} fg="#fff" transparent /></div></div>
          <p>Hold the member pass up to the camera</p><small>Demo scan</small>
        </div>
      )}
    </div>
  );
}

function toggleKiosk(on: boolean) {
  useStore.getState().setUi({ kiosk: on });
  try {
    if (on) void document.documentElement.requestFullscreen?.().catch(() => {});
    else if (document.fullscreenElement) void document.exitFullscreen();
  } catch { /* fullscreen not allowed here */ }
}

function Feed() {
  const db = useDB();
  const s = useStore.getState();
  const list = todaysCheckins(db).slice(0, 7);
  // newest row flashes green when it has just arrived
  const fresh = !!list[0] && list[0].at > Date.now() - 5000;
  return (
    <Card title="Just checked in" icon={Users} right={<span className="muted" style={{ fontSize: 12.5 }}>{checkinsToday(db)} today</span>}>
      <div className="list" aria-live="polite">
        {list.length ? list.map((x, i) => { const c = findClient(db, x.id); return c && (
          <div key={x.id + x.at} className={clsx('fu', i === 0 && fresh && 'fresh-in')} {...pressable(() => s.openDrawer({ k: 'client', id: c.id }))}>
            <Avatar name={c.name} />
            <div className="li-main"><div className="li-t">{c.name}</div><div className="li-s">{c.plan} · {timeOf(x.at)}</div></div>
            <StatusPill s={clientStatus(c)} />
          </div>
        ); }) : <Empty compact title="No one yet" text="Doors open at 5:30 AM." />}
      </div>
    </Card>
  );
}

export default function CheckinPage() {
  const kiosk = useStore(s => s.ui.kiosk);
  useEffect(() => {
    const onFs = () => { if (!document.fullscreenElement && useStore.getState().ui.kiosk) useStore.getState().setUi({ kiosk: false }); };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);
  return (
    <>
      <PageHead title="Check-in desk" sub="Members type their phone number or member ID, or scan their pass.">
        <Button icon={Expand} onClick={() => toggleKiosk(!kiosk)}>Kiosk mode</Button>
      </PageHead>
      <div className="ci-grid">
        <Kiosk />
        <div className="ci-side"><CheckinChart /><Feed /></div>
      </div>
    </>
  );
}
