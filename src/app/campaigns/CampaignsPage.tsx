import clsx from 'clsx';
import { Clock, Eye, IndianRupee, MessageCircle, Send, Trophy, Users } from 'lucide-react';
import { Kpis, PageHead, pressable } from '@/components/bits';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { fillVars, outcomeWord, segOf } from '@/data/rules';
import type { Campaign } from '@/data/types';
import { hash, agoMs, money } from '@/lib/format';
import { rng } from '@/lib/rng';
import { toast, useDB, useStore } from '@/store/useStore';

/** after sending, numbers fill in over ~9s: delivered → read → replied → renewed */
export function liveFunnel(id: string) {
  const s = useStore.getState(), c = s.db.campaigns.find(x => x.id === id);
  if (!c) return;
  const r = rng(hash(c.id)), target = { delivered: Math.round(c.n * .97), read: Math.round(c.n * (.74 + r() * .12)), replied: Math.round(c.n * (.12 + r() * .1)), won: Math.max(1, Math.round(c.n * (.08 + r() * .08))) };
  const price = segOf(c.seg).who === 'leads' ? 6499 : 11999;
  let step = 0;
  const iv = setInterval(() => {
    step++; const f = Math.min(1, step / 10), won = Math.round(target.won * Math.max(0, f * 2 - 1));
    useStore.getState().patchCampaign(id, {
      delivered: Math.round(target.delivered * Math.min(1, f * 2.5)), read: Math.round(target.read * f),
      replied: Math.round(target.replied * Math.max(0, f * 1.4 - .4)), won, revenue: won * price, live: f < 1,
    });
    if (f >= 1) clearInterval(iv);
  }, 900);
}

function CampCard({ c }: { c: Campaign }) {
  const db = useDB();
  const s = useStore.getState();
  const seg = segOf(c.seg), sched = c.status === 'Scheduled';
  const tpl = db.templates.find(t => t.k === c.tpl) || db.templates[0];
  const steps: [string, number][] = [['Sent', c.n], ['Delivered', c.delivered], ['Read', c.read], ['Replied', c.replied]];
  const sendNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    s.patchCampaign(c.id, { status: 'Sent', at: Date.now(), live: true });
    toast(`${c.name} is going out to ${c.n} people`);
    liveFunnel(c.id);
  };
  return (
    <div className={clsx('card cp-card', sched && 'sched', c.live && 'live')} {...pressable(() => s.openDrawer({ k: 'campaign', id: c.id }))} aria-label={`${c.name}, ${c.live ? 'sending' : c.status}`}>
      <div className="cp-top">
        <span className="wa-ic"><MessageCircle size={16} /></span>
        <div style={{ minWidth: 0 }}><b>{c.name}</b><small>{seg.t} · {sched ? `Sends ${new Date(c.at).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}, 7 PM` : agoMs(c.at)}</small></div>
        <Pill tone={sched ? 'violet' : c.live ? 'blue' : 'green'}>{c.live ? 'Sending' : c.status}</Pill>
      </div>
      <p className="cp-msg"><span>{fillVars(db, tpl.body, null)}</span></p>
      {sched ? (
        <div className="cp-sched"><span><Users size={14} /> {c.n} people</span><span><Clock size={14} /> Scheduled</span><button className="link" onClick={sendNow}>Send now</button></div>
      ) : (
        <>
          <div className="cp-funnel">{steps.map(([l, v]) => <div key={l}><b className="num">{v}</b><span>{l}</span><i style={{ width: `${(v / Math.max(1, c.n) * 100).toFixed(0)}%` }} /></div>)}</div>
          <div className="cp-out"><span><Trophy size={14} /> {c.won} {outcomeWord(c.seg)}</span>{c.revenue > 0 && <b>{money(c.revenue)}</b>}</div>
        </>
      )}
    </div>
  );
}

export default function CampaignsPage() {
  const db = useDB();
  const s = useStore.getState();
  const sent = db.campaigns.filter(c => c.status !== 'Scheduled'), tot = (k: 'n' | 'read' | 'replied' | 'revenue' | 'won') => sent.reduce((a, c) => a + c[k], 0);
  return (
    <>
      <PageHead title="Campaigns" sub="WhatsApp messages to members and leads, with replies and renewals tracked">
        <Button variant="primary" icon={Send} onClick={() => s.openModal({ k: 'composer' })}>New campaign</Button>
      </PageHead>
      <Kpis list={[
        { label: 'Messages sent, 30 days', v: tot('n'), fmt: 'num', d: `${sent.length} campaigns`, up: true, bg: '#D6E7FF', icon: Send, to: 'campaigns' },
        { label: 'Read rate', v: tot('read') / Math.max(1, tot('n')) * 100, fmt: 'pct', d: 'vs 20% email', up: true, bg: '#E5DEFC', icon: Eye, to: 'campaigns' },
        { label: 'Replies', v: tot('replied'), fmt: 'num', d: `${Math.round(tot('replied') / Math.max(1, tot('n')) * 100)}% replied`, up: true, bg: '#FFE36B', icon: MessageCircle, to: 'campaigns' },
        { label: 'Revenue from campaigns', v: tot('revenue'), fmt: 'money', d: `${tot('won')} came back`, up: true, bg: '#D3F1E1', icon: IndianRupee, to: 'campaigns' },
      ]} />
      <div className="cp-grid">{db.campaigns.map(c => <CampCard key={c.id} c={c} />)}</div>
    </>
  );
}
