export type RoleKey = 'owner' | 'sales' | 'desk' | 'member';
export interface Account { key: RoleKey; id: string; name: string; role: string; label: string; email: string; phone: string }
export interface TeamMember { id: string; name: string; role: 'Sales manager' | 'Membership advisor' | 'Front desk'; target: number; email: string }
export type StageKey = 'New' | 'Contacted' | 'Trial booked' | 'Trial done' | 'Negotiating' | 'Lost';
export interface Lead {
  id: string; name: string; phone: string; email: string; source: string; interest: string; planInterest: string;
  stage: StageKey; owner: string; createdAt: number; lastContact: number; follow: number | null; score: number; imported: number;
}
/** price includes 18% GST */
export interface Plan { k: string; months: number; price: number }
export type PayMode = 'UPI' | 'Cash' | 'Card' | 'Bank transfer';
export interface Client {
  id: string; memberNo: string; name: string; phone: string; email: string; plan: string;
  /** day offsets from today (negative = past) */
  start: number; end: number; since: number;
  frozen: boolean; trainer: string; pt: boolean; total: number; paid: number; due: number; mode: PayMode;
  visits: number; lastVisit: number; source: string; soldBy: string; goal: string; imported: number;
  /* member-app fields (Simran only) */
  ptUsed?: number; ptTotal?: number; visitDays?: Set<number>;
}
export interface Payment { no: string; clientId: string; date: number; item: string; amount: number; total: number; mode: PayMode; kind: 'New' | 'Renewal' | 'Balance' }
/** client id, epoch ms */
export interface Checkin { id: string; at: number }
export type SegmentKey = 'ending7' | 'atrisk' | 'expired' | 'hot' | 'lost' | 'active';
export interface Campaign {
  id: string; name: string; seg: SegmentKey; tpl: string; at: number; status: 'Sent' | 'Scheduled';
  n: number; delivered: number; read: number; replied: number; won: number; revenue: number; live?: boolean;
}
export interface Template { k: string; t: string; seg: SegmentKey; btns: string[]; body: string; hidden?: boolean }
export interface Note { text: string; at: number }
export interface ImportJob { file: string; to: 'Leads' | 'Clients'; at: number; added: number }
export interface Gym { name: string; branch: string; phone: string; email: string; address: string; gst: string; hours: string }
export type NotifKey = 'renew' | 'digest' | 'newLead' | 'lowAttend';

/** the whole in-memory database; mutated by store actions, which then bump the store version */
export interface DB {
  gym: Gym;
  team: TeamMember[];
  plans: Plan[];
  leads: Lead[];
  clients: Client[];
  payments: Payment[];
  checkins: Checkin[];
  /** the 11 months before the current one (static history); the current month comes from payments */
  revenue: number[];
  notes: Record<string, Note[]>;
  imports: ImportJob[];
  campaigns: Campaign[];
  templates: Template[];
  sources: string[];
  notif: Record<NotifKey, boolean>;
  member: Client;
  seq: number;
  memberNo: number;
  invNo: number;
}
