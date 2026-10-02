import clsx from 'clsx';
import { ArrowRight, Check, CircleAlert, RefreshCw, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { PageHead, StagePill } from '@/components/bits';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { autoMap, FIELDS, mapReady, newImp, type FieldKey, type ImportTo } from '@/import/mapping';
import { extOf, ImportError, loadAOA, readFile, rejectReason } from '@/import/parse';
import { sampleFile } from '@/import/samples';
import { buildRecords, commitImport, willImport, type ClientRec, type ImportRecord, type LeadRec } from '@/import/validate';
import { reduced } from '@/lib/env';
import { agoMs, fmtDate, money, num } from '@/lib/format';
import { toast, useDB, useStore } from '@/store/useStore';

const STEPS = ['Upload a file', 'Match columns', 'Review', 'Done'];
const MATCH = { auto: 'Matched by name', value: 'Matched by content', manual: 'Set by you', none: 'Not imported' };

function load(aoa: unknown[][], name: string, sample: boolean) {
  const s = useStore.getState(), I = s.imp;
  const { headers, rows, truncated } = loadAOA(aoa);
  const { map, how } = autoMap(headers, rows, I.to);
  s.setImp({ file: { name, ext: extOf(name), rows: rows.length, cols: headers.length, sample, truncated }, headers, rows, map, how, step: 2, records: null, view: 'all', error: null });
}

async function handleFile(file: File | undefined) {
  if (!file) return;
  const s = useStore.getState();
  const bad = rejectReason(file);
  if (bad) return s.setImp({ error: bad });
  s.setImp({ busy: true, error: null });
  try { load(await readFile(file), file.name, false); }
  catch (e) { s.setImp({ error: e instanceof ImportError ? e.message : 'This file couldn’t be read. Check that it opens correctly and try again.' }); }
  s.setImp({ busy: false });
}

function Upload() {
  const I = useStore(s => s.imp);
  const db = useDB();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const what = I.to === 'Leads' ? 'enquiry list' : 'member register';
  const browse = () => input.current?.click();
  return (
    <>
      <div className="dup-opt" style={{ margin: '0 0 14px' }}>
        <p>What's in this file?<small>{I.to === 'Leads' ? "People who enquired but haven't joined yet" : 'Paying members with a plan'}</small></p>
        <Segmented label="What's in this file?" value={I.to} onChange={(v: ImportTo) => useStore.setState({ imp: newImp(v) })} options={[{ value: 'Leads', label: 'Leads' }, { value: 'Clients', label: 'Clients (members)' }]} />
      </div>
      <div className={clsx('dropzone', over && 'over')} role="button" tabIndex={0} aria-label="Choose a file to import"
        onClick={browse} onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); browse(); } }}
        onDragOver={e => { if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); setOver(true); } }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); void handleFile(e.dataTransfer.files[0]); }}>
        <div>
          <div className="dz-files"><span className="dz-file"><span className="ft csv">CSV</span></span><span className="dz-file"><span className="ft xlsx">XLSX</span></span><span className="dz-file"><span className="ft docx">DOCX</span></span></div>
          <h3>Drop your {what} here, or browse</h3>
          <p>Excel, CSV, Word or text, up to 15 MB</p>
          <div className="dz-or">No file handy? <button className="link" onClick={e => { e.stopPropagation(); const f = sampleFile(db, I.to); try { load(f.aoa, f.name, true); } catch (err) { useStore.getState().setImp({ error: (err as Error).message }); } }}>Use a sample {what}</button></div>
        </div>
      </div>
      <input ref={input} type="file" accept=".csv,.tsv,.txt,.xlsx,.xls,.docx,.doc,.pdf" hidden onChange={e => { void handleFile(e.target.files?.[0]); e.target.value = ''; }} />
    </>
  );
}

function FileChip() {
  const I = useStore(s => s.imp), f = I.file!;
  const word = I.to === 'Leads' ? 'leads' : 'clients';
  return (
    <div className="file-chip">
      <span className={`ft ${f.ext}`}>{f.ext.toUpperCase()}</span>
      <div><b>{f.name}</b><small className="num">{num(f.rows)} rows, {f.cols} columns, importing as {word}{f.sample ? ', sample file' : ''}{f.truncated ? ', first 5,000 rows' : ''}</small></div>
      <Button size="sm" icon={RefreshCw} onClick={() => useStore.setState(s => ({ imp: newImp(s.imp.to) }))}>Change file</Button>
    </div>
  );
}

