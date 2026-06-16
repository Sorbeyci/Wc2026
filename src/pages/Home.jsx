import { useMemo, useState, useEffect } from 'react';
import { useStore } from '../lib/store.jsx';
import { GROUP_MATCHES } from '../data/tournament.js';
import { scoreUser, SCORING } from '../lib/scoring.js';
import { Dot, Flag, Avatar, CountUp } from '../components/ui.jsx';
import { shortName, teamColor } from '../data/flags.js';

const TR_MON = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const todayStr = () => { const n = new Date(); return `${TR_MON[n.getMonth()]} ${n.getDate()}, ${n.getFullYear()}`; };
const dayKey = (date) => {
  const mt = (date || '').match(/^(\S+)\s+(\d+),\s*(\d+)$/);
  return mt ? (Number(mt[3]) * 10000 + (TR_MON.indexOf(mt[1]) + 1) * 100 + Number(mt[2])) : 0;
};
const timeKey = (m) => { const [h, mm] = (m.time || '0:0').split(':').map(Number); return dayKey(m.date) * 10000 + h * 100 + mm; };
const hasScore = (s) => s && s.home !== '' && s.home != null && s.away !== '' && s.away != null;

const TOUR_START = new Date(2026, 5, 11); // 11 Haziran 2026
const TOUR_FINAL = new Date(2026, 6, 19); // 19 Temmuz 2026 (final)
const DAY_MS = 86400000;
function tournamentStatus() {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  if (t < TOUR_START) return `Başlamasına ${Math.ceil((TOUR_START - t) / DAY_MS)} gün`;
  if (t > TOUR_FINAL) return 'Turnuva tamamlandı';
  const dayNo = Math.floor((t - TOUR_START) / DAY_MS) + 1;
  const left = Math.ceil((TOUR_FINAL - t) / DAY_MS);
  return `Turnuvanın ${dayNo}. günü · finale ${left} gün kaldı`;
}

