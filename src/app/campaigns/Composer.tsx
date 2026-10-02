import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Send, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { ICONS } from '@/components/icons';
import { Ring } from '@/components/ui/Ring';
import { Button, IconButton } from '@/components/ui/Button';
import { WhatsAppPhone } from '@/components/WhatsAppPhone';
import { fillVars, SEGMENTS, segOf } from '@/data/rules';
import { DAY, TODAY0 } from '@/lib/dates';
import { reduced } from '@/lib/env';
import { money } from '@/lib/format';
import type { Campaign, SegmentKey } from '@/data/types';
import { toast, useDB, useStore } from '@/store/useStore';
import { liveFunnel } from './CampaignsPage';

const VARS = ['name', 'plan', 'expiry', 'trainer', 'gym'];
/** tomorrow 7 PM in the datetime-local format */
const tomorrow7 = () => new Date(TODAY0 + DAY + 19 * 3600e3 - new Date().getTimezoneOffset() * 60e3).toISOString().slice(0, 16);

export default function Composer({ seg: seg0 }: { seg?: SegmentKey }) {
  const db = useDB();
  const me = useStore(s => s.me)!;
  const s = useStore.getState();
  const start = seg0 || (me.key === 'sales' ? 'hot' : 'ending7');
  const t0 = db.templates.find(x => x.seg === start && !x.hidden) || db.templates[0];
  const [seg, setSeg] = useState<SegmentKey>(start);
  const [tpl, setTpl] = useState(t0.k);
  const [body, setBody] = useState(t0.body);
  const [when, setWhen] = useState<'now' | 'later'>('now');
  const [at, setAt] = useState(tomorrow7);
  const [pi, setPi] = useState(0);
  const [sending, setSending] = useState<{ n: number; total: number } | null>(null);
  const ta = useRef<HTMLTextAreaElement>(null);

  const list = segOf(seg).list(db), who = list[pi % Math.max(1, list.length)] ?? null;
  const T = db.templates.find(x => x.k === tpl) || db.templates[0];
  const cost = Math.max(1, Math.round(list.length * .8));
  const segs = SEGMENTS.filter(x => me.key !== 'sales' || x.who === 'leads' || x.k === 'expired');

  const pickSeg = (k: SegmentKey) => { setSeg(k); setPi(0); const t = db.templates.find(x => x.seg === k && !x.hidden); if (t) { setTpl(t.k); setBody(t.body); } };
  const insert = (v: string) => {
    const el = ta.current, ins = `{${v}}`;
    const a = el ? el.selectionStart ?? body.length : body.length, b = el ? el.selectionEnd ?? a : a;
    setBody(body.slice(0, a) + ins + body.slice(b));
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(a + ins.length, a + ins.length); });
  };

  const send = () => {
    const c: Campaign = { id: 'cp' + Date.now(), name: T.t, seg, tpl: T.k, at: when === 'later' ? new Date(at).getTime() || Date.now() + DAY : Date.now(), status: when === 'later' ? 'Scheduled' : 'Sent', n: list.length, delivered: 0, read: 0, replied: 0, won: 0, revenue: 0, live: when === 'now' };
    if (body !== T.body) { const k = 'custom' + Date.now(); s.mutate(d => { d.templates.push({ k, t: T.t, seg, btns: T.btns, body, hidden: true }); }); c.tpl = k; }
    s.addCampaign(c);
    if (when === 'later') { s.closeModal(); return toast(`${c.name} scheduled for ${list.length} people`); }
    const total = list.length, t0 = performance.now(), d = reduced ? 10 : Math.min(2400, 800 + total * 25);
    setSending({ n: 0, total });
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / d);
      setSending({ n: Math.round(total * p), total });
      if (p < 1) requestAnimationFrame(tick);
      else { s.closeModal(); toast(`${c.name} sent to ${total} people`); liveFunnel(c.id); }
    };
    requestAnimationFrame(tick);
  };

  if (sending) return (
    <div className="sending" role="status">
      <div className="send-ring"><Ring rings={[{ v: 1, c: '#25D366' }]} size={120} w={8} /><span className="num">{sending.n}</span></div>
      <h3>Sending on WhatsApp</h3>
      <p className="muted"><span>{sending.n}</span> of {sending.total} messages sent</p>
    </div>
  );

  return (
    <>
      <div className="modal-bar"><b>New WhatsApp campaign</b><IconButton icon={X} size="sm" iconSize={15} label="Close" onClick={s.closeModal} /></div>
      <div className="cmp">
        <div className="cmp-l">
          <div className="cmp-step"><span className="n">1</span><b>Who gets it</b></div>
          <div className="segs" role="radiogroup" aria-label="Who gets it">
            {segs.map(x => { const I = ICONS[x.ic]; return (
              <button key={x.k} role="radio" aria-checked={seg === x.k} className={clsx('seg-c', seg === x.k && 'on')} onClick={() => pickSeg(x.k)}>
                <span className="seg-ic"><I size={15} /></span><span><b>{x.t}</b><small>{x.d}</small></span><em className="num">{x.list(db).length}</em>
              </button>
            ); })}
          </div>
          <div className="cmp-step"><span className="n">2</span><b>Message</b></div>
          <div className="tpl-row">{db.templates.filter(x => !x.hidden).map(x => <button key={x.k} className={clsx('chip', tpl === x.k && 'on')} aria-pressed={tpl === x.k} onClick={() => { setTpl(x.k); setBody(x.body); }}>{x.t}</button>)}</div>
          <div className="wa-edit">
            <textarea ref={ta} rows={5} aria-label="Message" maxLength={1024} value={body} onChange={e => setBody(e.target.value)} />
            <div className="vars"><span>Insert</span>{VARS.map(v => <button key={v} onClick={() => insert(v)}>{`{${v}}`}</button>)}<span className="cnt num">{body.length} / 1024</span></div>
          </div>
          <div className="cmp-step"><span className="n">3</span><b>When</b></div>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <div className="seg">{([['now', 'Send now'], ['later', 'Schedule']] as const).map(([k, l]) => <button key={k} className={clsx(when === k && 'on')} aria-pressed={when === k} onClick={() => setWhen(k)}>{l}</button>)}</div>
            {when === 'later' && <input type="datetime-local" className="dt" aria-label="Send at" value={at} onChange={e => setAt(e.target.value)} />}
          </div>
        </div>
        <div className="cmp-r">
          <WhatsAppPhone gym={db.gym.name} body={fillVars(db, body, who)} btns={T.btns} />
          <div className="wa-who">
            {list.length && who ? (
              <>
                <IconButton icon={ChevronLeft} size="sm" iconSize={14} label="Previous recipient" onClick={() => setPi((pi - 1 + list.length) % list.length)} />
                <span>Preview for <b>{who.name.split(' ')[0]}</b> · {pi % list.length + 1} of {list.length}</span>
                <IconButton icon={ChevronRight} size="sm" iconSize={14} label="Next recipient" onClick={() => setPi((pi + 1) % list.length)} />
              </>
            ) : <span>Nobody in this group right now</span>}
          </div>
        </div>
      </div>
      <div className="cmp-foot">
        <span className="muted">{list.length} people · about {money(cost)} in WhatsApp charges</span>
        <Button variant="primary" icon={Send} disabled={!list.length || !body.trim()} onClick={send}>{when === 'now' ? `Send to ${list.length} people` : 'Schedule campaign'}</Button>
      </div>
    </>
  );
}
