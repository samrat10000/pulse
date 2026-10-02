import clsx from 'clsx';
import { Command } from 'cmdk';
import { LogOut, Moon, Plus, Search, Sun, Upload, UserPlus, type LucideIcon } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Avatar } from '@/components/ui/Avatar';
import { useDialog, usePresence } from '@/components/ui/Modal';
import { clientStatus, isDue } from '@/data/rules';
import { phoneKey } from '@/lib/format';
import { can, useDB, useStore } from '@/store/useStore';
import { isDark, useLogout } from './AppShell';
import { NAV } from './Sidebar';

interface Item { g: string; label: string; sub?: string; icon?: LucideIcon; av?: string; run: () => void }

export default function CommandPalette() {
  const open = useStore(s => s.cmdk);
  const { mounted, shown } = usePresence(open, 220);
  const ref = useRef<HTMLDivElement>(null);
  const close = () => useStore.getState().setCmdk(false);
  useDialog(ref, mounted && open, close);
  if (!mounted) return null;
  return (
    <>
      <div className={clsx('backdrop modal-bd', shown && 'open')} onClick={close} />
      <div ref={ref} className={clsx('cmdk', shown && 'open')} role="dialog" aria-modal="true" aria-label="Search">
        {open && <Palette close={close} />}
      </div>
    </>
  );
}

function Palette({ close }: { close: () => void }) {
  const db = useDB();
  const me = useStore(s => s.me)!;
  const theme = useStore(s => s.theme);
  const nav = useNavigate();
  const logout = useLogout();
  const [q, setQ] = useState('');
  const s = useStore.getState();

  const items = useMemo(() => {
    const t = q.trim().toLowerCase(), digits = t.replace(/\D/g, '');
    const pages: Item[] = NAV.flatMap(([, it]) => it).filter(([k]) => can(me, k)).map(([k, icon, label]) => ({ g: 'Pages', icon, label, run: () => nav('/app/' + k) }));
    const actions: Item[] = [
      { g: 'Actions', icon: Plus, label: 'Add lead', run: () => s.openDrawer({ k: 'newLead' }) },
      { g: 'Actions', icon: UserPlus, label: 'Add client', run: () => s.startConv('new') },
      ...(can(me, 'import') ? [{ g: 'Actions', icon: Upload, label: 'Import a file', run: () => nav('/app/import') }] : []),
      { g: 'Actions', icon: isDark(theme) ? Sun : Moon, label: 'Switch theme', run: () => s.setTheme(isDark(theme) ? 'light' : 'dark') },
      { g: 'Actions', icon: LogOut, label: 'Sign out', run: logout },
    ];
    const match = (x: { name: string; phone: string; email: string }) => `${x.name} ${x.phone} ${x.email}`.toLowerCase().includes(t) || (digits.length >= 3 && phoneKey(x.phone).includes(digits));
    const leads: Item[] = t
      ? db.leads.filter(match).slice(0, 5).map(l => ({ g: 'Leads', av: l.name, label: l.name, sub: `${l.stage} · ${l.interest}`, run: () => s.openDrawer({ k: 'lead', id: l.id }) }))
      : db.leads.filter(isDue).slice(0, 3).map(l => ({ g: 'Follow up today', av: l.name, label: l.name, sub: l.phone, run: () => s.openDrawer({ k: 'lead', id: l.id }) }));
    const members: Item[] = t ? db.clients.filter(c => match(c) || c.memberNo.toLowerCase().includes(t)).slice(0, 5).map(c => ({ g: 'Clients', av: c.name, label: c.name, sub: `${c.memberNo} · ${clientStatus(c)}`, run: () => s.openDrawer({ k: 'client', id: c.id }) })) : [];
    return [...[...pages, ...actions].filter(x => !t || x.label.toLowerCase().includes(t)), ...leads, ...members];
  }, [q, db, me, theme]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = items.reduce<Record<string, Item[]>>((a, it) => { (a[it.g] ||= []).push(it); return a; }, {});
  const run = (it: Item) => { close(); it.run(); };

  return (
    <Command shouldFilter={false} loop label="Search">
      <div className="cmdk-in"><Search size={17} /><Command.Input data-autofocus value={q} onValueChange={setQ} placeholder="Search members, leads or pages" /><kbd>Esc</kbd></div>
      <Command.List className="cmdk-list">
        <Command.Empty className="cmdk-empty">Nothing matches that search</Command.Empty>
        {Object.entries(groups).map(([g, list]) => (
          <Command.Group key={g} heading={g}>
            {list.map((it, i) => (
              <Command.Item key={g + i + it.label} value={g + i + it.label} className="cmdk-i" onSelect={() => run(it)}>
                {it.av ? <Avatar name={it.av} size="xs" /> : it.icon && <span className="t-ic"><it.icon size={13} /></span>}
                {it.label}
                {it.sub && <small>{it.sub}</small>}
              </Command.Item>
            ))}
          </Command.Group>
        ))}
      </Command.List>
    </Command>
  );
}