function Mapping() {
  const I = useStore(s => s.imp);
  const s = useStore.getState();
  const auto = Object.values(I.how).filter(h => h === 'auto' || h === 'value').length, ready = mapReady(I.map);
  const pick = (i: number, v: FieldKey | '') => {
    // each field is used once: picking it here frees it elsewhere
    const map = { ...I.map }, how = { ...I.how };
    Object.keys(map).forEach(k => { if (+k !== i && v && map[+k] === v) { map[+k] = ''; how[+k] = 'none'; } });
    map[i] = v; how[i] = v ? 'manual' : 'none';
    s.setImp({ map, how });
  };
  return (
    <>
      <FileChip />
      <div className="note"><Check size={15} strokeWidth={2.4} />{auto} of {I.headers.length} columns matched automatically. Check them and change anything that looks wrong.</div>
      <div className="tbl-wrap"><table className="map-table">
        <thead><tr><th>Column in your file</th><th>Sample values</th><th /><th>Pulse field</th><th /></tr></thead>
        <tbody>{I.headers.map((h, i) => { const k = I.map[i] || '', how = k ? I.how[i] : 'none'; return (
          <tr key={i}>
            <td className="src"><b>{h}</b></td>
            <td className="samp">{I.rows.slice(0, 3).map(r => r[i]).filter(Boolean).join(', ') || 'Empty'}</td>
            <td className="arrow"><ArrowRight size={14} /></td>
            <td><select className="select" aria-label={`Field for ${h}`} value={k} onChange={e => pick(i, e.target.value as FieldKey | '')}><option value="">Don't import</option>{FIELDS[I.to].map(([fk, fl]) => <option key={fk} value={fk}>{fl}</option>)}</select></td>
            <td><span className={`match ${how}`}>{how !== 'none' && <Check size={13} strokeWidth={2.4} />}{MATCH[how]}</span></td>
          </tr>
        ); })}</tbody>
      </table></div>
      <div className="imp-foot">
        <Button onClick={() => useStore.setState(st => ({ imp: newImp(st.imp.to) }))}>Back</Button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {!ready.ok && <span className="hint">{ready.hint}</span>}
          <Button variant="primary" disabled={!ready.ok} onClick={() => s.setImp({ records: buildRecords(s.db, I.to, I.rows, I.map), step: 3, view: 'all' })}>Continue</Button>
        </div>
      </div>
    </>
  );
}

const StIcon = ({ st }: { st: ImportRecord['st'] }) => st === 'err' ? <span className="st-ic" style={{ background: 'var(--red)' }} aria-label="Will be skipped"><X size={11} strokeWidth={3} /></span>
  : st === 'dup' ? <span className="st-ic" style={{ background: 'var(--amber)' }} aria-label="Duplicate"><RefreshCw size={10} strokeWidth={3} /></span>
  : st === 'warn' ? <span className="st-ic" style={{ background: 'var(--faint)' }} aria-label="Ready, with a note"><CircleAlert size={11} strokeWidth={2.6} /></span>
  : <span className="st-ic" style={{ background: 'var(--green)' }} aria-label="Ready"><Check size={11} strokeWidth={3} /></span>;

