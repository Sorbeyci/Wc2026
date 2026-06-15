import { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { GROUP_MATCHES, GROUP_NAMES } from '../data/tournament.js';
import { computeStandings } from '../lib/scoring.js';
import { ScoreBox, SectionTitle, Flag, Dot } from '../components/ui.jsx';
import { shortName } from '../data/flags.js';
import Standings from '../components/Standings.jsx';
import Bracket from '../components/Bracket.jsx';
import ImportExport from './ImportExport.jsx';

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

export default function Admin() {
  const store = useStore();
  const [sub, setSub] = useState('results');

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
      <div className="-mx-4 px-4 overflow-x-auto">
        <div className="flex gap-1.5 w-max">
          {GROUP_NAMES.map((x) => (
            <button key={x} onClick={() => setG(x)}
              className={`w-9 h-9 rounded-lg font-display text-lg ${g === x ? 'bg-pitch text-white' : 'bg-white border border-black/10 text-ink'}`}>
              {x}
            </button>
          ))}
        </div>
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

function AdminSettings({ store }) {
  const { locked, setLocked, resetAllLists, resetActual, lists } = store;
  return (
    <div className="space-y-3">
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
  return (
    <div className="card p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Dot color={l.color} />
        <span className="text-xs text-ink/45 truncate">
          {l.imported ? 'İçe aktarıldı' : 'Kullanıcı'}{l.ownerName ? ` · ${l.ownerName}` : ''}
        </span>
      </div>
      {l.ownerEmail && <div className="text-xs font-medium text-pitch-dark break-all">{l.ownerEmail}</div>}
      <div>
        <label className="label">Ad</label>
        <input className="field mt-1" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="label">Atanan e-posta</label>
        <input className="field mt-1" value={email} placeholder="ornek@eposta.com" onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="flex gap-2 pt-0.5">
        <button className="btn btn-primary" disabled={!dirty} onClick={() => onSave({ name, ownerEmail: email })}>Kaydet</button>
        <button className="btn bg-white border border-red-300 text-red-600 hover:bg-red-50" onClick={onDelete}>Sil</button>
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
          {logs.map((l) => (
            <div key={l.id} className="px-4 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-ink">{l.action}</span>
                <span className="text-[11px] text-ink/40 shrink-0">{fmt(l.ts)}</span>
              </div>
              {l.detail && <div className="text-xs text-ink/55">{l.detail}</div>}
              <div className="text-[11px] text-ink/35">{l.email}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
