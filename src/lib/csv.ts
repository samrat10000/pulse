import { toast } from '@/store/useStore';

/** download rows as CSV; a sandbox that blocks downloads gets a toast instead */
export function exportCSV<T>(rows: T[], cols: [(x: T) => unknown, string][], name: string) {
  const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [cols.map(c => c[1]).join(','), ...rows.map(x => cols.map(([f]) => cell(f(x))).join(','))].join('\n');
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    toast(`Exported ${rows.length} rows`);
  } catch { toast('Downloads are blocked here'); }
}
