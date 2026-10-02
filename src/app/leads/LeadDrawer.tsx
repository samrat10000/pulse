import { Mail, MessageCircle, Phone, RefreshCw, UserPlus, X } from 'lucide-react';
import { DueChip, StagePill, TempTag, Timeline } from '@/components/bits';
import { Avatar } from '@/components/ui/Avatar';
import { Button, IconButton } from '@/components/ui/Button';
import { followOpts, stageOpts, teamOpts } from '@/components/options';
import { Select } from '@/components/ui/Select';
import { findLead, leadActivity, repName } from '@/data/rules';
import type { StageKey } from '@/data/types';
import { ago, fmtDate } from '@/lib/format';
import { toast, useDB, useStore } from '@/store/useStore';

export default function LeadDrawer({ id }: { id: string }) {
  const db = useDB();
  const s = useStore.getState();
  const l = findLead(db, id);
  if (!l) return <div className="dw-head"><IconButton icon={X} label="Close" onClick={s.closeDrawer} /></div>;
  const lost = l.stage === 'Lost', none = <span className="muted">None</span>;
  return (
    <>
      <div className="dw-head">
        <IconButton icon={X} label="Close" onClick={s.closeDrawer} />
        <div>
          <IconButton icon={Phone} label="Call" onClick={() => toast(`Calling ${l.name} on ${l.phone}`)} />
          <IconButton icon={MessageCircle} label="WhatsApp" onClick={() => toast(`WhatsApp chat opened with ${l.name}`)} />
          {l.email && <IconButton icon={Mail} label="Email" onClick={() => toast(`Email draft opened for ${l.name}`)} />}
        </div>
      </div>
      <div className="dw-id">
        <Avatar name={l.name} size="lg" />
        <div style={{ minWidth: 0 }}><h2>{l.name}</h2><p className="num">{l.phone}</p>
          <div className="row gap6 mt8"><StagePill stage={l.stage} /><TempTag score={l.score} />{!!l.imported && <span className="tag">Imported</span>}</div></div>
      </div>
      <div className="dw-stats">
        <div><span>Interested in</span><b style={{ fontSize: 14 }}>{l.interest}</b></div>
        <div><span>Plan in mind</span><b style={{ fontSize: 14 }}>{l.planInterest}</b></div>
        <div><span>Lead score</span><b>{l.score} / 100</b></div>
      </div>
      {lost
        ? <Button className="btn-wide" icon={RefreshCw} onClick={() => { s.reopenLead(l.id); toast(`${l.name} reopened`); }}>Reopen lead</Button>
        : <Button variant="primary" className="btn-wide" icon={UserPlus} onClick={() => s.startConv('convert', l)}>Convert to client</Button>}
      <div className="dw-sec"><h4>Details</h4>
        <dl className="kv">
          <dt>Phone</dt><dd className="num">{l.phone || none}</dd>
          <dt>Email</dt><dd>{l.email || none}</dd>
          <dt>Source</dt><dd>{l.source}</dd>
          <dt>Added</dt><dd>{ago(l.createdAt)}</dd>
          {!lost && <>
            <dt>Stage</dt><dd><Select label="Stage" value={l.stage} options={stageOpts(true)} onChange={v => {
              // joining means a plan and a payment, so it goes through the convert form
              if (v === 'Joined') return s.startConv('convert', l);
              s.updateLead(l.id, { stage: v as StageKey, lastContact: 0 }); toast(`${l.name} moved to ${v}`);
            }} /></dd>
            <dt>Assigned to</dt><dd><Select label="Assigned to" value={l.owner} options={teamOpts(db)} onChange={v => { s.updateLead(l.id, { owner: v }); toast(`${l.name} assigned to ${repName(db, v)}`); }} /></dd>
            <dt>Follow-up</dt><dd className="row gap6"><DueChip d={l.follow} />
              <Select label="Reschedule follow-up" value="keep" placeholder="Reschedule…" options={followOpts()} onChange={v => { const f = v === '' ? null : +v; s.updateLead(l.id, { follow: f }); toast(f == null ? 'Follow-up cleared' : `Follow-up set for ${fmtDate(f)}`); }} /></dd>
          </>}
        </dl>
      </div>
      <Timeline id={l.id} acts={leadActivity(l)} by={repName(db, l.owner)} />
      {!lost && <button className="link" style={{ color: 'var(--red)', marginTop: 6 }} onClick={() => { s.markLost(l.id); toast(`${l.name} marked as lost`); }}>Mark as lost</button>}
    </>
  );
}
