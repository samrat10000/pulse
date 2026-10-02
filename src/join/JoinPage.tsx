import { Clock, Dumbbell, Users } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Clouds } from '@/components/Clouds';
import { Hill } from '@/components/Hill';
import { Logo } from '@/components/Logo';
import { Music } from '@/lib/music';
import { useDB, useStore } from '@/store/useStore';
import { JoinForm } from './JoinForm';

/** /#/join — the public free-trial page behind the enquiry link and QR */
export default function JoinPage() {
  const db = useDB();
  const me = useStore(s => s.me);
  const nav = useNavigate();
  useEffect(() => { Music.stop(); window.scrollTo(0, 0); }, []);
  return (
    <div className="join-page">
      <Clouds seed={7} />
      <Hill seed={8} peak={300} base={520} blades={600} poppies={50} daisies={45} id="jp" />
      <main className="join-card">
        <div className="jp-brand"><Logo size={32} /><b>{db.gym.name}</b>{me && <button className="link" style={{ marginLeft: 'auto' }} onClick={() => nav('/app/leads')}>Back to Pulse</button>}</div>
        <h1>Start your fitness journey</h1>
        <p className="jp-sub">Book a free trial session. {db.gym.hours}, {db.gym.address}.</p>
        <div className="jp-perks"><span><Dumbbell size={14} /> Full gym floor</span><span><Users size={14} /> Certified trainers</span><span><Clock size={14} /> Open 7 days</span></div>
        <div><JoinForm where="page" /></div>
      </main>
    </div>
  );
}
