/* Sample files: messy, realistic gym registers (data kept from the prototype's sampleFile()). */
import { planOf } from '@/data/rules';
import type { DB } from '@/data/types';
import { addMonths, dayDate } from '@/lib/dates';
import { num } from '@/lib/format';
import { between, rng } from '@/lib/rng';
import type { ImportTo } from './mapping';
import { normPlan } from './validate';

export function sampleFile(db: DB, to: ImportTo): { name: string; aoa: string[][] } {
  const r = rng(to === 'Leads' ? 77 : 88);
  if (to === 'Leads') {
    const H = ['Name', 'Mobile', 'Email', 'Interested In', 'Source', 'Status', 'Remarks'];
    const ppl = ['Gurpreet Sandhu', 'Ritika Bansal', 'Mohit Khanna', 'Sanya Ahuja', 'Parth Grewal', 'Muskan Dhillon', 'Tejas Iyer', 'Anmol Bhalla', 'Nidhi Saini', 'Rajat Chopra', 'Shreya Mehta', 'Kartik Bedi', 'Ishita Arora'];
    const ints = ['weight loss', 'Muscle gain', 'PT', 'yoga', 'Zumba classes', 'general', 'CrossFit'], srcs = ['Walk in', 'Insta', 'Google', 'Friend reference', 'Website', 'insta ad'], sts = ['new', 'Called', 'trial booked', 'Trial done', 'Hot - asked discount', 'new'];
    const notes = ['Wants morning batch', 'Asked for couple plan', 'Student, budget tight', '', 'Call after 6 PM', 'Coming Saturday', ''];
    const rows = ppl.map((n, i) => [n, `${i % 3 === 0 ? '+91 ' : ''}9${between(100000000, 999999999, r)}`, i % 4 === 2 ? '' : `${n.toLowerCase().replace(' ', '.')}@gmail.com`, ints[i % 7], srcs[i % 6], sts[i % 6], notes[i % 7]]);
    rows[3][2] = 'sanya.ahuja@gmail';
    rows.push(['', '98765 1', 'tanmay.walia@yahoo.in', 'weight loss', 'Website', 'new', 'Filled the website form']);
    rows.push(['Harsh Vardhan', '', '', 'general', 'Walk in', 'new', 'Left without details']);
    const l = db.leads[4], c = db.clients[7];
    rows.push([l.name, l.phone.replace(/\s/g, ''), '', l.interest, 'Insta', 'Called', 'Enquired again']);
    rows.push([c.name, c.phone, c.email, 'PT', 'Walk in', 'new', 'Asking about PT']);
    rows.push([...rows[1].slice(0, 6), 'Duplicate entry']);
    return { name: 'enquiries-october.xlsx', aoa: [H, ...rows] };
  }
  const H = ['Member Name', 'Contact No', 'E-mail', 'Membership', 'Joining Date', 'Valid Till', 'Amount Paid', 'Trainer', 'Fitness Goal'];
  const ppl = ['Amrit Pal', 'Komal Sharma', 'Deepak Rana', 'Jasleen Kaur', 'Vivek Anand', 'Pallavi Joshi', 'Sarthak Gupta', 'Inder Mohan', 'Ruchi Malik', 'Akash Bajwa', 'Simar Oberoi', 'Lakshay Jain', 'Tanya Kohli', 'Rohan Dutta'];
  const pl = ['Monthly', '3 months', 'Annual', 'Half yearly', 'quarterly', '12 Months'], tr = ['Vikram', 'Sana', 'dev', 'Meher Gill'], goals = ['Fat loss', 'Strength', 'Stay fit', 'Marathon prep', 'Post-injury rehab'];
  const ds = (off: number) => { const d = dayDate(off); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; };
  const rows = ppl.map((n, i) => {
    const p = normPlan(pl[i % 6], db.plans)!, months = planOf(db, p).months, st = -between(5, months * 30 + 10, r);
    return [n, `+91 9${between(100000000, 999999999, r)}`, i % 5 === 3 ? '' : `${n.toLowerCase().replace(' ', '')}@gmail.com`, pl[i % 6], ds(st), ds(addMonths(st, months)), num(planOf(db, p).price), tr[i % 4], goals[i % 5]];
  });
  rows[2][5] = ''; rows[5][3] = ''; rows[9][4] = 'next monday';
  rows.push(['Nikhil Verma', '', '', 'Monthly', ds(-3), '', '2,499', 'Sana', 'Stay fit']);
  const c = db.clients[2];
  rows.push([c.name, c.phone, c.email, 'Annual', ds(0), ds(360), '19,999', 'Dev', 'Renewed at desk']);
  rows.push([...rows[0]]);
  return { name: 'members-register-2026.xlsx', aoa: [H, ...rows] };
}
