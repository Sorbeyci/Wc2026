import { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { GROUP_MATCHES, GROUP_NAMES } from '../data/tournament.js';
import { ScoreBox, SectionTitle, Flag } from '../components/ui.jsx';
import { shortName } from '../data/flags.js';
import Standings from '../components/Standings.jsx';
import Bracket from '../components/Bracket.jsx';
import ImportExport from './ImportExport.jsx';

const SUB = [
  { id: 'results', label: 'Sonuçlar' },
  { id: 'standings', label: 'Sıralamalar' },
  { id: 'knockout', label: 'Eleme' },
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

      <div className="-mx-4 px-4 overflow-x-auto">
        <div className="flex gap-2 w-max">
          {SUB.map((s) => (
            <button key={s.id} onClick={() => setSub(s.id)}
              className={`rounded-full px-3.5 py-2 text-sm font-semibold whitespace-nowrap ${
                sub === s.id ? 'bg-ink text-white' : 'bg-white text-ink border border-black/10'
              }`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {sub !== 'settings' && (
        <div className="rounded-xl bg-pitch/10 px-3 py-2 text-sm text-pitch-dark">
          Sonuçları girdikçe puanlar otomatik güncellenir — yeniden hesaplama gerekmez.
        </div>
      )}

      {sub === 'results' && <AdminResults store={store} />}
      {sub === 'standings' && <AdminStandings store={store} />}
      {sub === 'knockout' && <AdminKnockout store={store} />}
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
  const { actual } = store;
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink/60 px-1">
        Gerçek puan durumu, girdiğin maç skorlarından otomatik oluşur.
      </p>
      <Standings scores={actual.groupMatches} />
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
