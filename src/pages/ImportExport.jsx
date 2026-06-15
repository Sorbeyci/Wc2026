import { useState, useMemo } from 'react';
import { downloadTemplateXlsx, exportPredictionXlsx, parsePredictionFile } from '../lib/excel.js';
import { normalizeScorePayload } from '../lib/importScores.js';

export default function ImportExport({ store }) {
  const { lists, getPrediction, importList, applyFetchedScores } = store;
  const [parsed, setParsed] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [exportId, setExportId] = useState(lists[0]?.id || '');
  const [fetchInfo, setFetchInfo] = useState(null);

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

  async function autoFetch() {
    setBusy(true); setFetchInfo(null);
    try {
      const url = import.meta.env.VITE_SCORES_URL || '/api/scores';
      const r = await fetch(url);
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setFetchInfo({ type: 'err', text: data?.error || `HTTP ${r.status}` });
      } else {
        const norm = normalizeScorePayload(data);
        applyFetchedScores({ groupMatches: norm.groupMatches, ko: norm.ko });
        setFetchInfo({ type: 'ok', matched: norm.matched, unmatched: norm.unmatched || [] });
      }
    } catch (err) {
      setFetchInfo({ type: 'err', text: err?.message || 'İstek hatası' });
    }
    setBusy(false);
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

      {/* AUTO-FETCH */}
      <div className="card p-4 space-y-3">
        <div className="font-display text-xl">Skorları otomatik çek</div>
        <p className="text-sm text-ink/60">
          Gerçek maç sonuçlarını kaynak servisten çekip <b>Sonuçlar</b>'a yazar (grup maçları takım
          eşleşmesiyle otomatik). Kaynak: <code>/api/scores</code> veya <code>VITE_SCORES_URL</code>.
        </p>
        <button className="btn btn-primary" disabled={busy} onClick={autoFetch}>
          {busy ? 'Çekiliyor…' : 'Skorları çek ve uygula'}
        </button>
        {fetchInfo && fetchInfo.type === 'ok' && (
          <div className="text-sm">
            <span className="text-pitch-dark font-semibold">{fetchInfo.matched} maç güncellendi.</span>
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
