import { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { GROUP_MATCHES, GROUP_NAMES } from '../data/tournament.js';
import { computeStandings, teamForm } from '../lib/scoring.js';
import { SCORING, DEFAULT_SCORING } from '../lib/scoring.js';
import { ScoreBox, SectionTitle, Flag, Dot, FormBadges } from '../components/ui.jsx';
import { shortName } from '../data/flags.js';
import Standings from '../components/Standings.jsx';
import Bracket from '../components/Bracket.jsx';
import ImportExport from './ImportExport.jsx';
import { attemptHighlight, diagnoseHighlight, parseYouTubeId } from '../lib/highlights.js';

const SUB = [
  { id: 'results', label: 'Sonuçlar' },
  { id: 'standings', label: 'Sıralamalar' },
  { id: 'knockout', label: 'Eleme' },
  { id: 'people', label: 'Kişiler' },
  { id: 'transfer', label: 'Aktar' },
  { id: 'logs', label: 'Kayıtlar' },
  { id: 'settings', label: 'Ayarlar' },
];

const confirmTwice = (m1, m2) => window.confirm(m1) && window.confirm(m2);

export default function Admin({ initialSub = 'results' }) {
  const store = useStore();
  const [sub, setSub] = useState(initialSub);

  return (
    <div className="space-y-4">
      <SectionTitle eyebrow="Organizatör" title="Yönetim" />

      {store.lastError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 flex items-start gap-2">
          <span className="flex-1">{store.lastError}</span>
          <button className="font-semibold shrink-0" onClick={store.clearError}>Kapat</button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {SUB.map((s) => (
          <button key={s.id} onClick={() => setSub(s.id)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap ${
              sub === s.id ? 'bg-ink text-white' : 'bg-white text-ink border border-black/10'
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      {sub !== 'settings' && (
        <div className="rounded-xl bg-pitch/10 px-3 py-2 text-sm text-pitch-dark">
          Sonuçları girdikçe puanlar otomatik güncellenir — yeniden hesaplama gerekmez.
        </div>
      )}

      {sub === 'results' && <AdminResults store={store} />}
      {sub === 'standings' && <AdminStandings store={store} />}
      {sub === 'knockout' && <AdminKnockout store={store} />}
      {sub === 'people' && <ListAdmin store={store} />}
      {sub === 'transfer' && <ImportExport store={store} />}
      {sub === 'logs' && <AdminLogs store={store} />}
      {sub === 'settings' && <AdminSettings store={store} />}
    </div>
  );
}

function AdminResults({ store }) {
  const { actual, setActualMatch } = store;
  const [g, setG] = useState('A');
  const matches = GROUP_MATCHES.filter((m) => m.group === g);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-12 gap-1">
        {GROUP_NAMES.map((x) => (
          <button key={x} onClick={() => setG(x)}
            className={`aspect-square rounded-md font-display text-base flex items-center justify-center ${g === x ? 'bg-pitch text-white' : 'bg-white border border-black/10 text-ink'}`}>
            {x}
          </button>
        ))}
      </div>
      <div className="card divide-y divide-black/5">
        {matches.map((m) => {
          const a = actual.groupMatches[m.no] || {};
          return (
            <div key={m.no} className="px-4 py-3">
              <div className="text-[11px] text-ink/45 mb-1.5">{m.no}. maç · {m.date}</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 flex items-center justify-end gap-1.5">
                  <span className="truncate text-sm font-semibold">{shortName(m.home)}</span>
                  <Flag team={m.home} size={18} className="shrink-0" />
                </div>
                <ScoreBox value={a.home} onChange={(v) => setActualMatch(m.no, 'home', v)} />
                <span className="text-ink/30 font-bold shrink-0">:</span>
                <ScoreBox value={a.away} onChange={(v) => setActualMatch(m.no, 'away', v)} />
                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  <Flag team={m.away} size={18} className="shrink-0" />
                  <span className="truncate text-sm font-semibold">{shortName(m.away)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdminStandings({ store }) {
  const { actual, setActualTable, clearActualTable, lists, getPrediction, setGroupTable, clearGroupTable } = store;
  const [target, setTarget] = useState('actual');
  const isActual = target === 'actual';
  const src = isActual ? actual : (getPrediction(target) || { groupMatches: {}, groupTables: {} });
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink/60 px-1">
        Puan durumu skorlardan otomatik oluşur. Eşit puan/averajda üste çıkacak takımı
        belirlemek için sırayı oklarla elle değiştirebilirsin.
      </p>
      <div className="card p-3">
        <label className="label">Kimin sıralaması</label>
        <select className="field mt-1" value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="actual">Gerçek sonuç (herkesin tablosu)</option>
          {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        {!isActual && <p className="mt-1 text-xs text-ink/45">Bu kişinin tahmin sıralamasını düzenliyorsun — eleme eşleşmeleri ve puanı buna göre güncellenir.</p>}
      </div>
      {GROUP_NAMES.map((g) => (
        <GroupOrderEditor key={g + target} g={g}
          scores={src.groupMatches}
          override={src.groupTables?.[g]}
          onSet={(order) => (isActual ? setActualTable(g, order) : setGroupTable(target, g, order))}
          onClear={() => (isActual ? clearActualTable(g) : clearGroupTable(target, g))} />
      ))}
    </div>
  );
}

function GroupOrderEditor({ g, scores, override, onSet, onClear }) {
  const rows = computeStandings(g, scores);
  const byTeam = Object.fromEntries(rows.map((r) => [r.team, r]));
  const manual = !!(override && override.length === 4 && override.every(Boolean));
  const order = manual ? override.filter((t) => byTeam[t]) : rows.map((r) => r.team);
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const a = [...order];
    [a[i], a[j]] = [a[j], a[i]];
    onSet(a);
  };
  return (
    <div className="card p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="font-display text-lg">{g} Grubu</span>
        {manual
          ? <button className="text-xs font-semibold text-pitch" onClick={onClear}>Otomatiğe döndür</button>
          : <span className="text-xs text-ink/40">otomatik</span>}
      </div>
      <div className="divide-y divide-black/5">
        {order.map((t, i) => {
          const r = byTeam[t] || { Pts: 0, GD: 0, GF: 0 };
          return (
            <div key={t} className="flex items-center gap-2 py-1.5">
              <span className={`font-display text-sm w-5 ${i < 2 ? 'text-pitch' : 'text-ink/40'}`}>{i + 1}</span>
              <Flag team={t} size={18} className="shrink-0" />
              <span className="flex-1 min-w-0 truncate text-sm font-semibold">{shortName(t)}</span>
              <FormBadges form={teamForm(t, scores)} />
              <span className="text-[11px] text-ink/45 tabular-nums">{r.Pts}p · Av {r.GD >= 0 ? '+' : ''}{r.GD} · AG {r.GF}</span>
              <div className="flex flex-col leading-none">
                <button className="text-ink/40 hover:text-ink disabled:opacity-20" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Yukarı">▲</button>
                <button className="text-ink/40 hover:text-ink disabled:opacity-20" disabled={i === order.length - 1} onClick={() => move(i, 1)} aria-label="Aşağı">▼</button>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-1.5 text-[11px] text-ink/40">İlk 2 üst tura çıkar · 3. en iyi 8 üçüncüye girebilir.</p>
    </div>
  );
}

function AdminKnockout({ store }) {
  const { actual, mergeActualKo, setActualTopScorer } = store;
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink/60">
        Eşleşmeler girdiğin gerçek sonuçlardan otomatik kurulur. Gerçek kazanan takıma dokunarak
        turu ilerlet; şampiyon, 3.lük gibi sonuçlar bracket'ten otomatik belirlenir.
      </p>
      <Bracket source={actual} ko={actual.ko} onChange={(no, patch) => mergeActualKo(no, patch)} />
      <div className="card p-3">
        <label className="label">Gol Kralı (gerçek)</label>
        <input
          className="field mt-1"
          placeholder="Oyuncu adı"
          value={actual.topScorer || ''}
          onChange={(e) => setActualTopScorer(e.target.value)}
        />
      </div>
    </div>
  );
}

const SCORE_FIELDS = [
  ['Grup maçı', [['match.exact', 'Tam skor'], ['match.result', 'Doğru sonuç']]],
  ['Grup sıralaması', [['groupTable.qualified', 'Üst tura çıkan takım'], ['groupTable.position', 'Doğru sıra'], ['thirdPlace.advance', 'Üst tura çıkan 3.']]],
  ['Eleme', [['knockout.match.exact', 'Tam skor'], ['knockout.match.result', 'Doğru sonuç'], ['knockout.matchup', 'Doğru eşleşme (her tur)'], ['knockout.advance.R32', 'Son 32 kazanan'], ['knockout.advance.R16', 'Son 16 kazanan'], ['knockout.advance.QF', 'Çeyrek kazanan'], ['knockout.advance.SF', 'Yarı kazanan']]],
  ['Final & podyum', [['finals.champion', 'Şampiyon'], ['finals.runnerUp', 'Finalist'], ['finals.third', '3.'], ['finals.fourth', '4.'], ['finals.inThirdPlaceMatch', "3.'lük maçında"], ['finals.topScorer', 'Gol kralı']]],
];
const getP = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const setP = (o, p, v) => { const ks = p.split('.'); const c = structuredClone(o); let t = c; for (let i = 0; i < ks.length - 1; i++) t = t[ks[i]]; t[ks[ks.length - 1]] = v; return c; };

function ScoringEditor({ store }) {
  const [form, setForm] = useState(() => structuredClone(SCORING));
  const [saved, setSaved] = useState(false);
  const save = () => { store.setScoringConfig(structuredClone(form)); setSaved(true); setTimeout(() => setSaved(false), 1500); };
  return (
    <div className="card p-4">
      <p className="font-display text-lg text-ink">Puanlama</p>
      <p className="text-xs text-ink/55 mt-0.5">Değerleri değiştir, kaydet — herkes için geçerli olur, puanlar anında güncellenir.</p>
      {SCORE_FIELDS.map(([grp, fields]) => (
        <div key={grp} className="mt-3">
          <div className="label">{grp}</div>
          <div className="mt-1 divide-y divide-black/5">
            {fields.map(([path, lbl]) => (
              <div key={path} className="flex items-center gap-2 py-1">
                <span className="flex-1 text-sm text-ink/70">{lbl}</span>
                <input type="number" inputMode="numeric"
                  className="w-16 h-9 text-center text-base font-bold rounded-lg border-2 border-black/10 bg-[var(--surface-2)] text-ink focus:border-pitch focus:outline-none"
                  value={getP(form, path)}
                  onChange={(e) => setForm((f) => setP(f, path, e.target.value === '' ? '' : Number(e.target.value)))} />
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="mt-3 flex gap-2">
        <button className="btn-primary flex-1" onClick={save}>{saved ? 'Kaydedildi ✓' : 'Kaydet'}</button>
        <button className="btn bg-black/5 text-ink" onClick={() => setForm(structuredClone(DEFAULT_SCORING))}>Varsayılan</button>
      </div>
    </div>
  );
}

function AdEditor({ store }) {
  const { ad, setAd } = store;
  const [enabled, setEnabled] = useState(ad?.enabled ?? false);
  const [text, setText] = useState(ad?.text || '');
  const [imageUrl, setImageUrl] = useState(ad?.imageUrl || '');
  const [linkUrl, setLinkUrl] = useState(ad?.linkUrl || '');
  const [saved, setSaved] = useState(false);
  const save = () => { store.setAd({ enabled, text, imageUrl, linkUrl }); setSaved(true); setTimeout(() => setSaved(false), 1500); };
  return (
    <div className="card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-display text-lg text-ink">Reklam alanı (ana sayfa)</p>
        <button onClick={() => setEnabled((v) => !v)} className="flex items-center gap-2 text-sm">
          <span className={`relative h-5 w-9 rounded-full transition ${enabled ? 'bg-pitch' : 'bg-black/15'}`}>
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${enabled ? 'left-[18px]' : 'left-0.5'}`} />
          </span>
          {enabled ? 'Açık' : 'Kapalı'}
        </button>
      </div>
      <p className="text-xs text-ink/55">"Senin puanın" ile "Maçlar" arasında görünür. Metin ve/veya görsel girebilirsin; bağlantı verirsen tıklanır.</p>
      <input className="field" placeholder="Reklam metni (ör. Sponsor: …)" value={text} onChange={(e) => setText(e.target.value)} />
      <input className="field" placeholder="Görsel URL (https://…)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
      <input className="field" placeholder="Bağlantı URL (opsiyonel)" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
      {(text || imageUrl) && (
        <div className="rounded-xl border border-black/10 overflow-hidden">
          <div className="text-[10px] uppercase tracking-wide text-ink/40 px-3 pt-2">önizleme</div>
          {imageUrl && <img src={imageUrl} alt="" className="w-full max-h-40 object-cover" />}
          {text && <div className="px-3 py-2 text-sm">{text}</div>}
        </div>
      )}
      <button className="btn btn-primary" onClick={save}>{saved ? 'Kaydedildi ✓' : 'Kaydet'}</button>
    </div>
  );
}

function HighlightAdmin({ store }) {
  const { actual, highlightsByNo = {}, writeHighlight, clearHighlight } = store;
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState(null);
  const [diag, setDiag] = useState(null);
  const test = async () => {
    setProg('Test ediliyor…');
    try {
      const r = await fetch('/api/highlight?debug=1');
      const j = await r.json().catch(() => null);
      if (r.ok && j?.ok) setProg(`✓ Bağlantı OK · kanal: ${j.channelId}`);
      else setProg(`HATA · ${j?.status || r.status} ${j?.reason || j?.error || ''} — ${j?.message || 'anahtar/izin sorunu'}`);
    } catch (e) { setProg('HATA · ağ/sunucu (' + String(e).slice(0, 80) + ')'); }
  };
  const finished = GROUP_MATCHES.filter((m) => {
    const a = actual.groupMatches?.[m.no];
    return a && a.home !== '' && a.home != null && a.away !== '' && a.away != null;
  });
  const missing = finished.filter((m) => !highlightsByNo[m.no]?.videoId);

  const run = async (list, force) => {
    setBusy(true);
    let found = 0, fixed = 0, removed = 0;
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      setProg(`${i + 1}/${list.length} · ${shortName(m.home)}-${shortName(m.away)}`);
      const ex = highlightsByNo[m.no];
      const res = await attemptHighlight(m, ex, { force });
      if (res.action === 'error') {
        const d = res.detail || {};
        setProg(`HATA · YouTube ${d.status || ''} ${d.reason || d.error || ''} — ${d.message || 'anahtar/izin sorunu'}`);
        setBusy(false);
        return;
      }
      if (res.action === 'save') {
        if (ex?.videoId && ex.videoId !== res.data.videoId) fixed++; else found++;
        await writeHighlight(m.no, res.data);
      } else if (res.action === 'tried') {
        // Yeniden taramada doğru video bulunamadıysa eski (yanlış) linki kaldır.
        if (force && ex?.videoId) { await clearHighlight(m.no); removed++; }
        else await writeHighlight(m.no, res.data);
      }
      await new Promise((r) => setTimeout(r, 350));
    }
    setProg(`Bitti · ${found} yeni · ${fixed} düzeltildi · ${removed} hatalı kaldırıldı`);
    setBusy(false);
  };

  const scan = async () => {
    if (!window.confirm(`${missing.length} maç için TRT Spor özet videosu aranacak (YouTube kotası kullanır). Devam?`)) return;
    run(missing, false);
  };
  const rescanAll = async () => {
    if (!window.confirm(`TÜM biten ${finished.length} maç yeniden taranacak; yanlış linkler düzeltilir/kaldırılır (YouTube kotası: ~${finished.length}×100 birim). Devam?`)) return;
    run(finished, true);
  };
  const diagnose = async () => {
    const m = finished[finished.length - 1] || finished[0];
    if (!m) { setDiag('Biten maç yok.'); return; }
    setDiag('Sorgulanıyor…');
    const d = await diagnoseHighlight(m, {});
    if (!d.ok) { setDiag(`${shortName(m.home)}-${shortName(m.away)} · HATA ${d.status || ''} ${d.error || ''} ${d.detail?.reason || ''}`); return; }
    const lines = [
      `Maç: ${shortName(m.home)}-${shortName(m.away)} (${m.group})`,
      `Sorgu: ${d.q}`,
      `Dönen video: ${d.count}`,
      ...d.titles.slice(0, 6).map((t, i) => `${i + 1}. ${t}`),
      `Seçim: ${d.pick ? d.pick.title : '— (eşleşme yok)'}`,
    ];
    setDiag(lines.join('\n'));
  };

  return (
    <div className="card p-4">
      <p className="font-display text-lg text-ink">Maç özetleri (TRT Spor · YouTube)</p>
      <p className="text-xs text-ink/55 mt-0.5">
        Biten maçlar için TRT Spor kanalında özet videosu arar ve “Son sonuçlar” kartına link koyar.
        Bulunan: {finished.length - missing.length}/{finished.length}. (Vercel’de <b>YOUTUBE_API_KEY</b> env gerekir.)
      </p>
      <button disabled={busy || missing.length === 0} onClick={scan}
        className="mt-3 w-full btn bg-ink text-white hover:opacity-90 disabled:opacity-40">
        {busy ? 'Taranıyor…' : `Eksik özetleri tara (${missing.length})`}
      </button>
      <button disabled={busy || finished.length === 0} onClick={rescanAll}
        className="mt-2 w-full btn bg-gold/20 text-gold-dark hover:bg-gold/30 disabled:opacity-40">
        Tümünü yeniden tara (yanlışları düzelt)
      </button>
      <button disabled={busy} onClick={test}
        className="mt-2 w-full btn bg-black/5 text-ink hover:bg-black/10 disabled:opacity-40">
        Bağlantıyı test et
      </button>
      <button disabled={busy} onClick={diagnose}
        className="mt-2 w-full btn bg-black/5 text-ink hover:bg-black/10 disabled:opacity-40">
        Teşhis: son biten maçı dene
      </button>
      {prog && <p className="mt-2 text-xs text-ink/55 break-words">{prog}</p>}
      {diag && <pre className="mt-2 text-[11px] text-ink/70 bg-black/[0.03] rounded-lg p-2 whitespace-pre-wrap break-words">{diag}</pre>}

      <div className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between">
        <div className="pr-3">
          <p className="text-sm font-semibold text-ink">Arka planda otomatik arama</p>
          <p className="text-[11px] text-ink/50">Kapalıyken kullanıcılar siteyi açınca YouTube’da otomatik özet aranmaz; yalnız buradan manuel/tarama ile bulunur.</p>
        </div>
        <button onClick={() => store.setHighlightsAuto(!store.highlightsAuto)}
          className={`shrink-0 w-14 h-8 rounded-full transition relative ${store.highlightsAuto ? 'bg-pitch' : 'bg-black/15'}`}>
          <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${store.highlightsAuto ? 'left-7' : 'left-1'}`} />
        </button>
      </div>

      <HighlightManual store={store} />
    </div>
  );
}

function HighlightManual({ store }) {
  const { actual, highlightsByNo = {}, writeHighlight, clearHighlight } = store;
  const finished = GROUP_MATCHES.filter((m) => {
    const a = actual.groupMatches?.[m.no];
    return a && a.home !== '' && a.home != null && a.away !== '' && a.away != null;
  });
  const [no, setNo] = useState('');
  const [url, setUrl] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const m = finished.find((x) => String(x.no) === String(no));
  const cur = no ? highlightsByNo[no] : null;

  const search = async () => {
    if (!m) return;
    setBusy(true); setMsg('Aranıyor…');
    const res = await attemptHighlight(m, highlightsByNo[m.no], { force: true });
    if (res.action === 'save') { await writeHighlight(m.no, res.data); setMsg(`✓ Bulundu: ${res.data.title}`); }
    else if (res.action === 'error') { const d = res.detail || {}; setMsg(`HATA · ${d.status || ''} ${d.reason || d.error || ''}`); }
    else setMsg('Bulunamadı. Aşağıdan elle link ekleyebilirsin.');
    setBusy(false);
  };
  const addManual = async () => {
    if (!m) return;
    const id = parseYouTubeId(url);
    if (!id) { setMsg('Geçerli bir YouTube linki/ID değil.'); return; }
    await writeHighlight(m.no, { videoId: id, url: `https://www.youtube.com/watch?v=${id}`, title: 'Elle eklendi', manual: true });
    setMsg('✓ Elle eklendi.'); setUrl('');
  };
  const remove = async () => {
    if (!m) return;
    await clearHighlight(m.no); setMsg('Kaldırıldı.');
  };

  return (
    <div className="mt-3 pt-3 border-t border-black/5">
      <p className="text-sm font-semibold text-ink">Tek maç · manuel</p>
      <p className="text-[11px] text-ink/50 mb-2">Bir maç seç; API’de tek tek aratabilir ya da elle YouTube linki yapıştırabilirsin.</p>
      <select value={no} onChange={(e) => { setNo(e.target.value); setMsg(null); setUrl(''); }}
        className="w-full rounded-lg border border-black/10 px-2 py-2 text-sm bg-white">
        <option value="">— maç seç —</option>
        {finished.map((x) => (
          <option key={x.no} value={x.no}>
            {highlightsByNo[x.no]?.videoId ? '✓' : '•'} {x.no}. {shortName(x.home)} - {shortName(x.away)} ({x.group})
          </option>
        ))}
      </select>

      {m && (
        <div className="mt-2 space-y-2">
          {cur?.videoId
            ? <p className="text-[11px] text-ink/60 break-words">Mevcut: <a className="text-red-600 font-semibold" href={cur.url} target="_blank" rel="noreferrer">{cur.title || cur.videoId}</a>{cur.manual ? ' (elle)' : ''}</p>
            : <p className="text-[11px] text-ink/45">Bu maçta henüz özet yok.</p>}
          <div className="flex gap-2">
            <button disabled={busy} onClick={search} className="flex-1 btn bg-ink text-white text-sm disabled:opacity-40">🔍 API’de ara</button>
            {cur?.videoId && <button onClick={remove} className="btn bg-black/5 text-ink text-sm">Kaldır</button>}
          </div>
          <div className="flex gap-2">
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="YouTube linki veya ID"
              className="flex-1 rounded-lg border border-black/10 px-2 py-2 text-sm" />
            <button onClick={addManual} className="btn bg-gold/20 text-gold-dark text-sm">Ekle</button>
          </div>
          {msg && <p className="text-[11px] text-ink/60 break-words">{msg}</p>}
        </div>
      )}
    </div>
  );
}

function AdminSettings({ store }) {
  const { locked, setLocked, resetAllLists, resetActual, lists } = store;
  return (
    <div className="space-y-3">
      <ScoringEditor store={store} />
      <AdEditor store={store} />
      <HighlightAdmin store={store} />

      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-lg text-ink">Tahminleri kilitle</p>
            <p className="text-xs text-ink/55 mt-0.5">Kilitliyken oyuncular tahminlerini değiştiremez.</p>
          </div>
          <button
            onClick={() => {
              if (!locked && !window.confirm('Tahminler herkes için kilitlensin mi?')) return;
              setLocked(!locked);
            }}
            className={`relative w-14 h-8 rounded-full transition ${locked ? 'bg-pitch' : 'bg-black/15'}`}
            aria-pressed={locked}
          >
            <span className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${locked ? 'translate-x-6' : ''}`} />
          </button>
        </div>
        <p className={`mt-2 text-sm font-semibold ${locked ? 'text-pitch-dark' : 'text-ink/40'}`}>
          {locked ? '🔒 Tahminler şu an KİLİTLİ' : '🔓 Tahminler açık'}
        </p>
      </div>

      <div className="card p-4 border border-red-200">
        <p className="font-display text-lg text-red-600">Tehlikeli bölge</p>
        <p className="text-xs text-ink/55 mt-0.5">Test verilerini temizlemek için. Geri alınamaz.</p>

        <button
          onClick={() => {
            if (confirmTwice(
              `${lists.length} listenin TAMAMI ve tüm tahminler silinecek. Emin misin?`,
              'SON UYARI: Bu işlem GERİ ALINAMAZ. Yine de devam edilsin mi?'))
              resetAllLists();
          }}
          className="mt-3 w-full btn bg-red-500 text-white hover:bg-red-600"
        >
          Tüm listeleri sıfırla ({lists.length})
        </button>

        <button
          onClick={() => {
            if (confirmTwice('Girilen tüm gerçek sonuçlar silinsin mi?', 'SON UYARI: Geri alınamaz. Devam?'))
              resetActual();
          }}
          className="mt-2 w-full btn bg-white border border-red-300 text-red-600 hover:bg-red-50"
        >
          Gerçek sonuçları sıfırla
        </button>
      </div>
    </div>
  );
}

function ListAdmin({ store }) {
  const { lists, updateListMeta, deleteList, deleteRequests, approveDelete, rejectDelete } = store;
  return (
    <div className="space-y-3">
      {deleteRequests.length > 0 && (
        <div className="card p-3 border border-red-200 bg-red-50/50 space-y-2">
          <p className="font-display text-lg text-red-700">Silme istekleri ({deleteRequests.length})</p>
          {deleteRequests.map((req) => (
            <div key={req.id} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{req.listName}</div>
                <div className="text-xs text-ink/45 truncate">{req.byName || req.byEmail}</div>
              </div>
              <button className="btn bg-red-600 text-white hover:bg-red-700 px-3 py-1.5 text-sm"
                onClick={() => { if (window.confirm(`"${req.listName}" silinsin mi?`)) approveDelete(req); }}>Onayla & sil</button>
              <button className="btn bg-white border border-black/10 px-3 py-1.5 text-sm"
                onClick={() => rejectDelete(req)}>Reddet</button>
            </div>
          ))}
        </div>
      )}
      <p className="text-sm text-ink/60 px-1">
        Liste adlarını ve atanan e-postaları düzenle. Atanan e-posta, o kişinin kendi listesini
        silebilmesini sağlar.
      </p>
      {lists.length === 0 ? (
        <div className="card p-6 text-center text-ink/50">Henüz liste yok.</div>
      ) : (
        lists.map((l) => (
          <ListAdminRow key={l.id} l={l}
            onSave={(p) => updateListMeta(l.id, p)}
            onDelete={() => {
              if (window.confirm(`"${l.name}" listesi silinsin mi?`) && window.confirm('Emin misin? Geri alınamaz.'))
                deleteList(l.id);
            }} />
        ))
      )}
    </div>
  );
}

function ListAdminRow({ l, onSave, onDelete }) {
  const [name, setName] = useState(l.name || '');
  const [email, setEmail] = useState(l.ownerEmail || '');
  const dirty = name.trim() !== (l.name || '') || email.trim() !== (l.ownerEmail || '');
  const inp = 'w-full rounded-lg bg-black/5 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pitch/30';
  return (
    <div className="card p-2.5">
      <div className="flex items-center gap-2">
        <Dot color={l.color} />
        <input className={inp} value={name} placeholder="Ad" onChange={(e) => setName(e.target.value)} />
        <button title="Kaydet" disabled={!dirty} onClick={() => onSave({ name, ownerEmail: email })}
          className={`h-8 w-8 shrink-0 grid place-items-center rounded-lg ${dirty ? 'bg-pitch text-white' : 'bg-black/5 text-ink/30'}`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        </button>
        <button title="Sil" onClick={onDelete}
          className="h-8 w-8 shrink-0 grid place-items-center rounded-lg bg-white border border-red-300 text-red-600">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
        </button>
      </div>
      <div className="flex items-center gap-2 mt-1.5 pl-[18px]">
        <span className="text-[11px] text-ink/40 shrink-0">@</span>
        <input className={inp} value={email} placeholder="atanan e-posta" onChange={(e) => setEmail(e.target.value)} />
        <span className="text-[10px] text-ink/40 shrink-0 w-16 text-right truncate">{l.imported ? 'içe akt.' : 'kullanıcı'}</span>
      </div>
    </div>
  );
}

function AdminLogs({ store }) {
  const { logs } = store;
  const fmt = (ts) => {
    try {
      const d = ts?.toDate ? ts.toDate() : (ts?.seconds ? new Date(ts.seconds * 1000) : null);
      return d ? d.toLocaleString('tr-TR') : '—';
    } catch { return '—'; }
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink/60 px-1">Yönetici işlemleri (son 100 kayıt).</p>
      {(!logs || logs.length === 0) ? (
        <div className="card p-6 text-center text-ink/50">Henüz kayıt yok.</div>
      ) : (
        <div className="card divide-y divide-black/5 overflow-hidden">
          {logs.map((l) => {
            const col = logColor(l.action || '');
            return (
              <div key={l.id} className="px-4 py-2.5" style={{ boxShadow: `inset 4px 0 0 ${col}` }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: col }}>
                    <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ background: col }} />
                    {l.action}
                  </span>
                  <span className="text-[11px] text-ink/40 shrink-0">{fmt(l.ts)}</span>
                </div>
                {l.detail && <div className="text-xs text-ink/55 pl-4">{l.detail}</div>}
                <div className="text-[11px] text-ink/35 pl-4">{l.email}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const LOG_PALETTE = ['#0a8754', '#2563eb', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#65a30d'];
function logColor(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return LOG_PALETTE[Math.abs(h) % LOG_PALETTE.length];
}