function Review({ run }: { run: () => void }) {
  const I = useStore(s => s.imp);
  const s = useStore.getState();
  const R = I.records!, word = I.to === 'Leads' ? 'leads' : 'clients';
  const c = { ok: R.filter(r => r.st === 'ok' || r.st === 'warn').length, dup: R.filter(r => r.st === 'dup').length, err: R.filter(r => r.st === 'err').length };
  const willAdd = R.filter(r => willImport(r, I.dupMode)).length;
  const shown = R.filter(r => I.view === 'all' || (I.view === 'ok' ? (r.st === 'ok' || r.st === 'warn') : r.st === I.view));
  const none = <span className="muted">None</span>;
  const cols = I.to === 'Leads' ? ['Name', 'Phone', 'Email', 'Interested in', 'Source', 'Stage'] : ['Name', 'Phone', 'Plan', 'Start', 'Valid till', 'Paid'];
  const cells = (r: ImportRecord) => {
    if (I.to === 'Leads') { const x = r.rec as LeadRec; return [x.name, x.phone || none, x.email || none, x.interest, x.source, r.st === 'err' ? '' : <StagePill stage={x.stage} />]; }
    const x = r.rec as ClientRec; return [x.name, x.phone || none, x.plan, fmtDate(x.start, true), fmtDate(x.end, true), money(x.paid)];
  };
  const tile = (k: 'ok' | 'dup' | 'err', color: string, label: string, n: number) => (
    <button className={clsx('tile', I.view === k && 'on')} aria-pressed={I.view === k} onClick={() => s.setImp({ view: I.view === k ? 'all' : k })}><span><i style={{ background: color }} />{label}</span><b>{num(n)}</b></button>
  );
  return (
    <>
      <FileChip />
      <div className="tiles" style={{ marginTop: 14 }}>{tile('ok', 'var(--green)', 'Ready to import', c.ok)}{tile('dup', 'var(--amber)', 'Duplicates', c.dup)}{tile('err', 'var(--red)', 'Will be skipped', c.err)}</div>
      {R.some(r => r.st === 'dup' && r.existing)
        ? <div className="dup-opt"><p>When someone is already in Pulse<small>Matched by phone number or email</small></p><Segmented label="When someone is already in Pulse" value={I.dupMode} onChange={v => s.setImp({ dupMode: v })} options={[{ value: 'skip', label: 'Skip them' }, { value: 'update', label: 'Update their details' }]} /></div>
        : <div style={{ height: 14 }} />}
      <div className="prev-wrap"><table className="prev">
        <thead><tr><th><span className="sr-only">Status</span></th>{cols.map(h => <th key={h}>{h}</th>)}<th>Note</th></tr></thead>
        <tbody>
          {shown.length ? shown.slice(0, 120).map(r => (
            <tr key={r.idx} className={r.st === 'err' ? 'err-r' : r.st === 'dup' ? 'dup-r' : ''}>
              <td><StIcon st={r.st} /></td>{cells(r).map((x, i) => <td key={i}>{x}</td>)}<td><span className={`issue ${r.st}`}>{r.issues.join(', ')}</span></td>
            </tr>
          )) : <tr><td colSpan={8} className="muted" style={{ textAlign: 'center', padding: 30 }}>Nothing in this group</td></tr>}
        </tbody>
      </table></div>
      {shown.length > 120 && <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>Showing the first 120 of {num(shown.length)} rows.</p>}
      <div className="imp-foot"><Button onClick={() => s.setImp({ step: 2 })}>Back</Button><Button variant="primary" disabled={!willAdd} onClick={run}>Import {num(willAdd)} {word}</Button></div>
    </>
  );
}

function Done() {
  const I = useStore(s => s.imp), r = I.result!;
  const nav = useNavigate();
  const word = I.to === 'Leads' ? 'leads' : 'clients';
  const view = () => {
    const s = useStore.getState(), to = I.to;
    s.setImp(newImp(to));
    if (to === 'Leads') s.setUi({ lTab: 'Imported', lQuery: '', lOwner: 'all', lSource: 'all', lPage: 1, lView: 'table' });
    else s.setUi({ cTab: 'Imported', cQuery: '', cPlan: 'all', cTrainer: 'all', cPage: 1 });
    nav(to === 'Leads' ? '/app/leads' : '/app/clients');
  };
  return (
    <div className="imp-done">
      <div className="done-ic"><Check size={28} strokeWidth={2.4} /></div>
      <h3>Import complete</h3><p>{I.file?.name} is in Pulse.</p>
      <div className="done-stats"><div><b>{num(r.added)}</b><span>Added</span></div><div><b>{num(r.updated)}</b><span>Updated</span></div><div><b>{num(r.skipped)}</b><span>Skipped</span></div></div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Button variant="primary" onClick={view}>View imported {word}</Button>
        <Button onClick={() => useStore.setState(s => ({ imp: newImp(s.imp.to) }))}>Import another file</Button>
      </div>
    </div>
  );
}

