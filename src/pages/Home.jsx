import { useMemo, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { GROUP_MATCHES } from '../data/tournament.js';
import { scoreUser, SCORING } from '../lib/scoring.js';
import { Dot, Flag } from '../components/ui.jsx';
import { shortName } from '../data/flags.js';

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
  const { lists, actual, getPrediction, user, isAdmin, adminEligible, adminMode, setAdminMode, logout, isMyList } = useStore();

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
        <p className="font-display text-lg text-pitch leading-none">kupayikimalir.com</p>
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

      <MyScore rows={rows} isMyList={isMyList} setPage={setPage} onCreate={() => setPage('lists')} />
      <DayBrowser lists={lists} getPrediction={getPrediction} actual={actual} />
      <RecentResults actual={actual} />
      <FunStats lists={lists} getPrediction={getPrediction} actual={actual} />

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

      <Footer />
    </div>
  );
}

const CHANGELOG = [
  {
    v: '1.1', date: 'Haziran 2026', items: [
      'Ana sayfa yenilendi: bugünün maçları, gün gezgini (dün/yarın) ve canlı tahmin yüzdeleri.',
      'Kendi puanını ana sayfada gör; turnuva günü ve finale kalan gün sayacı.',
      'Sıralamada şampiyon & gol kralı, "en çok puan" rozeti ve tıklanır puan dökümü.',
      'Çevrimiçi (Online) göstergesi ve "kaç kişi çevrimiçi" bilgisi.',
      'Excel içe aktarım: excely.com şablonundan grup + tüm eleme turları.',
      'Yönetim > Kişiler: ad/e-posta düzenleme, e-posta atama, silme istekleri onayı.',
      'Kullanıcı liste silme artık yönetici onayına düşer.',
    ],
  },
];

function Footer() {
  const [open, setOpen] = useState(false);
  return (
    <div className="pt-2 pb-6 text-center">
      <button onClick={() => setOpen((o) => !o)} className="text-xs font-semibold text-ink/40 hover:text-ink/70">
        Version {CHANGELOG[0].v}
      </button>
      {open && (
        <div className="mt-3 text-left space-y-3">
          {CHANGELOG.map((c) => (
            <div key={c.v} className="card p-4">
              <div className="flex items-baseline justify-between border-b border-black/5 pb-2 mb-2">
                <span className="font-display text-lg">Sürüm {c.v}</span>
                <span className="text-xs text-ink/45">{c.date}</span>
              </div>
              <ul className="space-y-1.5 text-sm text-ink/70">
                {c.items.map((it, i) => (
                  <li key={i} className="flex gap-2"><span className="text-pitch">•</span><span>{it}</span></li>
                ))}
              </ul>
            </div>
          ))}
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
            <div className="flex-1 min-w-0">
              <p className="label text-pitch">Senin puanın</p>
              <p className="font-semibold text-ink truncate mt-0.5">{r.list.name} · {r.rank}. sıra</p>
            </div>
            <span className="font-display text-3xl text-pitch leading-none">{r.total}</span>
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

function DayBrowser({ lists, getPrediction, actual }) {
  const [off, setOff] = useState(0);
  const [openNo, setOpenNo] = useState(null);
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
        <div className="mt-2 flex gap-1.5">
          {[['Dün', -1], ['Bugün', 0], ['Yarın', 1]].map(([t, o]) => (
            <button key={o} onClick={() => setDay(o)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${off === o ? 'bg-ink text-white' : 'bg-black/5 text-ink/70'}`}>{t}</button>
          ))}
          <span className="ml-auto text-xs text-ink/40 self-center">{date}</span>
        </div>
      </div>
      {matches.length === 0 ? (
        <p className="px-4 py-4 text-sm text-ink/55">Bu gün maç yok.</p>
      ) : (
        <div className="divide-y divide-black/5">
          {matches.map((m) => {
            const open = openNo === m.no;
            const a = actual.groupMatches?.[m.no];
            const d = open ? distribution(m.no, lists, getPrediction) : null;
            return (
              <div key={m.no}>
                <button className="w-full px-4 py-2.5 text-left" onClick={() => setOpenNo(open ? null : m.no)}>
                  <div className="text-[11px] text-ink/45 mb-1">{m.no}. maç · {m.group} Grubu · {m.time}</div>
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

  return out.slice(0, 4);
}

function FunStats({ lists, getPrediction, actual }) {
  const facts = useMemo(() => funStats(lists, getPrediction, actual), [lists, actual]);
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
                <span className={`truncate ${Number(a.home) > Number(a.away) ? 'font-bold' : ''}`}>{shortName(m.home)}</span>
                <Flag team={m.home} size={16} className="shrink-0" />
              </div>
              <span className="shrink-0 w-12 text-center font-display tabular-nums">{a.home}-{a.away}</span>
              <div className="flex-1 min-w-0 flex items-center gap-1.5">
                <Flag team={m.away} size={16} className="shrink-0" />
                <span className={`truncate ${Number(a.away) > Number(a.home) ? 'font-bold' : ''}`}>{shortName(m.away)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
