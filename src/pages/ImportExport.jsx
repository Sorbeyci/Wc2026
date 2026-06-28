import { useState, useMemo } from 'react';
import { downloadTemplateXlsx, exportPredictionXlsx, parsePredictionFile } from '../lib/excel.js';
import { normalizeScorePayload, mapFixturesToScores, mapFixturesAll } from '../lib/importScores.js';
import { GROUP_MATCHES } from '../data/tournament.js';
import { resolveBracket, MATCH_BY_NO } from '../data/bracket.js';
import { shortName } from '../data/flags.js';

const NO_TO_MATCH = (() => { const o = {}; for (const m of GROUP_MATCHES) o[m.no] = m; return o; })();
const KO_ROUND_TR = { R32: 'Son 32', R16: 'Son 16', QF: 'Çeyrek', SF: 'Yarı', TP: 'Üçüncülük', F: 'Final' };

export default function ImportExport({ store }) {
  const { lists, getPrediction, importList, applyFetchedScores, actual } = store;
  const [parsed, setParsed] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [exportId, setExportId] = useState(lists[0]?.id || '');
  const [fetchInfo, setFetchInfo] = useState(null);
  const [preview, setPreview] = useState(null);

  const knownEmails = useMemo(() => [...new Set(lists.map((l) => l.ownerEmail).filter(Boolean))], [lists]);

  async function onFile(e) {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    setMsg(null);
    try {
      const { pred, counts } = await parsePredictionFile(f);
      setParsed({ pred, counts, fileName: f.name });
      setName(f.name.replace(/\.(xlsx|xls|csv)$/i, ''));
      setEmail('');
    } catch (err) {
      setMsg({ type: 'err', text: 'Dosya okunamadı: ' + (err?.message || err) });
    }
  }

  async function confirmImport() {
    if (!parsed || !name.trim()) return;
    setBusy(true);
    const id = await importList({ name: name.trim(), email: email.trim(), prediction: parsed.pred });
    setBusy(false);
    if (id) {
      setMsg({ type: 'ok', text: `"${name.trim()}" içe aktarıldı · ${parsed.counts.groups} grup maçı, ${parsed.counts.ko} eleme maçı.` });
      setParsed(null); setName(''); setEmail('');
    } else {
      setMsg({ type: 'err', text: 'İçe aktarılamadı (admin yetkisi gerekli).' });
    }
  }

  function doExport() {
    const l = lists.find((x) => x.id === exportId);
    if (!l) return;
    exportPredictionXlsx(l.name || l.ownerName || 'tahmin', getPrediction(l.id));
  }

  // Step 1: fetch + filter to FINISHED only + map. Does NOT write anything yet.
  async function previewFetch() {
    setBusy(true); setFetchInfo(null); setPreview(null);
    try {
      const url = import.meta.env.VITE_SCORES_URL || '/api/scores';
      const r = await fetch(url);
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setFetchInfo({ type: 'err', text: data?.error || `HTTP ${r.status}` }); setBusy(false); return; }

      const rawFixtures = Array.isArray(data) ? data : (data?.fixtures || null);
      let norm, liveSkipped = 0, total = 0;
      const A = resolveBracket(actual, actual.ko || {});
      if (rawFixtures) {
        total = rawFixtures.length;
        const st = (f) => String(f.status || '').toUpperCase();
        const finished = rawFixtures.filter((f) => st(f) === 'FINISHED');
        liveSkipped = rawFixtures.filter((f) => ['IN_PLAY', 'PAUSED'].includes(st(f))).length;
        norm = mapFixturesAll(finished, A); // grup + eleme (bitmiş maçlar)
      } else {
        // Önceden eşlenmiş kaynak (n8n {groupMatches, ko}) — bitmiş varsayılır.
        norm = normalizeScorePayload(data);
      }
      const entries = Object.entries(norm.groupMatches || {})
        .map(([no, sc]) => ({ no: Number(no), sc, m: NO_TO_MATCH[no] }))
        .sort((a, b) => a.no - b.no);
      const koEntries = Object.entries(norm.ko || {})
        .map(([no, v]) => {
          const m = A.matches?.[no] || {};
          return { no: Number(no), v, round: KO_ROUND_TR[MATCH_BY_NO[no]?.round] || 'Eleme', home: m.home, away: m.away };
        })
        .sort((a, b) => a.no - b.no);
      setPreview({ entries, koEntries, matched: norm.matched ?? entries.length, unmatched: norm.unmatched || [], liveSkipped, total });
    } catch (err) {
      setFetchInfo({ type: 'err', text: err?.message || 'İstek hatası' });
    }
    setBusy(false);
  }

  // Step 2: admin confirms → write to actual (scoring).
  function applyPreview() {
    if (!preview) return;
    const groupMatches = {};
    for (const e of preview.entries) groupMatches[e.no] = e.sc;
    const ko = {};
    for (const e of (preview.koEntries || [])) ko[e.no] = e.v;
    applyFetchedScores({ groupMatches, ko });
    setFetchInfo({ type: 'ok', matched: preview.entries.length + (preview.koEntries?.length || 0), unmatched: preview.unmatched, liveSkipped: preview.liveSkipped });
    setPreview(null);
  }

  return (
    <div className="space-y-4">
      {/* IMPORT */}
      <div className="card p-4 space-y-3">
        <div className="font-display text-xl">İçe aktar (Excel)</div>
        <p className="text-sm text-ink/60">
          Önce şablonu indir, doldurt, sonra dosyayı yükle. Yüklerken kimin adına ve hangi e-postaya
          bağlanacağını sorar.
        </p>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-ghost" onClick={downloadTemplateXlsx}>Şablon indir</button>
          <label className="btn btn-primary cursor-pointer">
            Dosya seç
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFile} />
          </label>
        </div>

        {parsed && (
          <div className="rounded-xl border border-pitch/30 bg-pitch/[0.04] p-3 space-y-2">
            <div className="text-sm font-semibold">
              {parsed.fileName} · {parsed.counts.groups} grup maçı, {parsed.counts.ko} eleme maçı bulundu
            </div>
            <div>
              <label className="label">Kimin adına?</label>
              <input className="field mt-1" placeholder="Oyuncu adı" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="label">E-posta (yeni girilebilir)</label>
              <input className="field mt-1" list="known-emails" placeholder="ornek@eposta.com"
                value={email} onChange={(e) => setEmail(e.target.value)} />
              <datalist id="known-emails">
                {knownEmails.map((em) => <option key={em} value={em} />)}
              </datalist>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button className="btn btn-primary" disabled={busy || !name.trim()} onClick={confirmImport}>
                {busy ? 'Ekleniyor…' : 'İçe aktar'}
              </button>
              <button className="btn btn-ghost" onClick={() => exportPredictionXlsx((name || 'eslesme'), parsed.pred)}>
                Eşleşmeleri hesapla (Excel)
              </button>
              <button className="btn btn-ghost" onClick={() => { setParsed(null); setMsg(null); }}>Vazgeç</button>
            </div>
            <p className="text-[11px] text-ink/45">
              "Eşleşmeleri hesapla", girilen skorlara göre Son 32'den finale eşleşmeleri ve en iyi 8 üçüncüyü
              (uygulamadaki sistemle) hesaplayıp Excel olarak indirir.
            </p>
          </div>
        )}

        {msg && (
          <div className={`text-sm ${msg.type === 'ok' ? 'text-pitch-dark' : 'text-red-600'}`}>{msg.text}</div>
        )}
      </div>

      {/* EXPORT */}
      <div className="card p-4 space-y-3">
        <div className="font-display text-xl">Dışa aktar (Excel)</div>
        {lists.length === 0 ? (
          <p className="text-sm text-ink/55">Henüz liste yok.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <select className="field max-w-[60%]" value={exportId} onChange={(e) => setExportId(e.target.value)}>
              {lists.map((l) => <option key={l.id} value={l.id}>{l.name || l.ownerName}</option>)}
            </select>
            <button className="btn btn-primary" onClick={doExport}>Excel indir</button>
          </div>
        )}
      </div>

      {/* AUTO-FETCH (biten maçlar) */}
      <div className="card p-4 space-y-3">
        <div className="font-display text-xl">Biten maçları içe aktar</div>
        <p className="text-sm text-ink/60">
          Kaynaktan gerçek skorları çeker; <b>yalnızca bitmiş (FINISHED)</b> maçları <b>Sonuçlar</b>'a
          yazar. Devam eden (canlı) maçlar yazılmaz. Önce önizler, sen onaylayınca uygular.
          Kaynak: <code>/api/scores</code> veya <code>VITE_SCORES_URL</code>.
        </p>
        {!preview && (
          <button className="btn btn-primary" disabled={busy} onClick={previewFetch}>
            {busy ? 'Çekiliyor…' : 'Biten maçları çek (önizle)'}
          </button>
        )}

        {preview && (
          <div className="rounded-xl border border-pitch/30 bg-pitch/[0.04] p-3 space-y-2">
            <div className="text-sm font-semibold text-pitch-dark">
              {preview.entries.length} grup + {preview.koEntries?.length || 0} eleme maçı yazılacak
              {preview.liveSkipped > 0 && <span className="text-ink/50 font-normal"> · {preview.liveSkipped} canlı maç atlandı</span>}
            </div>
            {preview.entries.length > 0 ? (
              <ul className="text-sm divide-y divide-black/5 max-h-64 overflow-auto">
                {preview.entries.map((e) => (
                  <li key={e.no} className="py-1.5 flex items-center gap-2">
                    <span className="text-ink/40 w-8">#{e.no}</span>
                    <span className="flex-1 text-right">{e.m?.home || '—'}</span>
                    <span className="font-bold tabular-nums">{e.sc.home}-{e.sc.away}</span>
                    <span className="flex-1">{e.m?.away || '—'}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink/55">Yazılacak grup maçı yok (kaynakta FINISHED grup maçı bulunamadı).</p>
            )}
            {preview.koEntries?.length > 0 && (
              <div>
                <p className="text-[12px] font-semibold text-ink/60 mt-1">🏆 Eleme maçları</p>
                <ul className="text-sm divide-y divide-black/5 max-h-56 overflow-auto">
                  {preview.koEntries.map((e) => (
                    <li key={e.no} className="py-1.5 flex items-center gap-2">
                      <span className="text-ink/40 w-8">#{e.no}</span>
                      <span className="rounded-full bg-black/5 px-1.5 text-[10px] text-ink/55">{e.round}</span>
                      <span className="flex-1 text-right">{e.home ? shortName(e.home) : '—'}</span>
                      <span className="font-bold tabular-nums">{e.v.hs}-{e.v.as}</span>
                      <span className="flex-1">{e.away ? shortName(e.away) : '—'}</span>
                      {e.v.winner && <span className="text-[10px] text-pitch-dark">✓ {shortName(e.v.winner)}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {preview.unmatched.length > 0 && (
              <div className="text-[12px] text-ink/55">
                Eşleşmeyen {preview.unmatched.length} maç:
                <ul className="mt-1 list-disc pl-5">
                  {preview.unmatched.slice(0, 6).map((u, i) => (
                    <li key={i}>{u.homeTeam} – {u.awayTeam} <span className="text-ink/40">({u.reason})</span></li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <button className="btn btn-primary" disabled={preview.entries.length === 0 && (preview.koEntries?.length || 0) === 0} onClick={applyPreview}>
                Onayla ve Sonuçlar'a yaz
              </button>
              <button className="btn btn-ghost" onClick={() => setPreview(null)}>Vazgeç</button>
            </div>
            <p className="text-[11px] text-ink/45">
              Not: Bu skorlar puanlamayı etkiler. Var olan bir sonucun üstüne yazarsa en güncel skor geçerli olur.
            </p>
          </div>
        )}

        {fetchInfo && fetchInfo.type === 'ok' && (
          <div className="text-sm">
            <span className="text-pitch-dark font-semibold">{fetchInfo.matched} maç güncellendi.</span>
            {fetchInfo.liveSkipped > 0 && <span className="text-ink/50"> · {fetchInfo.liveSkipped} canlı atlandı</span>}
            {fetchInfo.unmatched.length > 0 && (
              <div className="mt-1 text-ink/55">
                Eşleşmeyen {fetchInfo.unmatched.length} maç:
                <ul className="mt-1 list-disc pl-5">
                  {fetchInfo.unmatched.slice(0, 8).map((u, i) => (
                    <li key={i}>{u.homeTeam} – {u.awayTeam} <span className="text-ink/40">({u.reason})</span></li>
                  ))}
                </ul>
                <p className="mt-1 text-[11px] text-ink/45">Eşleşmeyen isimleri <code>src/data/teamAliases.js</code>'e ekleyebilirsin.</p>
              </div>
            )}
          </div>
        )}
        {fetchInfo && fetchInfo.type === 'err' && <div className="text-sm text-red-600">{fetchInfo.text}</div>}
      </div>
    </div>
  );
}