export default function Home({ setPage }) {
  const { lists, actual, getPrediction, user, isAdmin, adminEligible, adminMode, setAdminMode, logout, isMyList, theme, setTheme } = useStore();

  const rows = useMemo(() => {
    return lists
      .map((l) => ({ list: l, ...scoreUser(getPrediction(l.id), actual) }))
      .sort((a, b) => b.total - a.total);
  }, [lists, actual]);

  const hasSc = (m) => m && m.home !== '' && m.home != null && m.away !== '' && m.away != null;
  const resultsIn = Object.values(actual.groupMatches).filter(hasSc).length;
  const koIn = Object.values(actual.ko || {}).filter(
    (k) => k && k.hs !== '' && k.hs != null && k.as !== '' && k.as != null
  ).length;
  const totalMatches = GROUP_MATCHES.length + 32; // 72 grup + 32 eleme
  const progressPct = Math.round(((resultsIn + koIn) / totalMatches) * 100);

  const myList = lists.find((l) => isMyList(l));
  const myPred = myList ? getPrediction(myList.id) : null;
  const [progMode, setProgMode] = useState('pct');
  const funSeed = useMemo(() => `${Date.now()}:${user?.uid || 'anon'}`, [user?.uid]);
  const [scoringOpen, setScoringOpen] = useState(() => { try { return localStorage.getItem('wc_scoring_help_open') !== '0'; } catch { return true; } });
  const toggleScoring = () => setScoringOpen((o) => { const n = !o; try { localStorage.setItem('wc_scoring_help_open', n ? '1' : '0'); } catch (e) {} return n; });

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl bg-ink text-white p-5">
        <div className="pointer-events-none absolute -right-8 -top-8 w-40 h-40 rounded-full bg-pitch/30 blur-2xl" />
        <div className="pointer-events-none absolute right-6 bottom-4 text-6xl opacity-10 font-display">26</div>
        <div className="relative z-10 flex items-center justify-between gap-2">
          <p className="font-display text-lg text-pitch leading-none">kupayikimalir.com</p>
          <div className="flex flex-col items-end gap-2 shrink-0">
            {adminEligible && (
              <button onClick={() => setAdminMode(!adminMode)} className="flex items-center gap-1.5" aria-label="Admin modu">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-white/60">Admin</span>
                <span className={`relative h-5 w-9 rounded-full transition ${adminMode ? 'bg-pitch' : 'bg-white/20'}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${adminMode ? 'left-[18px]' : 'left-0.5'}`} />
                </span>
              </button>
            )}
            <HeroTheme theme={theme} setTheme={setTheme} />
          </div>
        </div>
        <p className="label text-white/60 mt-2">FIFA Dünya Kupası 2026</p>
        <h1 className="font-display text-4xl leading-none mt-1">Tahmin<br />Oyunu</h1>
        <p className="mt-2 text-xs font-semibold text-gold">{tournamentStatus()}</p>
        <p className="mt-2 text-sm text-white/70">Merhaba {user?.displayName?.split(' ')[0] || 'oyuncu'}{isAdmin ? ' · yönetici' : ''}.</p>
        <div className="mt-4 flex gap-2">
          <button className="btn-primary" onClick={() => setPage('predict')}>Tahmin yap</button>
          <button className="btn bg-red-600 text-white hover:bg-red-700 shadow-sm" onClick={() => setPage('board')}>Sıralama →</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Tile value={lists.length} label="Katılımcı" onClick={() => setPage('lists')} />
        <Tile
          value={progMode === 'pct' ? `%${progressPct}` : `${resultsIn + koIn}/${totalMatches}`}
          label="İlerleme"
          onClick={() => setProgMode((m) => (m === 'pct' ? 'frac' : 'pct'))}
        />
        <Tile value={rows[0]?.total ?? 0} label="En yüksek" onClick={() => setPage('board')} />
      </div>

      <MyScore rows={rows} isMyList={isMyList} setPage={setPage} onCreate={() => setPage('lists')} />
      <DayBrowser lists={lists} getPrediction={getPrediction} actual={actual} myPred={myPred} />
      <RecentResults actual={actual} />
      <FunStats lists={lists} getPrediction={getPrediction} actual={actual} seed={funSeed} />

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

      <div className="card overflow-hidden">
        <button onClick={toggleScoring} className="w-full flex items-center justify-between gap-2 px-4 py-3">
          <span className="font-display text-xl">Puanlama nasıl işler</span>
          <span className={`text-ink/40 transition ${scoringOpen ? 'rotate-180' : ''}`}>▾</span>
        </button>
        {scoringOpen && (
          <ul className="px-4 pb-4 space-y-1.5 text-sm text-ink/70 fade-in">
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
        )}
      </div>

      <button className="w-full btn-ghost" onClick={logout}>Çıkış yap</button>

      <Footer />
    </div>
  );
}

