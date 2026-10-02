/* Prototype icon names → lucide, for places that pick an icon from data (timelines, segments, roles). */
import {
  Activity, ArrowUpRight, Calendar, CircleAlert, Clock, CreditCard, Crown, Dumbbell, Flame, IndianRupee, MessageCircle,
  PenLine, Phone, RefreshCw, ScanLine, Trophy, Upload, UserPlus, Users, X, type LucideIcon,
} from 'lucide-react';
import type { RoleKey } from '@/data/types';

export const ICONS: Record<string, LucideIcon> = {
  activity: Activity, arrowUpRight: ArrowUpRight, calendar: Calendar, alert: CircleAlert, clock: Clock, card: CreditCard,
  dumbbell: Dumbbell, flame: Flame, rupee: IndianRupee, chat: MessageCircle, note: PenLine, phone: Phone, refresh: RefreshCw,
  upload: Upload, userPlus: UserPlus, users: Users, x: X,
};

export const ROLE_ICON: Record<RoleKey, LucideIcon> = { owner: Crown, sales: Trophy, desk: ScanLine, member: Dumbbell };
