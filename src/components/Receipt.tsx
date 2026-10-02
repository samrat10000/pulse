import { Download, MessageCircle, X } from 'lucide-react';
import { findClient } from '@/data/rules';
import { fmtDate } from '@/lib/format';
import { toast, useDB, useStore } from '@/store/useStore';
import { Logo } from './Logo';
import { Button, IconButton } from './ui/Button';

const GST = 0.18;
const r2 = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** GST split in paise so taxable + CGST + SGST always equals the amount exactly */
export function gstSplit(amount: number) {
  const paise = Math.round(amount * 100), base = Math.round(paise / (1 + GST)), tax = paise - base, half = Math.round(tax / 2);
  return { base: base / 100, cgst: half / 100, sgst: (tax - half) / 100 };
}

/** tax invoice modal; Download PDF prints only `.receipt` through the print CSS */
export function Receipt({ no }: { no: string }) {
  const db = useDB();
  const s = useStore.getState();
  const p = db.payments.find(x => x.no === no);
  if (!p) return null;
  const c = findClient(db, p.clientId);
  const { base, cgst, sgst } = gstSplit(p.amount);
  const later = db.payments.filter(x => x.clientId === p.clientId && x.kind === 'Balance' && x.no > p.no).reduce((a, x) => a + x.amount, 0);
  const bal = p.kind === 'Balance' ? (c?.due || 0) : Math.max(0, p.total - p.amount - later);

  const print = () => {
    document.body.classList.add('print-receipt');
    try { window.print(); } catch { toast('Printing is blocked here. Open the file in Chrome to save the PDF.'); }
    setTimeout(() => document.body.classList.remove('print-receipt'), 800);
  };

  return (
    <>
      <div className="modal-bar">
        <b>Receipt</b>
        <div className="row" style={{ gap: 8 }}>
          <Button size="sm" icon={MessageCircle} onClick={() => toast(`WhatsApp chat opened with ${c?.name ?? 'the member'}`)}><span>Send on WhatsApp</span></Button>
          <Button variant="primary" size="sm" icon={Download} onClick={print}><span>Download PDF</span></Button>
          <IconButton icon={X} size="sm" iconSize={15} label="Close" onClick={s.closeModal} />
        </div>
      </div>
      <div className="receipt" id="receipt">
        <div className="rc-head">
          <div className="row" style={{ gap: 12 }}><Logo size={40} /><div><b>{db.gym.name}</b><small>{db.gym.address}</small><small>GSTIN {db.gym.gst} · {db.gym.phone}</small></div></div>
          <div className="rc-no"><span>Tax invoice</span><b>{p.no}</b><small>{fmtDate(p.date, true)}</small></div>
        </div>
        <div className="rc-to">
          <div><span>Billed to</span><b>{c?.name ?? 'Former member'}</b><small>{c ? `${c.memberNo} · ${c.phone}` : ''}</small></div>
          <div style={{ textAlign: 'right' }}><span>Paid by</span><b>{p.mode}</b><small>{p.kind === 'Balance' ? 'Balance payment' : p.kind + ' membership'}</small></div>
        </div>
        <table className="rc-t">
          <thead><tr><th>Description</th><th>SAC</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
          <tbody><tr><td>{p.item}<small>Fitness centre services</small></td><td>999723</td><td className="num" style={{ textAlign: 'right' }}>{r2(base)}</td></tr></tbody>
        </table>
        <div className="rc-sum">
          <div><span>Taxable value</span><span>{r2(base)}</span></div>
          <div><span>CGST 9%</span><span>{r2(cgst)}</span></div>
          <div><span>SGST 9%</span><span>{r2(sgst)}</span></div>
          <div className="tot"><span>Amount received</span><span>{r2(p.amount)}</span></div>
          {bal > 0 && <div className="bal"><span>Balance due</span><span>{r2(bal)}</span></div>}
        </div>
        <div className="rc-foot"><span className={bal > 0 ? 'stamp part' : 'stamp'}>{bal > 0 ? 'Part paid' : 'Paid'}</span><p>Thank you for training with us. This is a computer-generated receipt and needs no signature.</p></div>
      </div>
    </>
  );
}