const CHANGELOG = [
  {
    v: '2.2', date: 'Haziran 2026', items: [
      'Tema (Sistem/Açık/Koyu) sağ üst köşede ikon olarak.',
      'Listeler/Tahminler/Sıralama sayfalarına küçük marka başlığı.',
      'Sıralama filtre/sırala çubuğu artık ikonla açılır (varsayılan kapalı).',
      'Yeni liste oluştur: sistem kilitliyse kapalı, açıksa açık (katlanır).',
      'Puanlama nasıl işler katlanır ve kapalı tercihi hatırlanır.',
      'Admin: grup seçici tek satır, Kişiler iki satırlık dar tasarım, Kayıtlar renk kodlu.',
    ],
  },
  {
    v: '2.1', date: 'Haziran 2026', items: [
      'Sıralamada kategoriye göre sıralama (Eleme/Grup/Tam skor/3.\'ler), online filtre ve isim arama.',
      'Enteresan istatistikler 3 madde ve her oturumda (giriş/çıkış) değişiyor.',
      'İlerleme sayacına dokununca yüzde ↔ kesir.',
    ],
  },
  {
    v: '2.0', date: 'Haziran 2026', items: [
      'Kişi sayfasından kendi puan kartını paylaşma (paylaş ikonu, 9:16 görsel).',
      'Yatay kaydırmalı tam eleme ağacı: tahmin + gerçek sonuç bir arada ("Ağaç" sekmesi).',
      'Maç ve podyum kartlarında takım bayrak rengiyle kimlik vurgusu.',
    ],
  },
  {
    v: '1.9', date: 'Haziran 2026', items: [
      'Avatarlar her zaman isim-soyisim baş harfi (foto kullanılmıyor).',
      'Sıralama bölümüne daha ferah boşluklar.',
    ],
  },
  {
    v: '1.8', date: 'Haziran 2026', items: [
      'Puanlar değişince yukarı sayan animasyon; sıra değişiminde satırların yumuşak kayması.',
      'Bugünün maçlarında "CANLI" rozeti ve maç öncesi geri sayım.',
      'Profil avatarları (baş harf/foto) listelerde, sıralamada ve podyumda.',
      'Tek dokunuşla paylaşılabilir sıralama görseli (story).',
      'Sekmelerde kayan vurgu + içerik geçiş animasyonu.',
      'Yükleme iskeletleri (skeleton) ve dokunsal geri bildirim.',
    ],
  },
  {
    v: '1.7', date: 'Haziran 2026', items: [
      'Maçlar kartında "Kendi skorum" anahtarı: her maçın altında senin tahminin.',
      'Karşılaştır (H2H) içinde kişi başına açılır detaylı istatistik.',
      '"X/72 sonuç" yerine toplam ilerleme oranı (% — grup + eleme).',
    ],
  },
  {
    v: '1.6', date: 'Haziran 2026', items: [
      'Geçici puanlar daha belirgin (büyük buton); grup/3.\'ler/eleme dökümünde kim nereden puan almış detayı.',
      'Tahmin detayında puan rozetleri artık takımları kaydırmıyor (ortada sabit).',
      '"Liste" sayısı "Katılımcı" oldu.',
      'Tahmin düzenlemede kişi seçimi kayan çubuk yerine açılır menü.',
      'Karşılaştır (H2H) artık detaylı istatistik karşılaştırması içeriyor.',
    ],
  },
  {
    v: '1.5', date: 'Haziran 2026', items: [
      'Sıralamada "Geçici puanlar" (projeksiyon): şu anki sonuçlara göre tahmini puanlar — resmî sıralamayı titretmeden, etiketli.',
      'Tahmin detayında her maçın getirdiği puan rozeti (+5/+3, eleme kazananı için ✓).',
    ],
  },
  {
    v: '1.4', date: 'Haziran 2026', items: [
      'Koyu mod (Sistem/Açık/Koyu) — ana sayfadan seçilir.',
      'Yeni puan: doğru eleme eşleşmesi başına puan (tüm turlar).',
      'Yönetim > Ayarlar: tüm puan değerleri düzenlenebilir.',
      'Sıralamada podyum (ilk 3 + avatar) ve "Karşılaştır" (H2H) sekmesi.',
      'Sıralama değişim oku (▲/▼) ve maç sonuçlarında kazanan yeşil / form rozetleri (G/B/M).',
    ],
  },
  {
    v: '1.3', date: 'Haziran 2026', items: [
      'Yönetim > Sıralamalar: "Kimin sıralaması" seçici — gerçek tablo veya herhangi bir kişinin tahmin sıralaması oklarla düzenlenebilir.',
    ],
  },
  {
    v: '1.2', date: 'Haziran 2026', items: [
      'Sıralamada görünüm seçenekleri: Detay / Liste / Tablo (hepsinde puan).',
      'Kategori dökümünde "Bildiğin maçlar" listesi (maç + skor + puan).',
      'Ana sayfada "Enteresan istatistikler" bölümü.',
      'Tahmin yüzdelerinde tüm isimler tam görünür.',
      'Yönetim > Sıralamalar: eşit puan/averajda elle sıralama (üste çıkarma).',
      'Admin modu anahtarı ana sayfada marka satırına taşındı.',
      '"1./2./3. Adım" başlıkları kaldırıldı.',
    ],
  },
  {
    v: '1.1', date: 'Haziran 2026', items: [
      'Ana sayfa: bugünün maçları, gün gezgini (dün/yarın), canlı tahmin yüzdeleri.',
      'Kendi puanın ana sayfada; turnuva günü ve finale kalan gün sayacı.',
      'Sıralamada şampiyon & gol kralı, "en çok puan" rozeti, tıklanır puan dökümü.',
      'Çevrimiçi (Online) göstergesi.',
      'Excel içe aktarım: excely.com şablonundan grup + tüm eleme turları.',
      'Yönetim > Kişiler: ad/e-posta düzenleme, atama, silme istekleri onayı.',
    ],
  },
];