export default function ImportPage() {
  const db = useDB();
  const I = useStore(s => s.imp);
  const [prog, setProg] = useState({ p: 0, n: 0 });
  const word = I.to === 'Leads' ? 'leads' : 'clients';

  useEffect(() => { if (I.step === 4) useStore.setState(s => ({ imp: newImp(s.imp.to) })); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const run = () => {
    const s = useStore.getState(), R = s.imp.records!, total = R.filter(r => willImport(r, s.imp.dupMode)).length;
    s.setImp({ running: true });
    const t0 = performance.now(), d = reduced ? 10 : Math.min(2200, 900 + total * 30);
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / d), e = 1 - Math.pow(1 - p, 2);
      setProg({ p: e, n: Math.round(total * e) });
      if (p < 1) return void requestAnimationFrame(tick);
      const st = useStore.getState(), imp = st.imp;
      let res = { added: 0, updated: 0, skipped: 0, fresh: [] as string[] };
      st.mutate(db => { res = commitImport(db, imp.to, imp.records!, imp.dupMode, imp.file!.name); });
      st.markFresh(...res.fresh);
      st.setImp({ running: false, step: 4, result: res });
      toast(`${res.added} ${imp.to === 'Leads' ? 'leads' : 'clients'} imported`);
    };
    requestAnimationFrame(tick);
  };

  const body = I.busy ? <div className="progress" role="status"><div className="spin" /><h3>Reading your file</h3><p>This only takes a moment.</p></div>
    : I.running ? <div className="progress" role="status"><h3>Importing {word}</h3><p><span>{num(prog.n)}</span> saved</p><div className="pbar"><i style={{ width: `${prog.p * 100}%` }} /></div></div>
    : I.step === 1 ? <Upload /> : I.step === 2 ? <Mapping /> : I.step === 3 ? <Review run={run} /> : <Done />;

  return (
    <>
      <PageHead title="Import" sub="Bring in leads or members from Excel, CSV or Word. Pulse matches the columns for you." />
      <div className="imp-grid">
        <Card>
          <ol className="stepper" style={{ listStyle: 'none' }}>
            {STEPS.map((st, i) => <li key={st} className={clsx('step', I.step === i + 1 ? 'cur' : I.step > i + 1 && 'done')} aria-current={I.step === i + 1 ? 'step' : undefined}><span className="n">{I.step > i + 1 ? <Check size={12} strokeWidth={3} /> : i + 1}</span>{st}</li>)}
          </ol>
          <div className="imp-body">
            {I.error && !I.busy && <div className="err" role="alert"><CircleAlert size={16} /><span>{I.error}</span></div>}
            {body}
          </div>
        </Card>
        <aside style={{ display: 'grid', gap: 14 }}>
          <div className="card side-card">
            <h4>Recent imports</h4>
            {db.imports.slice(0, 5).map(h => { const ext = extOf(h.file); return (
              <div className="hist" key={h.file + h.at}><span className={`ft ${ext}`}>{ext.toUpperCase()}</span><div style={{ minWidth: 0 }}><b>{h.file}</b><small>{h.to} · {agoMs(h.at)}</small></div><span className="plus">+{num(h.added)}</span></div>
            ); })}
          </div>
          <div className="card side-card">
            <h4>Files you can use</h4>
            <div className="fmt"><span className="ft xlsx">XLSX</span><div>Excel registers<small>.xlsx and .xls, first sheet with data</small></div></div>
            <div className="fmt"><span className="ft csv">CSV</span><div>CSV exports<small>From Google Sheets, forms or old software</small></div></div>
            <div className="fmt"><span className="ft docx">DOCX</span><div>Word documents<small>A table of members, or "Name: …" lines</small></div></div>
            <div className="fmt"><span className="ft txt">TXT</span><div>Plain text<small>Lines with names and phone numbers</small></div></div>
          </div>
        </aside>
      </div>
    </>
  );
}
