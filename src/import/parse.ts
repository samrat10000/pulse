/* File → array of rows. Excel via SheetJS, Word via mammoth, CSV via Papa Parse (spec §9.14). */
import Papa from 'papaparse';

export class ImportError extends Error {}

export const MAX_BYTES = 15 * 1024 * 1024, MAX_ROWS = 5000;
const OK = ['csv', 'tsv', 'txt', 'xlsx', 'xls', 'docx'];

export const extOf = (name: string) => (name.split('.').pop() || '').toLowerCase();

/** the user-facing reason a file can't be imported, or null */
export function rejectReason(file: File) {
  const ext = extOf(file.name);
  if (!OK.includes(ext)) {
    return ext === 'doc' ? 'Older .doc files can’t be read in the browser. Open the file in Word, choose Save As › .docx, then drop it here again.'
      : ext === 'pdf' ? 'PDF import isn’t supported yet. Export the table to Excel or CSV and drop that file here.'
      : `.${ext} files aren’t supported. Use Excel (.xlsx, .xls), CSV, Word (.docx) or plain text.`;
  }
  if (file.size > MAX_BYTES) return 'This file is larger than 15 MB. Split it into smaller files and import them one at a time.';
  return null;
}

const papa = (text: string) => Papa.parse<string[]>(text, { delimiter: '', skipEmptyLines: false }).data;

/** plain text: tabular when the first 6 lines agree on a column count (delimiters outside quotes), else "Key: Value" blocks, else lines with a phone or email */
export function fromText(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) throw new ImportError('This file is empty.');
  const cols = (l: string, d: string) => { let n = 1, q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === d && !q) n++; } return n; };
  const tabular = [',', ';', '\t'].some(d => { const c = lines.slice(0, 6).map(l => cols(l, d)); return c[0] > 1 && c.every(x => x === c[0]); });
  if (tabular) return papa(text);

  const blocks: Record<string, string>[] = []; let cur: Record<string, string> = {};
  const flush = () => { if (Object.keys(cur).length) blocks.push(cur); cur = {}; };
  text.split(/\r?\n/).forEach(l => {
    if (!l.trim()) return flush();
    const m = l.match(/^\s*([^:]{1,40}):\s*(.+)$/); if (!m) return;
    const k = m[1].trim(); if (k in cur) flush(); // a repeated key starts a new contact
    cur[k] = m[2].trim();
  });
  flush();
  for (let i = blocks.length - 1; i >= 0; i--) if (Object.keys(blocks[i]).length < 2) blocks.splice(i, 1);
  if (blocks.length) {
    const hs: string[] = []; blocks.forEach(o => Object.keys(o).forEach(k => { if (!hs.includes(k)) hs.push(k); }));
    return [hs, ...blocks.map(o => hs.map(h => o[h] || ''))];
  }
  const out = [['Name', 'Email', 'Phone']];
  lines.forEach(l => {
    const e = (l.match(/[^\s,;<>()]+@[^\s,;<>()]+\.[a-z]{2,}/i) || [''])[0]; const p = (l.match(/\+?\d[\d\s().-]{7,}\d/) || [''])[0];
    if (!e && !p) return;
    const n = l.replace(e, '').replace(p, '').replace(/[,;|<>()\-–—:]+/g, ' ').replace(/\s+/g, ' ').trim();
    out.push([n, e, p]);
  });
  if (out.length < 2) throw new ImportError('No contacts found in this file. Use a table, or lines like "Name: …" and "Email: …" separated by blank lines.');
  return out;
}

function tableFromHTML(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const tables = [...doc.querySelectorAll('table')].map(t => [...t.querySelectorAll('tr')].map(tr => [...tr.querySelectorAll('td,th')].map(td => (td.textContent || '').replace(/\s+/g, ' ').trim())));
  const best = tables.sort((a, b) => b.length - a.length)[0];
  return best && best.length >= 2 ? best : null;
}

export async function readFile(file: File): Promise<unknown[][]> {
  const ext = extOf(file.name);
  if (ext === 'xlsx' || ext === 'xls') {
    const X = await import('xlsx');
    const wb = X.read(await file.arrayBuffer(), { type: 'array', dateNF: 'yyyy-mm-dd' });
    const sheet = wb.SheetNames.find(n => X.utils.sheet_to_json<unknown[]>(wb.Sheets[n], { header: 1 }).length > 1) || wb.SheetNames[0];
    return X.utils.sheet_to_json<unknown[]>(wb.Sheets[sheet], { header: 1, raw: false, defval: '', dateNF: 'yyyy-mm-dd' });
  }
  if (ext === 'docx') {
    const mammoth = (await import('mammoth')).default;
    const arrayBuffer = await file.arrayBuffer();
    const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
    const t = tableFromHTML(html);
    if (t) return t;
    const { value: text } = await mammoth.extractRawText({ arrayBuffer });
    return fromText(text.replace(/\n\n/g, '\n'));
  }
  const text = await file.text();
  if (ext === 'csv' || ext === 'tsv') { if (!text.trim()) throw new ImportError('This file is empty.'); return papa(text); }
  return fromText(text);
}

export interface Loaded { headers: string[]; rows: string[][]; truncated: boolean }
/** trims cells, drops blank rows, pads to the widest row, keeps the first 5,000 data rows */
export function loadAOA(aoa: unknown[][]): Loaded {
  const rows = aoa.map(r => (r || []).map(v => String(v ?? '').trim())).filter(r => r.some(Boolean));
  if (rows.length < 2) throw new ImportError('No data rows found. The first row should be column names and each row after it one contact.');
  const width = Math.max(...rows.map(r => r.length));
  const headers = Array.from({ length: width }, (_, i) => rows[0][i] || `Column ${i + 1}`);
  const data = rows.slice(1, MAX_ROWS + 1).map(r => Array.from({ length: width }, (_, i) => r[i] || ''));
  return { headers, rows: data, truncated: rows.length - 1 > MAX_ROWS };
}