function Footer() {
  const [open, setOpen] = useState(false);
  const [openV, setOpenV] = useState(CHANGELOG[0].v);
  return (
    <div className="pt-2 pb-6 text-center">
      <button onClick={() => setOpen((o) => !o)} className="text-xs font-semibold text-ink/40 hover:text-ink/70">
        Version {CHANGELOG[0].v}
      </button>
      {open && (
        <div className="mt-3 text-left space-y-2">
          {CHANGELOG.map((c) => {
            const exp = openV === c.v;
            return (
              <div key={c.v} className="card overflow-hidden">
                <button className="w-full flex items-center gap-2 px-4 py-2.5" onClick={() => setOpenV(exp ? null : c.v)}>
                  <span className="font-display text-lg">Sürüm {c.v}</span>
                  <span className="text-xs text-ink/45">{c.date}</span>
                  <span className={`ml-auto text-ink/40 transition ${exp ? 'rotate-180' : ''}`}>▾</span>
                </button>
                {exp && (
                  <ul className="border-t border-black/5 px-4 py-3 space-y-1.5 text-sm text-ink/70">
                    {c.items.map((it, i) => (
                      <li key={i} className="flex gap-2"><span className="text-pitch">•</span><span>{it}</span></li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MyScore({ rows, isMyList, setPage }) {
  const mine = rows.map((r, i) => ({ ...r, rank: i + 1 })).filter((r) => isMyList(r.list));
  if (mine.length === 0) {
    return (
      <div className="card p-4 flex items-center justify-between">
        <div>
          <p className="font-display text-xl">Senin puanın</p>
          <p className="text-xs text-ink/55 mt-0.5">Henüz bir listen yok.</p>
        </div>
        <button className="btn-primary" onClick={() => setPage('lists')}>Liste oluştur</button>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {mine.map((r) => (
        <button key={r.list.id} onClick={() => setPage('board')}
          className="card p-4 w-full text-left active:scale-[.99] transition ring-1 ring-pitch/30">
          <div className="flex items-center gap-3">
            <Avatar name={r.list.ownerName || r.list.name} color={r.list.color} src={r.list.ownerPhoto} size={40} />
            <div className="flex-1 min-w-0">
              <p className="label text-pitch">Senin puanın</p>
              <p className="font-semibold text-ink truncate mt-0.5">{r.list.name} · {r.rank}. sıra</p>
            </div>
            <span className="font-display text-3xl text-pitch leading-none"><CountUp value={r.total} /></span>
            <span className="text-ink/25">›</span>
          </div>
          <div className="mt-2 grid grid-cols-5 gap-1.5 text-center">
            <MyMini label="Maçlar" v={r.breakdown.groupMatches} />
            <MyMini label="Gruplar" v={r.breakdown.groupTables} />
            <MyMini label="3.'ler" v={r.breakdown.thirds} />
            <MyMini label="Eleme" v={r.breakdown.knockout} />
            <MyMini label="Final" v={r.breakdown.finals} />
          </div>
        </button>
      ))}
    </div>
  );
}

function MyMini({ label, v }) {
  return (
    <div className="rounded-lg bg-black/[0.03] py-1.5">
      <div className="font-display text-lg text-ink leading-none">{v}</div>
      <div className="text-[10px] uppercase tracking-wide text-ink/45 mt-0.5">{label}</div>
    </div>
  );
}

function HeroTheme({ theme, setTheme }) {
  const I = {
    system: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>,
    light: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>,
    dark: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>,
  };
  const opts = [['system', 'Sistem'], ['light', 'Açık'], ['dark', 'Koyu']];
  return (
    <div className="flex rounded-full bg-white/10 p-0.5">
      {opts.map(([id, label]) => (
        <button key={id} onClick={() => setTheme(id)} title={label} aria-label={label}
          className={`h-7 w-7 grid place-items-center rounded-full transition ${theme === id ? 'bg-white text-ink' : 'text-white/60'}`}>
          {I[id]}
        </button>
      ))}
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

// Prediction distribution for a group match across all lists.
function distribution(no, lists, getPrediction) {
  const who = { H: [], D: [], A: [] };
  for (const l of lists) {
    const p = getPrediction(l.id).groupMatches?.[no];
    if (!hasScore(p)) continue;
    const hs = Number(p.home), as = Number(p.away);
    if (isNaN(hs) || isNaN(as)) continue;
    const o = hs > as ? 'H' : hs < as ? 'A' : 'D';
    who[o].push(l.name);
  }
  const tot = who.H.length + who.D.length + who.A.length;
  const pct = (n) => (tot ? Math.round((n / tot) * 100) : 0);
  return { tot, who, ph: pct(who.H.length), pd: pct(who.D.length), pa: pct(who.A.length) };
}

const dateForOffset = (off) => { const n = new Date(); n.setDate(n.getDate() + off); return `${TR_MON[n.getMonth()]} ${n.getDate()}, ${n.getFullYear()}`; };
const matchDate = (m) => {
  const md = (m.date || '').match(/^(\S+)\s+(\d+),\s*(\d+)$/);
  if (!md) return null;
  const mon = TR_MON.indexOf(md[1]);
  const [h, mi] = (m.time || '0:0').split(':').map(Number);
  return new Date(+md[3], mon, +md[2], h || 0, mi || 0);
};
function liveBadge(m, now) {
  const st = matchDate(m);
  if (!st) return null;
  const diff = st.getTime() - now;
  if (diff <= 0 && now - st.getTime() < 130 * 60000) return { type: 'live' };
  if (diff > 0 && diff <= 24 * 3600000) {
    const h = Math.floor(diff / 3600000), mm = Math.floor((diff % 3600000) / 60000);
    return { type: 'count', text: h > 0 ? `${h} sa ${mm} dk` : `${mm} dk` };
  }
  return null;
}

function DayBrowser({ lists, getPrediction, actual, myPred }) {
  const [off, setOff] = useState(0);
  const [openNo, setOpenNo] = useState(null);
  const [showMine, setShowMine] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(iv); }, []);
  const date = dateForOffset(off);
  const matches = useMemo(
    () => GROUP_MATCHES.filter((m) => m.date === date).sort((a, b) => timeKey(a) - timeKey(b)),
    [date]
  );
  const setDay = (o) => { setOff(o); setOpenNo(null); };
  const label = off === 0 ? 'Bugün' : off === -1 ? 'Dün' : off === 1 ? 'Yarın' : date;
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-black/5">
        <div className="flex items-center justify-between">
          <p className="font-display text-xl">Maçlar · {label}</p>
          <div className="flex items-center gap-1">
            <button className="h-7 w-7 rounded-full bg-black/5 text-ink/70 active:scale-95" onClick={() => setDay(off - 1)} aria-label="Önceki gün">‹</button>
            <button className="h-7 w-7 rounded-full bg-black/5 text-ink/70 active:scale-95" onClick={() => setDay(off + 1)} aria-label="Sonraki gün">›</button>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          {[['Dün', -1], ['Bugün', 0], ['Yarın', 1]].map(([t, o]) => (
            <button key={o} onClick={() => setDay(o)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${off === o ? 'bg-ink text-white' : 'bg-black/5 text-ink/70'}`}>{t}</button>
          ))}
          {myPred && (
            <button onClick={() => setShowMine((v) => !v)}
              className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold transition ${showMine ? 'bg-pitch text-white' : 'bg-black/5 text-ink/55'}`}>
              Kendi skorum
            </button>
          )}
        </div>
      </div>
      {matches.length === 0 ? (
        <p className="px-4 py-4 text-sm text-ink/55">Bu gün maç yok.</p>
      ) : (
        <div className="divide-y divide-black/5">
          {matches.map((m) => {
            const open = openNo === m.no;
            const a = actual.groupMatches?.[m.no];
            const mine = myPred?.groupMatches?.[m.no];
            const mineHas = mine && mine.home !== '' && mine.home != null && mine.away !== '' && mine.away != null;
            const d = open ? distribution(m.no, lists, getPrediction) : null;
            return (
              <div key={m.no}>
                <button className="w-full px-4 py-2.5 text-left" onClick={() => setOpenNo(open ? null : m.no)}
                  style={{ backgroundImage: `linear-gradient(90deg, ${teamColor(m.home)}14, transparent 26%, transparent 74%, ${teamColor(m.away)}14)` }}>
                  <div className="text-[11px] text-ink/45 mb-1 flex items-center gap-2">
                    <span>{m.no}. maç · {m.group} Grubu · {m.time}</span>
                    {(() => {
                      const lb = liveBadge(m, now);
                      if (!lb) return null;
                      return lb.type === 'live'
                        ? <span className="blink inline-flex items-center gap-1 rounded-full bg-red-600 text-white px-1.5 py-0.5 text-[10px] font-bold"><span className="inline-block h-1.5 w-1.5 rounded-full bg-white" />CANLI</span>
                        : <span className="inline-flex items-center gap-1 rounded-full bg-gold/20 text-gold-dark px-1.5 py-0.5 text-[10px] font-bold">⏱ {lb.text}</span>;
                    })()}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0 flex items-center justify-end gap-1.5">
                      <span className="truncate text-sm font-semibold">{shortName(m.home)}</span>
                      <Flag team={m.home} size={18} className="shrink-0" />
                    </div>
                    <span className="shrink-0 w-12 text-center font-display tabular-nums text-ink/70">
                      {hasScore(a) ? `${a.home}-${a.away}` : 'vs'}
                    </span>
                    <div className="flex-1 min-w-0 flex items-center gap-1.5">
                      <Flag team={m.away} size={18} className="shrink-0" />
                      <span className="truncate text-sm font-semibold">{shortName(m.away)}</span>
                    </div>
                    <span className={`shrink-0 text-ink/30 transition ${open ? 'rotate-180' : ''}`}>▾</span>
                  </div>
                  {showMine && (
                    <div className="text-center text-[11px] text-pitch-dark mt-0.5">
                      {mineHas ? `Senin tahminin: ${mine.home}-${mine.away}` : 'Bu maça tahmin girmemişsin'}
                    </div>
                  )}
                </button>
                {open && (
                  <div className="px-4 pb-3">
                    {d.tot === 0 ? (
                      <p className="text-xs text-ink/45">Henüz kimse bu maça skor tahmini girmemiş.</p>
                    ) : (
                      <DistBars m={m} d={d} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DistBars({ m, d }) {
  const rows = [
    { label: `${shortName(m.home)} kazanır`, pct: d.ph, names: d.who.H, color: 'bg-pitch' },
    { label: 'Beraberlik', pct: d.pd, names: d.who.D, color: 'bg-gold' },
    { label: `${shortName(m.away)} kazanır`, pct: d.pa, names: d.who.A, color: 'bg-ink/70' },
  ];
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i}>
          <div className="flex items-center justify-between text-xs font-semibold">
            <span>{r.label}</span>
            <span className="tabular-nums">%{r.pct} · {r.names.length}</span>
          </div>
          <div className="mt-0.5 h-2 rounded-full bg-black/5 overflow-hidden">
            <div className={`h-full ${r.color}`} style={{ width: `${r.pct}%` }} />
          </div>
          {r.names.length > 0 && (
            <div className="mt-0.5 text-[11px] text-ink/50 leading-snug break-words">{r.names.join(', ')}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function funStats(lists, getPrediction, actual) {
  const out = [];
  const recs = GROUP_MATCHES
    .filter((m) => hasScore(actual.groupMatches?.[m.no]))
    .map((m) => {
      const a = actual.groupMatches[m.no];
      const ah = +a.home, aa = +a.away;
      const O = ah > aa ? 'H' : ah < aa ? 'A' : 'D';
      let H = 0, D = 0, A = 0, exact = 0, tot = 0;
      for (const l of lists) {
        const p = getPrediction(l.id).groupMatches?.[m.no];
        if (!hasScore(p)) continue;
        const ph = +p.home, pa = +p.away;
        if (isNaN(ph) || isNaN(pa)) continue;
        tot++;
        const o = ph > pa ? 'H' : ph < pa ? 'A' : 'D';
        if (o === 'H') H++; else if (o === 'A') A++; else D++;
        if (ph === ah && pa === aa) exact++;
      }
      return { m, ah, aa, O, H, D, A, exact, tot, correct: O === 'H' ? H : O === 'A' ? A : D };
    })
    .filter((r) => r.tot > 0);
  if (recs.length === 0) return out;

  const allWrong = recs.filter((r) => r.correct === 0).sort((a, b) => b.tot - a.tot)[0];
  if (allWrong) out.push({ icon: '😅', text: `${allWrong.tot} kişi ${shortName(allWrong.m.home)}–${shortName(allWrong.m.away)} maçında tahmin yaptı ama hiçbiri sonucu bilemedi (maç ${allWrong.ah}-${allWrong.aa} bitti).` });

  let herd = null;
  for (const r of recs) {
    const opts = [['H', r.H, `${shortName(r.m.home)} kazanır`], ['D', r.D, 'beraberlik'], ['A', r.A, `${shortName(r.m.away)} kazanır`]];
    for (const [o, c, lbl] of opts) if (o !== r.O && c > 0 && (!herd || c > herd.c)) herd = { c, lbl, r };
  }
  if (herd && (!allWrong || herd.r.m.no !== allWrong.m.no)) out.push({ icon: '🙈', text: `${herd.c} kişi "${herd.lbl}" dedi ama ${shortName(herd.r.m.home)}–${shortName(herd.r.m.away)} ${herd.r.ah}-${herd.r.aa} bitti.` });

  const bestCorrect = recs.slice().sort((a, b) => b.correct - a.correct)[0];
  if (bestCorrect && bestCorrect.correct > 0) {
    const lbl = bestCorrect.O === 'H' ? `${shortName(bestCorrect.m.home)} kazanır` : bestCorrect.O === 'A' ? `${shortName(bestCorrect.m.away)} kazanır` : 'beraberlik';
    out.push({ icon: '🎯', text: `${bestCorrect.correct} kişi ${shortName(bestCorrect.m.home)}–${shortName(bestCorrect.m.away)} için "${lbl}" dedi ve haklı çıktı.` });
  }

  const exactRec = recs.filter((r) => r.exact > 0).sort((a, b) => a.exact - b.exact)[0];
  if (exactRec) out.push({ icon: '🔮', text: `${shortName(exactRec.m.home)}–${shortName(exactRec.m.away)} tam skorunu (${exactRec.ah}-${exactRec.aa}) ${exactRec.exact} kişi bildi.` });

  return out;
}

function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; return h >>> 0; }
function seededShuffle(arr, seed) {
  const a = arr.slice();
  let s = hashStr(String(seed)) || 1;
  const rnd = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function FunStats({ lists, getPrediction, actual, seed }) {
  const facts = useMemo(() => {
    const all = funStats(lists, getPrediction, actual);
    return seededShuffle(all, seed).slice(0, 3);
  }, [lists, actual, seed]);
  if (facts.length === 0) return null;
  return (
    <div className="card p-4">
      <p className="font-display text-xl">Enteresan istatistikler</p>
      <ul className="mt-2 space-y-2 text-sm text-ink/75">
        {facts.map((f, i) => (
          <li key={i} className="flex gap-2"><span className="shrink-0">{f.icon}</span><span>{f.text}</span></li>
        ))}
      </ul>
    </div>
  );
}

function RecentResults({ actual }) {
  const recent = useMemo(() => {
    const scored = GROUP_MATCHES.filter((m) => hasScore(actual.groupMatches?.[m.no]));
    if (scored.length === 0) return null;
    const latest = scored.reduce((best, m) => (dayKey(m.date) > dayKey(best) ? m.date : best), scored[0].date);
    return { date: latest, matches: scored.filter((m) => m.date === latest).sort((a, b) => timeKey(a) - timeKey(b)) };
  }, [actual]);
  if (!recent) return null;
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-black/5">
        <p className="font-display text-xl">Son sonuçlar</p>
        <p className="text-xs text-ink/45">{recent.date}</p>
      </div>
      <div className="divide-y divide-black/5">
        {recent.matches.map((m) => {
          const a = actual.groupMatches[m.no];
          return (
            <div key={m.no} className="flex items-center gap-2 px-4 py-2 text-sm">
              <div className="flex-1 min-w-0 flex items-center justify-end gap-1.5">
                <span className={`truncate ${Number(a.home) > Number(a.away) ? 'font-bold text-pitch' : Number(a.home) < Number(a.away) ? 'text-ink/40' : ''}`}>{shortName(m.home)}</span>
                <Flag team={m.home} size={16} className="shrink-0" />
              </div>
              <span className="shrink-0 w-12 text-center font-display tabular-nums">{a.home}-{a.away}</span>
              <div className="flex-1 min-w-0 flex items-center gap-1.5">
                <Flag team={m.away} size={16} className="shrink-0" />
                <span className={`truncate ${Number(a.away) > Number(a.home) ? 'font-bold text-pitch' : Number(a.away) < Number(a.home) ? 'text-ink/40' : ''}`}>{shortName(m.away)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
