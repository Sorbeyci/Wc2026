import { useMemo } from 'react';
import { useStore } from '../lib/store.jsx';
import { GROUP_MATCHES } from '../data/tournament.js';
import { scoreUser, SCORING } from '../lib/scoring.js';
import { Dot } from '../components/ui.jsx';

export default function Home({ setPage }) {
  const { lists, actual, getPrediction, user, isAdmin, adminEligible, adminMode, setAdminMode, logout } = useStore();

  const rows = useMemo(() => {
    return lists
      .map((l) => ({ list: l, ...scoreUser(getPrediction(l.id), actual) }))
      .sort((a, b) => b.total - a.total);
  }, [lists, actual]);

  const resultsIn = Object.values(actual.groupMatches).filter(
    (m) => m && m.home !== '' && m.home != null && m.away !== '' && m.away != null
  ).length;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl bg-ink text-white p-5">
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-pitch/30 blur-2xl" />
        <div className="absolute right-6 bottom-4 text-6xl opacity-10 font-display">26</div>
        <p className="label text-white/60">FIFA Dünya Kupası 2026</p>
        <h1 className="font-display text-4xl leading-none mt-1">Tahmin<br />Oyunu</h1>
        <p className="mt-3 text-sm text-white/70">Merhaba {user?.displayName?.split(' ')[0] || 'oyuncu'}{isAdmin ? ' · yönetici' : ''}.</p>
        <div className="mt-4 flex gap-2">
          <button className="btn-primary" onClick={() => setPage('predict')}>Tahmin yap</button>
          <button className="btn bg-white/10 text-white hover:bg-white/20" onClick={() => setPage('board')}>Sıralama</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Tile value={lists.length} label="Liste" onClick={() => setPage('lists')} />
        <Tile value={`${resultsIn}/${GROUP_MATCHES.length}`} label="Sonuç girildi" onClick={() => isAdmin && setPage('admin')} />
        <Tile value={rows[0]?.total ?? 0} label="En yüksek" onClick={() => setPage('board')} />
      </div>

      {adminEligible && (
        <div className={`card p-4 flex items-center justify-between ${adminMode ? 'ring-1 ring-pitch/40' : ''}`}>
          <div>
            <div className="font-semibold text-ink">Admin modu</div>
            <div className="text-xs text-ink/55">
              {adminMode ? 'Açık — yönetici yetkilerin aktif.' : 'Kapalı — normal kullanıcı gibi görüyorsun.'}
            </div>
          </div>
          <button
            onClick={() => setAdminMode(!adminMode)}
            className={`relative h-7 w-12 rounded-full transition ${adminMode ? 'bg-pitch' : 'bg-black/20'}`}
            aria-label="Admin modu"
          >
            <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${adminMode ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </div>
      )}

      <div className="card p-4">
        <div className="flex items-center justify-between">
          <p className="font-display text-xl">Tablonun zirvesi</p>
          <button className="text-sm font-semibold text-pitch" onClick={() => setPage('board')}>Tümü</button>
        </div>
        {rows.length === 0 ? (
          <p className="mt-2 text-sm text-ink/55">Henüz liste yok — başlamak için bir tane oluştur.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {rows.slice(0, 3).map((r, i) => (
              <div key={r.list.id} className="flex items-center gap-3">
                <span className={`font-display text-lg w-5 ${i === 0 && r.total > 0 ? 'text-gold-dark' : 'text-ink/30'}`}>{i + 1}</span>
                <Dot color={r.list.color} />
                <span className="flex-1 font-semibold text-sm truncate">{r.list.name}</span>
                <span className="font-display text-lg">{r.total}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-4">
        <p className="font-display text-xl">Puanlama nasıl işler</p>
        <ul className="mt-2 space-y-1.5 text-sm text-ink/70">
          <Rule t="Tam skor" v={`${SCORING.match.exact} puan`} />
          <Rule t="Sadece doğru sonuç" v={`${SCORING.match.result} puan`} />
          <Rule t="Üst tura çıkan takım (her takım)" v={`${SCORING.groupTable.qualified} puan`} />
          <Rule t="Doğru grup sırası (her takım)" v={`${SCORING.groupTable.position} puan`} />
          <Rule t="Üst tura çıkan 3. takım (8 takım, otomatik)" v={`${SCORING.thirdPlace.advance} puan`} />
          <Rule t="Son 32 / Son 16 doğru kazanan" v={`${SCORING.knockout.advance.R32} / ${SCORING.knockout.advance.R16} puan`} />
          <Rule t="Çeyrek / Yarı final doğru kazanan" v={`${SCORING.knockout.advance.QF} / ${SCORING.knockout.advance.SF} puan`} />
          <Rule t="Şampiyon / İkinci" v={`${SCORING.finals.champion} / ${SCORING.finals.runnerUp} puan`} />
          <Rule t="Gol kralı" v={`${SCORING.finals.topScorer} puan`} />
        </ul>
      </div>

      <button className="w-full btn-ghost" onClick={logout}>Çıkış yap</button>
    </div>
  );
}

function Tile({ value, label, onClick }) {
  return (
    <button onClick={onClick} className="card p-3 text-center active:scale-[.98] transition">
      <div className="font-display text-2xl text-ink leading-none">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-ink/45 mt-1">{label}</div>
    </button>
  );
}

function Rule({ t, v }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span>{t}</span>
      <span className="font-semibold text-ink whitespace-nowrap">{v}</span>
    </li>
  );
}
