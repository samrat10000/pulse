import { ArrowUpRight, CheckCheck, ChevronLeft, Phone, Send } from 'lucide-react';
import { Logo } from './Logo';

/** green WhatsApp verified tick (lucide has no filled variant) */
export const Verified = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-label="Verified business"><path d="M12 2l2.4 2.1 3.2-.3.9 3.1 2.8 1.6-1 3 1 3-2.8 1.6-.9 3.1-3.2-.3L12 22l-2.4-2.1-3.2.3-.9-3.1-2.8-1.6 1-3-1-3 2.8-1.6.9-3.1 3.2.3z" fill="#25D366" /><path d="m8.5 12 2.5 2.5 4.5-5" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

/** phone mockup of a WhatsApp business chat: header, beige chat, bubble with ticks, quick replies, input bar */
export function WhatsAppPhone({ gym, body, btns }: { gym: string; body: string; btns: string[] }) {
  return (
    <div className="wa-phone" aria-label="Message preview">
      <div className="wa-head">
        <span className="wa-back" style={{ transform: 'none' }}><ChevronLeft size={18} /></span>
        <Logo size={34} />
        <div><b>{gym} <Verified /></b><small>Business account</small></div>
      </div>
      <div className="wa-chat">
        <div className="wa-day">Today</div>
        <div className="wa-bubble" key={body}>{body.split('\n').map((l, i) => <span key={i}>{i > 0 && <br />}{l}</span>)}<small>7:02 PM <CheckCheck size={14} strokeWidth={2} /></small></div>
        <div className="wa-btns">{btns.map(b => { const I = b.includes('Call') || b.includes('Talk') ? Phone : ArrowUpRight; return <span key={b}><I size={13} />{b}</span>; })}</div>
      </div>
      <div className="wa-foot"><span>Message</span><Send size={16} /></div>
    </div>
  );
}
