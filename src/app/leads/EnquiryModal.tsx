import { ArrowUpRight, Copy, Download, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Clouds } from '@/components/Clouds';
import { Logo } from '@/components/Logo';
import { QR } from '@/components/QR';
import { Button, IconButton } from '@/components/ui/Button';
import { JOIN_URL } from '@/data/seed';
import { JoinForm } from '@/join/JoinForm';
import { qrSvg } from '@/lib/qr';
import { toast, useDB, useStore } from '@/store/useStore';

export default function EnquiryModal() {
  const db = useDB();
  const nav = useNavigate();
  const s = useStore.getState();
  const n = db.leads.filter(x => x.source === 'Enquiry link').length;

  const copy = () => {
    try { navigator.clipboard.writeText(JOIN_URL).then(() => toast('Link copied'), () => toast(JOIN_URL)); }
    catch { toast(JOIN_URL); }
  };
  const download = () => {
    try {
      const svg = qrSvg(JOIN_URL, 600).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      a.download = 'ironhouse-enquiry-qr.svg';
      document.body.appendChild(a); a.click(); a.remove();
      toast('QR code downloaded');
    } catch { toast('Downloads are blocked here'); }
  };

  return (
    <>
      <div className="modal-bar"><b>Enquiry link</b><IconButton icon={X} size="sm" iconSize={15} label="Close" onClick={s.closeModal} /></div>
      <div className="enq">
        <div className="enq-l">
          <h3>Get leads while you sleep</h3>
          <p>Put this link in your Instagram bio, Google profile and WhatsApp status. Print the QR for reception. Every form lands in Leads, assigned to the advisor with the fewest open leads.</p>
          <div className="qr-box"><QR text={JOIN_URL} px={168} /><div><small>Scan to open</small><b>Book a free trial</b><span>{db.gym.name}</span></div></div>
          <div className="link-row"><span className="num">{JOIN_URL}</span><Button size="sm" icon={Copy} onClick={copy}>Copy</Button></div>
          <div className="row" style={{ gap: 8, marginTop: 12 }}>
            <Button size="sm" icon={Download} onClick={download}>Download QR</Button>
            <Button size="sm" icon={ArrowUpRight} onClick={() => { s.closeModal(); nav('/join'); }}>Open full page</Button>
          </div>
          <div className="enq-stat"><b aria-live="polite">{n}</b><span>leads from this link so far. Fill the phone on the right to watch one arrive.</span></div>
        </div>
        <div className="enq-r">
          <div className="phone">
            <div className="phone-notch" />
            <div className="phone-scr">
              <div className="jp-head"><Clouds seed={4} /><div className="jp-brand"><Logo size={28} /><b>{db.gym.name}</b></div><h4>Start your fitness journey</h4><p>Book a free trial session</p></div>
              <div className="jp-body"><JoinForm where="phone" /></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
