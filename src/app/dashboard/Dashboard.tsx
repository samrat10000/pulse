import { Activity, Clock, IndianRupee, Phone, Plus, QrCode, ScanLine, Target, Upload, UserPlus, Users } from 'lucide-react';
import { useNavigate } from 'react-router';
import { greeting, Kpis, PageHead } from '@/components/bits';
import { Button } from '@/components/ui/Button';
import { activeCount, checkinsToday, conversionRate, dueToday, duesList, ending7, expiringCount, joined30, leads30, revenue30, teamStats } from '@/data/rules';
import { useDB, useStore } from '@/store/useStore';
import { AtRiskCard, CheckinChart, DuesCard, ExpiringCard, FollowCard, FunnelCard, RevenueCard, SourceCard, TargetsCard, TopReps } from './blocks';

function OwnerDashboard() {
  const db = useDB();
  const me = useStore(s => s.me)!;
  const nav = useNavigate();
  return (
    <>
      <PageHead date title={greeting(me.name)} sub={`${dueToday(db, me)} follow-ups and ${expiringCount(db)} renewals need you today.`}>
        <Button icon={Upload} onClick={() => nav('/app/import')}>Import</Button>
        <Button variant="primary" icon={Plus} onClick={() => useStore.getState().openDrawer({ k: 'newLead' })}>Add lead</Button>
      </PageHead>
      <Kpis list={[
        { label: 'Active members', v: activeCount(db), fmt: 'num', d: `+${joined30(db)} new`, up: true, bg: '#F8D9EE', icon: Users, to: 'clients' },
        { label: 'New leads, 30 days', v: leads30(db), fmt: 'num', d: '+18%', up: true, bg: '#E5DEFC', icon: UserPlus, to: 'leads' },
        { label: 'Lead to member rate', v: conversionRate(db), fmt: 'pct', d: '+2.4%', up: true, bg: '#FFE36B', icon: Target, to: 'team' },
        { label: 'Revenue, 30 days', v: revenue30(db), fmt: 'money', d: '+6.2%', up: true, bg: '#D6E7FF', icon: IndianRupee, to: 'payments' },
      ]} />
      <div className="grid" style={{ marginTop: 14 }}>
        <div className="s8"><RevenueCard /></div><div className="s4"><TargetsCard /></div>
        <div className="s4"><FollowCard /></div><div className="s4"><FunnelCard /></div><div className="s4"><SourceCard /></div>
        <div className="s7"><AtRiskCard /></div><div className="s5"><CheckinChart /></div>
        <div className="s7"><ExpiringCard /></div><div className="s5"><TopReps /></div>
      </div>
    </>
  );
}

function SalesDashboard() {
  const db = useDB();
  const me = useStore(s => s.me)!;
  const s = useStore.getState();
  const myLeads = db.leads.filter(l => l.owner === me.id && l.stage !== 'Lost'), st = teamStats(db);
  const t = st.find(x => x.id === me.id) || { won: 0, rate: 0, revenue: 0, pct: 0 }, rank = st.findIndex(x => x.id === me.id) + 1;
  return (
    <>
      <PageHead date title={greeting(me.name)} sub={`${dueToday(db, me)} people to call today. You're number ${rank} on the team this month.`}>
        <Button icon={QrCode} onClick={() => s.openModal({ k: 'enquiry' })}>Enquiry link</Button>
        <Button variant="primary" icon={Plus} onClick={() => s.openDrawer({ k: 'newLead' })}>Add lead</Button>
      </PageHead>
      <Kpis list={[
        { label: 'My open leads', v: myLeads.length, fmt: 'num', d: `${myLeads.filter(l => l.score >= 70).length} hot`, up: true, bg: '#F8D9EE', icon: UserPlus, to: 'leads' },
        { label: 'Follow-ups due', v: dueToday(db, me), fmt: 'num', d: 'today', up: false, bg: '#E5DEFC', icon: Phone, to: 'leads' },
        { label: 'New members, 30 days', v: t.won, fmt: 'num', d: `${t.rate}% rate`, up: true, bg: '#FFE36B', icon: Users, to: 'clients' },
        { label: 'My sales, 30 days', v: t.revenue, fmt: 'money', d: `${Math.round(t.pct * 100)}% of target`, up: true, bg: '#D6E7FF', icon: IndianRupee, to: 'team' },
      ]} />
      <div className="grid" style={{ marginTop: 14 }}>
        <div className="s5"><FollowCard /></div><div className="s3h"><FunnelCard title="My funnel" /></div><div className="s4"><TopReps /></div>
      </div>
    </>
  );
}

function DeskDashboard() {
  const db = useDB();
  const me = useStore(s => s.me)!;
  const nav = useNavigate();
  const dues = duesList(db), dueSum = dues.reduce((a, c) => a + c.due, 0), enq = db.leads.filter(l => l.createdAt === 0 && !l.imported).length, exp7 = ending7(db).length;
  return (
    <>
      <PageHead date title={greeting(me.name)} sub={`${checkinsToday(db)} members in so far. ${dues.length} dues and ${exp7} renewals to handle this week.`}>
        <Button icon={Plus} onClick={() => useStore.getState().openDrawer({ k: 'newLead' })}>Walk-in enquiry</Button>
        <Button variant="primary" icon={ScanLine} onClick={() => nav('/app/checkin')}>Open check-in desk</Button>
      </PageHead>
      <Kpis list={[
        { label: 'Check-ins today', v: checkinsToday(db), fmt: 'num', d: 'live', up: true, bg: '#D6E7FF', icon: Activity, to: 'checkin' },
        { label: 'Plans ending in 7 days', v: exp7, fmt: 'num', d: 'renew', up: false, bg: '#FFE36B', icon: Clock, to: 'clients' },
        { label: 'Pending dues', v: dueSum, fmt: 'money', d: `${dues.length} members`, up: false, bg: '#F8D9EE', icon: IndianRupee, to: 'payments' },
        { label: 'New enquiries today', v: enq, fmt: 'num', d: 'walk-ins too', up: true, bg: '#E5DEFC', icon: UserPlus, to: 'leads' },
      ]} />
      <div className="grid" style={{ marginTop: 14 }}>
        <div className="s7"><CheckinChart big /></div><div className="s5"><DuesCard /></div>
        <div className="s7"><ExpiringCard /></div><div className="s5"><AtRiskCard /></div>
      </div>
    </>
  );
}

export default function Dashboard() {
  const key = useStore(s => s.me?.key);
  return key === 'sales' ? <SalesDashboard /> : key === 'desk' ? <DeskDashboard /> : <OwnerDashboard />;
}
