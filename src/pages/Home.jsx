import { useMemo, useState, useEffect, useRef } from 'react';
import { useStore } from '../lib/store.jsx';
import { GROUP_MATCHES } from '../data/tournament.js';
import { scoreUser, SCORING } from '../lib/scoring.js';
import { resolveBracket, MATCH_BY_NO, KO_DATES, KO_ORDER } from '../data/bracket.js';
import { mapLiveFixtures } from '../lib/importScores.js';
import { Dot, Flag, Avatar, CountUp, ScrollTopFab } from '../components/ui.jsx';
import { shortName, teamColor } from '../data/flags.js';
import { QUIZ } from '../data/quiz.js';
import { CHANGELOG } from '../data/changelog.js';
import { attemptHighlight, matchStartMs } from '../lib/highlights.js';

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
function tournamentStatus(played = 0, total = 104) {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  if (t < TOUR_START) return `Başlamasına ${Math.ceil((TOUR_START - t) / DAY_MS)} gün — hazır mısın?`;
  if (t > TOUR_FINAL) return '🏆 Turnuva tamamlandı';
  const phase = played >= 102 ? '🏆 Final haftası'
    : played >= 88 ? '🔥 Eleme turları'
    : played >= 72 ? '⚔️ Son 16 başladı'
    : '⚽ Grup aşaması';
  return `${phase} · ${played}/${total} maç oynandı`;
}

function tournamentCountdown() {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  if (t < TOUR_START) return `Başlamasına ${Math.ceil((TOUR_START - t) / DAY_MS)} gün kaldı`;
  if (t > TOUR_FINAL) return 'Turnuva tamamlandı';
  const dayNo = Math.floor((t - TOUR_START) / DAY_MS) + 1;
  const left = Math.ceil((TOUR_FINAL - t) / DAY_MS);
  return `Turnuvanın ${dayNo}. günü · finale ${left} gün kaldı`;
}

// İki durum metnini 10 saniyede bir fade in/out ile değiştirir.
function StatusRotator({ items, className = '' }) {
  const [i, setI] = useState(0);
  const [show, setShow] = useState(true);
  useEffect(() => {
    if (items.length < 2) return;
    const iv = setInterval(() => {
      setShow(false);
      setTimeout(() => { setI((x) => (x + 1) % items.length); setShow(true); }, 320);
    }, 10000);
    return () => clearInterval(iv);
  }, [items.length]);
  return (
    <span className={`inline-block transition-opacity duration-300 ${className}`} style={{ opacity: show ? 1 : 0 }}>
      {items[i]}
    </span>
  );
}

export default function Home({ setPage, goAdminImport }) {
  const { lists, actual, getPrediction, user, isAdmin, adminEligible, adminMode, setAdminMode, logout, isMyList, theme, setTheme, onlineCount, ad, quizLeaders, recordQuizWin, locked } = useStore();
  useEffect(() => { window.scrollTo(0, 0); }, []);

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
  const [scoringOpen, setScoringOpen] = useState(() => { try { return localStorage.getItem('wc_scoring_help_open') !== '0'; } catch { return true; } });
  const toggleScoring = () => setScoringOpen((o) => { const n = !o; try { localStorage.setItem('wc_scoring_help_open', n ? '1' : '0'); } catch (e) {} return n; });

  const [apiScorers, setApiScorers] = useState([]);
  const [scorersOpen, setScorersOpen] = useState(false);
  useEffect(() => {
    let alive = true;
    const url = (import.meta.env && import.meta.env.VITE_TOPSCORERS_URL) || '/api/topscorers';
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d && Array.isArray(d.scorers)) setApiScorers(d.scorers.filter((s) => s && s.name).slice(0, 3)); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  const scorers = apiScorers;

  // Gol krallığı: her golcüyü kimler "gol kralı" olarak tahmin etti (parantez içinde gösterilir).
  const scorerPickers = useMemo(() => {
    const norm = (x) => (x || '').toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, '').trim();
    const lastTok = (x) => { const t = norm(x).split(' ').filter(Boolean); return t[t.length - 1] || ''; };
    return scorers.map((s) => {
      const sn = norm(s.name), sl = lastTok(s.name);
      const who = [];
      for (const l of lists) {
        const tp = getPrediction(l.id)?.topScorer;
        if (!tp) continue;
        const tn = norm(tp);
        if (tn && (tn === sn || (sl && lastTok(tp) === sl))) who.push({ name: l.name, mine: l.ownerUid === user?.uid });
      }
      who.sort((a, b) => (a.mine === b.mine ? 0 : a.mine ? -1 : 1));
      return who;
    });
  }, [scorers, lists, getPrediction, user]);

  // --- Günlük quiz / reklam durumu ---
  const quizBase = `wc_dq_${user?.uid || 'anon'}`;
  const today = localDay();
  const [qPlayed, setQPlayed] = useState(() => lsGet(`${quizBase}_played`));
  const [qWon, setQWon] = useState(() => lsGet(`${quizBase}_won`));
  const [quizOpen, setQuizOpen] = useState(false);
  const [showOnboard, setShowOnboard] = useState(() => !lsGet('wc_onboard_v1'));
  const wonToday = qWon === today;
  const playedToday = qPlayed === today;
  const onQuizDone = async (passed) => {
    setQPlayed(today); lsSet(`${quizBase}_played`, today);
    if (passed) { setQWon(today); lsSet(`${quizBase}_won`, today); try { await recordQuizWin(); } catch (e) {} }
  };

  const [liveScores, setLiveScores] = useState({});
  useEffect(() => {
    let alive = true;
    const url = (import.meta.env && import.meta.env.VITE_SCORES_URL) || '/api/scores';
    const load = () => {
      fetch(url)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (alive && d) setLiveScores(mapLiveFixtures(d.fixtures || d || [])); })
        .catch(() => {});
    };
    load();
    const iv = setInterval(load, 30000); // her 30 sn tazele (canlı)
    return () => { alive = false; clearInterval(iv); };
  }, []);

  const matchesRef = useRef(null);
  const resultsRef = useRef(null);
  const scorersRef = useRef(null);
  const topRef = useRef(null);
  const jump = (ref) => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="space-y-4">
      {showOnboard && <OnboardingWizard onClose={() => { lsSet('wc_onboard_v1', '1'); setShowOnboard(false); }} />}
      <div className="relative overflow-hidden rounded-2xl bg-ink text-white p-5">
        <div className="pointer-events-none absolute -right-8 -top-8 w-40 h-40 rounded-full bg-pitch/30 blur-2xl" />
        <div className="pointer-events-none absolute right-6 bottom-4 text-6xl opacity-10 font-display">26</div>
        <div className="relative z-10 flex items-start justify-between gap-2">
          <div>
            <p className="font-display text-xl text-pitch leading-none">kupayikimalir.com</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/55 mt-1">FIFA Dünya Kupası 2026</p>
          </div>
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
            {isAdmin && goAdminImport && (
              <button onClick={goAdminImport} title="Biten maçları içe aktar" aria-label="Biten maçları içe aktar"
                className="flex items-center gap-1 rounded-full bg-white/10 hover:bg-white/20 transition px-2 h-7 text-white/80">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 11l5 5 5-5M4 21h16" /></svg>
                <span className="text-[10px] font-semibold uppercase tracking-wide">İçe aktar</span>
              </button>
            )}
          </div>
        </div>
        <h1 className="font-display text-4xl leading-none mt-3">Tahmin Oyunu</h1>
        <p className="mt-2 text-xs font-semibold text-gold h-4">
          <StatusRotator items={[tournamentStatus(resultsIn + koIn, totalMatches), tournamentCountdown()]} />
        </p>
        <div className="mt-1 h-5">
          {onlineCount > 0 && (
            <button onClick={() => setPage('board')}
              className="text-xs font-semibold text-white/80 hover:text-white flex items-center gap-1.5 h-5">
              <span className="inline-block h-2 w-2 rounded-full bg-pitch animate-pulse" />
              {onlineCount} kişi çevrimiçi
              <span className="text-white/45">· gör →</span>
            </button>
          )}
        </div>
        <p className="mt-2 text-sm text-white/70">Merhaba {user?.displayName?.split(' ')[0] || 'oyuncu'}{isAdmin ? ' · yönetici' : ''}.</p>
        <div className="mt-4 flex gap-2 items-stretch">
          {locked && !isAdmin ? (
            <span className="btn-primary flex-1 justify-center text-xs px-2 py-2 whitespace-nowrap blur-[1.5px] opacity-60 pointer-events-none select-none" aria-disabled="true">Tahmin yap</span>
          ) : (
            <button className="btn-primary flex-1 justify-center text-xs px-2 py-2 whitespace-nowrap" onClick={() => setPage('predict')}>Tahmin yap</button>
          )}
          <button className="btn-gold flex-1 justify-center text-xs px-2 py-2 whitespace-nowrap" onClick={() => setPage('results')}>Puan Durumu</button>
          <button className="btn bg-red-600 text-white hover:bg-red-700 shadow-sm flex-1 justify-center text-xs px-2 py-2 whitespace-nowrap" onClick={() => setPage('board')}>Sıralama</button>
        </div>
        {locked && !isAdmin && <p className="mt-1.5 text-xs text-white/55">🔒 Tahminler kilitlendi — artık düzenlenemez.</p>}
      </div>

      {/* Hızlı geçiş (aşağı kaydır) */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {[
          { ic: '⚽', t: 'Maçlar', r: matchesRef },
          { ic: '📋', t: 'Son sonuçlar', r: resultsRef },
          { ic: '🏆', t: 'Liderler', r: topRef },
          { ic: '👟', t: 'Gol krallığı', r: scorersRef },
        ].map((x) => (
          <button key={x.t} onClick={() => jump(x.r)}
            className="shrink-0 flex items-center gap-1.5 rounded-full bg-black/[0.04] hover:bg-black/[0.08] text-ink/70 text-xs font-semibold px-3 h-8 active:scale-95">
            <span>{x.ic}</span>{x.t}<span className="text-ink/30">↓</span>
          </button>
        ))}
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
      <AdZone ad={ad} wonToday={wonToday} onRemove={() => setQuizOpen(true)} />
      {quizOpen && <QuizModal base={quizBase} playedToday={playedToday} onClose={() => setQuizOpen(false)} onDone={onQuizDone} onStart={() => { setQPlayed(today); lsSet(`${quizBase}_played`, today); }} />}
      <div ref={matchesRef} className="scroll-mt-3">
        <DayBrowser lists={lists} getPrediction={getPrediction} actual={actual} myPred={myPred} liveScores={liveScores} />
      </div>
      <div ref={resultsRef} className="scroll-mt-3">
        <RecentResults actual={actual} />
      </div>
      <FunStats lists={lists} getPrediction={getPrediction} actual={actual} />

      <div ref={topRef} className="card p-4 scroll-mt-3">
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

      {scorers.length > 0 && (
        <div ref={scorersRef} className="card overflow-hidden scroll-mt-3">
          <button onClick={() => setScorersOpen((v) => !v)} className="w-full flex items-center justify-between gap-2 px-4 pt-3 pb-1">
            <p className="font-display text-lg">⚽ Dünya Kupası gol krallığı</p>
            <div className="flex items-center gap-2">
              {apiScorers.length > 0 && <span className="text-[10px] text-pitch-dark font-semibold flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-pitch animate-pulse" />canlı</span>}
              {scorers.length > 1 && <span className={`text-ink/40 transition ${scorersOpen ? 'rotate-180' : ''}`}>▾</span>}
            </div>
          </button>
          <div className="px-4 pb-3">
            {(scorersOpen ? scorers : scorers.slice(0, 1)).map((s, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5 border-t border-black/5 first:border-0">
                <span className="w-6 text-center font-display text-lg" style={{ color: ['#caa12a', '#9aa3ad', '#b9742f'][i] || '#9aa3ad' }}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink truncate">{s.name}</p>
                  {s.team && <p className="text-[11px] text-ink/45 truncate">{s.team}</p>}
                  {scorerPickers[i]?.length > 0 && (
                    <p className="text-[11px] text-pitch-dark leading-snug break-words">
                      ({scorerPickers[i].map((w, wi) => (
                        <span key={wi}>{wi > 0 && ', '}<span className={w.mine ? 'font-bold' : ''}>{w.name}</span></span>
                      ))})
                    </p>
                  )}
                </div>
                {s.goals > 0 && (
                  <div className="text-right leading-none">
                    <span className="font-display text-xl text-ink">{s.goals}</span>
                    <span className="text-[10px] text-ink/45 ml-1">gol</span>
                  </div>
                )}
              </div>
            ))}
            {!scorersOpen && scorers.length > 1 && (
              <p className="text-[11px] text-ink/40 pt-1.5 pl-9">+{scorers.length - 1} golcü daha · görmek için dokun</p>
            )}
          </div>
        </div>
      )}

      <QuizLeaders leaders={quizLeaders} user={user} playedToday={playedToday} wonToday={wonToday} onPlay={() => setQuizOpen(true)} />

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

      <Footer setPage={setPage} />
      <ScrollTopFab />
    </div>
  );
}


function Footer({ setPage }) {
  const [open, setOpen] = useState(false);
  const latest = CHANGELOG[0];
  return (
    <div className="pt-2 pb-6 text-center">
      <button onClick={() => setOpen((o) => !o)} className="text-xs font-semibold text-ink/40 hover:text-ink/70">
        Version {latest.v}
      </button>
      {open && (
        <div className="mt-3 text-left">
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-black/5">
              <span className="font-display text-lg">Sürüm {latest.v}</span>
              <span className="text-xs text-ink/45">{latest.date}</span>
              <span className="ml-auto chip bg-pitch/15 text-pitch-dark">en yeni</span>
            </div>
            <ul className="px-4 py-3 space-y-1.5 text-sm text-ink/70">
              {latest.items.map((it, i) => (
                <li key={i} className="flex gap-2"><span className="text-pitch">•</span><span>{it}</span></li>
              ))}
            </ul>
          </div>
          {setPage && CHANGELOG.length > 1 && (
            <button onClick={() => setPage('changelog')}
              className="mt-2 w-full btn-ghost text-sm flex items-center justify-center gap-1">
              Daha fazla ({CHANGELOG.length - 1} eski sürüm) →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AdCard({ ad }) {
  const inner = (
    <div className="card overflow-hidden relative">
      <span className="absolute top-1.5 right-1.5 z-10 rounded bg-black/45 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-white/85 backdrop-blur-sm">reklam</span>
      {ad.imageUrl && (
        <img src={ad.imageUrl} alt={ad.text || 'reklam'} className="block w-full max-h-44 object-cover" loading="lazy" />
      )}
      {ad.text && (
        <div className="px-4 py-3 flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-ink">{ad.text}</span>
          {ad.linkUrl && <span className="text-xs text-pitch-dark shrink-0">→</span>}
        </div>
      )}
      {!ad.imageUrl && !ad.text && <div className="px-4 py-6 text-center text-sm text-ink/40">Reklam alanı</div>}
    </div>
  );
  if (ad.linkUrl) return <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer sponsored" className="block">{inner}</a>;
  return inner;
}

const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const localDay = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const msToMidnight = () => { const n = new Date(); const m = new Date(n); m.setHours(24, 0, 0, 0); return m - n; };
const fmtDur = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(s / 3600), mn = Math.floor((s % 3600) / 60), se = s % 60; return `${h}sa ${mn}dk ${se}sn`; };

function NextQuiz() {
  const [ms, setMs] = useState(msToMidnight());
  useEffect(() => { const iv = setInterval(() => setMs(msToMidnight()), 1000); return () => clearInterval(iv); }, []);
  return <span className="tabular-nums">{fmtDur(ms)}</span>;
}

function pickQuiz() {
  const idx = [...QUIZ.keys()];
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return idx.slice(0, 10).map((i) => {
    const q = QUIZ[i];
    const opts = q.options.map((t, oi) => ({ t, correct: oi === q.answer }));
    for (let k = opts.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [opts[k], opts[j]] = [opts[j], opts[k]]; }
    return { q: q.q, opts };
  });
}

const QUIZ_SECONDS = 120; // 2 dakika

function QuizModal({ base, playedToday, onClose, onDone, onStart }) {
  const [blocked] = useState(playedToday); // açılıştaki durumu dondur (oyun ortası kaybolmasın)
  const [questions] = useState(() => (playedToday ? [] : pickQuiz()));
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(QUIZ_SECONDS);
  const [reviewLeft, setReviewLeft] = useState(15); // quiz sonu doğru-cevap inceleme süresi
  const onCloseRef = useRef(onClose); onCloseRef.current = onClose;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;

  // Quiz açıldıysa günlük hak harcanır (soruları yeniden çekmeyi önler).
  useEffect(() => { if (!blocked && onStart) onStart(); }, []);

  const finish = () => {
    let score = 0;
    questions.forEach((qq, qi) => { if (qq.opts[answers[qi]]?.correct) score++; });
    const ok = score >= 8; // %75 -> 8/10
    setResult({ score, ok });
    onDone(ok);
  };
  const finishRef = useRef(finish); finishRef.current = finish;

  // 2 dakikalık geri sayım — süre dolunca otomatik gönder.
  useEffect(() => {
    if (blocked || result) return;
    if (timeLeft <= 0) { finishRef.current(); return; }
    const iv = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(iv);
  }, [timeLeft, blocked, result]);

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const ss = String(timeLeft % 60).padStart(2, '0');
  const low = timeLeft <= 30;

  // Quiz bitince doğru cevaplar 15 saniye gösterilir, sonra otomatik kapanır.
  useEffect(() => {
    if (!result) return;
    if (reviewLeft <= 0) { onCloseRef.current(); return; }
    const iv = setInterval(() => setReviewLeft((t) => t - 1), 1000);
    return () => clearInterval(iv);
  }, [result, reviewLeft]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="card w-full max-w-md max-h-[88vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Sabit başlık: ilerleme çubuğu + dakika daima görünür */}
        <div className="p-4 pb-3 border-b border-black/5">
          <div className="flex items-center justify-between">
            <p className="font-display text-lg">Günlük Quiz</p>
            <button onClick={onClose} className="text-ink/40 text-xl leading-none">×</button>
          </div>
          {!blocked && !result && (
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink/55">{answeredCount}/{questions.length} yanıtlandı</span>
                <span className={`font-display tabular-nums ${low ? 'text-red-600 blink' : 'text-ink'}`}>⏱ {mm}:{ss}</span>
              </div>
              <div className="h-1.5 rounded-full bg-black/10 overflow-hidden">
                <div className="h-full bg-pitch transition-all" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Kayan gövde */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {blocked && !result && (
            <div className="space-y-3 text-center">
              <p className="text-sm text-ink/70">Bugünkü hakkını kullandın. Yeni quiz için:</p>
              <p className="font-display text-2xl"><NextQuiz /></p>
              <button className="btn btn-primary w-full" onClick={onClose}>Tamam</button>
            </div>
          )}

          {!blocked && !result && (
            <>
              <p className="text-xs text-ink/55">10 sorudan en az 8'ini (%75) doğru bil, bugün için reklamları kapat. Süre: 2 dakika, günde 1 hak.</p>
              <ol className="space-y-3">
                {questions.map((qq, qi) => (
                  <li key={qi} className="space-y-1.5">
                    <p className="text-sm font-semibold">{qi + 1}. {qq.q}</p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {qq.opts.map((o, oi) => (
                        <button key={oi} onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                          className={`text-left text-sm rounded-lg border px-3 py-2 transition ${answers[qi] === oi ? 'border-pitch bg-pitch/10 font-semibold' : 'border-black/10 hover:bg-black/[0.03]'}`}>
                          {o.t}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}

          {result && (
            <div className="space-y-3">
              <div className="text-center space-y-1">
                <div className={`text-4xl font-display ${result.ok ? 'text-pitch-dark' : 'text-red-600'}`}>{result.score}/10</div>
                {result.ok ? (
                  <>
                    <p className="text-base font-semibold text-pitch-dark">Tebrikler! 🎉</p>
                    <p className="text-sm text-ink/75">Bugün için reklam görmeyeceksin. Yarın yeni bir quiz seni bekliyor.</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-ink/75">Yeterli değil (en az 8 gerekiyor). Yeni quiz için:</p>
                    <p className="font-display text-xl"><NextQuiz /></p>
                  </>
                )}
              </div>

              <div className="pt-1">
                <p className="text-xs font-bold uppercase tracking-wide text-ink/45 mb-2">Doğru cevaplar</p>
                <ol className="space-y-3">
                  {questions.map((qq, qi) => {
                    const chosen = answers[qi];
                    const gotIt = qq.opts[chosen]?.correct;
                    return (
                      <li key={qi} className="space-y-1.5">
                        <p className="text-sm font-semibold flex items-start gap-1.5">
                          <span className={gotIt ? 'text-pitch-dark' : 'text-red-600'}>{gotIt ? '✓' : '✗'}</span>
                          <span>{qi + 1}. {qq.q}</span>
                        </p>
                        <div className="grid grid-cols-1 gap-1.5">
                          {qq.opts.map((o, oi) => {
                            const isCorrect = o.correct;
                            const isChosen = chosen === oi;
                            const cls = isCorrect
                              ? 'border-pitch bg-pitch/10 text-pitch-dark font-semibold'
                              : isChosen
                                ? 'border-red-400 bg-red-50 text-red-600'
                                : 'border-black/10 text-ink/50';
                            return (
                              <div key={oi} className={`text-left text-sm rounded-lg border px-3 py-2 flex items-center gap-2 ${cls}`}>
                                <span className="flex-1 min-w-0">{o.t}</span>
                                {isCorrect && <span className="shrink-0">✓ doğru</span>}
                                {isChosen && !isCorrect && <span className="shrink-0 text-[11px]">senin yanıtın</span>}
                              </div>
                            );
                          })}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>

              <button className="btn btn-primary w-full" onClick={onClose}>Kapat ({reviewLeft}s)</button>
            </div>
          )}
        </div>

        {/* Sabit alt: gönder butonu daima erişilebilir */}
        {!blocked && !result && (
          <div className="p-4 pt-3 border-t border-black/5">
            <button className="btn btn-primary w-full" disabled={!allAnswered} onClick={finish}>
              {allAnswered ? 'Cevapları gönder' : `Tüm soruları yanıtla (${answeredCount}/${questions.length})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AdZone({ ad, wonToday, onRemove }) {
  const hasAd = ad && ad.enabled && (ad.text || ad.imageUrl);
  if (!hasAd) return null;
  if (wonToday) {
    return (
      <div className="rounded-xl border border-pitch/30 bg-pitch/[0.06] px-4 py-2.5 text-sm flex items-center justify-between gap-2">
        <span className="text-pitch-dark font-semibold">🎉 Bugün reklamsızsın</span>
        <span className="text-[11px] text-ink/50">Sonraki quiz: <NextQuiz /></span>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <AdCard ad={ad} />
      <button onClick={onRemove}
        className="group relative w-full overflow-hidden rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md transition active:scale-[0.99]"
        style={{ background: 'linear-gradient(100deg,#1f9d55,#caa12a,#1f9d55)', backgroundSize: '200% 100%', animation: 'shimmer 3s linear infinite' }}>
        <span className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-white/10" />
        <span className="relative flex items-center justify-center gap-2">
          <span className="text-base animate-bounce">🎯</span>
          <span>Reklamları kaldır</span>
          <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] uppercase tracking-wide">günlük quiz</span>
        </span>
      </button>
    </div>
  );
}

function OnboardingWizard({ onClose }) {
  const steps = [
    { emoji: '⚽', title: 'Hoş geldin!', body: 'kupayikimalir.com Dünya Kupası 2026 tahmin oyunu. Maç skorlarını tahmin et, puan topla, arkadaşlarınla sıralamada yarış.' },
    { emoji: '🎯', title: 'Reklamları kaldır', body: 'Reklamın altındaki “Reklamları kaldır” butonuna bas, günlük quizi çöz. 10 Dünya Kupası sorusu, 2 dakika süre. En az 8 doğru (%75) yaparsan o gün hiç reklam görmezsin!' },
    { emoji: '🏆', title: 'Günde 1 hak · Liderlik', body: 'Her gün 1 quiz hakkın var; kazanınca o gün reklamsız olursun. En çok quiz kazananlar “🏆 En çok quiz kazanan” tablosunda yarışır. Bol şans!' },
  ];
  const [i, setI] = useState(0);
  const last = i === steps.length - 1;
  const s = steps[i];
  return (
    <div className="fixed inset-0 z-[60] bg-black/55 flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="card w-full max-w-sm p-5 space-y-4 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="text-5xl">{s.emoji}</div>
        <p className="font-display text-2xl">{s.title}</p>
        <p className="text-sm text-ink/70 leading-relaxed">{s.body}</p>
        <div className="flex justify-center gap-1.5 pt-1">
          {steps.map((_, k) => (
            <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? 'w-6 bg-pitch' : 'w-1.5 bg-black/15'}`} />
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          {!last && <button className="btn btn-ghost flex-1" onClick={onClose}>Geç</button>}
          <button className="btn btn-primary flex-1" onClick={() => (last ? onClose() : setI(i + 1))}>
            {last ? 'Hadi başlayalım' : 'Devam'}
          </button>
        </div>
      </div>
    </div>
  );
}

function QuizLeaders({ leaders, user, playedToday, wonToday, onPlay }) {
  const top = (leaders || []).filter((l) => (l.wins || 0) > 0).slice(0, 8);
  const me = (leaders || []).find((l) => l.uid === user?.uid);
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-display text-lg">🏆 En çok quiz kazanan</p>
        {me && <span className="chip bg-gold/20 text-gold-dark">{me.wins} galibiyet</span>}
      </div>
      {top.length > 0 ? (
        <ol className="space-y-1.5">
          {top.map((l, i) => (
            <li key={l.uid || i} className="flex items-center gap-3">
              <span className="w-5 text-center font-display" style={{ color: ['#caa12a', '#9aa3ad', '#b9742f'][i] || '#bbb' }}>{i + 1}</span>
              <Avatar name={l.name} size={28} />
              <span className="flex-1 min-w-0 truncate text-sm font-medium">{l.name || 'Oyuncu'}</span>
              <span className="font-display tabular-nums text-ink">{l.wins}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-ink/55">Henüz kazanan yok — ilk sen ol!</p>
      )}
      <div className="pt-1">
        {!playedToday ? (
          <button className="btn btn-primary w-full" onClick={onPlay}>Bugünün quizini çöz</button>
        ) : (
          <p className="text-center text-[12px] text-ink/55">
            {wonToday ? '🎉 Bugünkü quizi kazandın · ' : 'Bugünkü hakkın bitti · '}
            sonraki: <NextQuiz />
          </p>
        )}
      </div>
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
function distribution(no, lists, getPrediction, act) {
  const who = { H: [], D: [], A: [] };
  const aHas = hasScore(act);
  const ah = aHas ? Number(act.home) : null, aa = aHas ? Number(act.away) : null;
  let exactCount = 0;
  for (const l of lists) {
    const p = getPrediction(l.id).groupMatches?.[no];
    if (!hasScore(p)) continue;
    const hs = Number(p.home), as = Number(p.away);
    if (isNaN(hs) || isNaN(as)) continue;
    const o = hs > as ? 'H' : hs < as ? 'A' : 'D';
    const exact = aHas && hs === ah && as === aa;
    if (exact) exactCount++;
    who[o].push({ name: l.name, exact });
  }
  const tot = who.H.length + who.D.length + who.A.length;
  const pct = (n) => (tot ? Math.round((n / tot) * 100) : 0);
  return { tot, who, exactCount, hasActual: aHas, ah, aa, ph: pct(who.H.length), pd: pct(who.D.length), pa: pct(who.A.length) };
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

const KO_ROUND_TR = { R32: 'Son 32', R16: 'Son 16', QF: 'Çeyrek Final', SF: 'Yarı Final', TP: 'Üçüncülük', F: 'Final' };
function koRefLabel(ref, tsg) {
  if (!ref) return '?';
  if (ref.t === 'W') return '1' + ref.g;
  if (ref.t === 'R') return '2' + ref.g;
  if (ref.t === 'T') { const g = tsg?.[ref.slot]; return g ? '3.' + g : 'en iyi 3.'; }
  if (ref.t === 'Wm') return ref.n + '. galibi';
  if (ref.t === 'Lm') return ref.n + '. mağlubu';
  return '?';
}

function koOutcome(hs, as) { hs = Number(hs); as = Number(as); if (hs > as) return 'H'; if (hs < as) return 'A'; return 'D'; }

// Bir eleme maçı için: eşleşmeyi / sonucu / bir takımı tutturanlar.
const KO_DIST_RANGES = [[73, 88], [89, 96], [97, 100], [101, 102], [103, 103], [104, 104]];
function koDistribution(no, lists, getPrediction, A, actualKo) {
  const am = A.matches[no] || {};
  const ah = am.home, aa = am.away;
  const canon = (x, y) => [x, y].sort().join('|');
  const aHas = !!(ah && aa);
  const actCanon = aHas ? canon(ah, aa) : null;
  const range = KO_DIST_RANGES.find(([f, t]) => no >= f && no <= t) || [no, no];
  const aSc = actualKo?.[no];
  const aHasScore = aSc && aSc.hs !== '' && aSc.hs != null && aSc.as !== '' && aSc.as != null;
  const ahsN = aHasScore ? Number(aSc.hs) : null, aasN = aHasScore ? Number(aSc.as) : null;
  const aOut = aHasScore ? koOutcome(ahsN, aasN) : null;
  const exactHit = [], resultHit = [], matchupOnly = [], oneTeam = [];
  for (const l of lists) {
    if (!aHas) continue;
    const pred = getPrediction(l.id);
    const P = resolveBracket(pred, pred.ko || {});
    // Eşleşmeyi (slottan bağımsız) turun herhangi bir maçında tahmin etmiş mi?
    let pm = null, pk = null;
    const teamsInRound = new Set();
    for (let n = range[0]; n <= range[1]; n++) {
      const m = P.matches[n];
      if (!m?.home || !m?.away) continue;
      teamsInRound.add(m.home); teamsInRound.add(m.away);
      if (!pm && canon(m.home, m.away) === actCanon) { pm = m; pk = pred.ko?.[n]; }
    }
    if (pm) {
      const pkHas = pk && pk.hs !== '' && pk.hs != null && pk.as !== '' && pk.as != null;
      const sc = pkHas ? `${pm.home === ah ? Number(pk.hs) : Number(pk.as)}-${pm.home === ah ? Number(pk.as) : Number(pk.hs)}` : null;
      if (aHasScore && pkHas) {
        const ohs = pm.home === ah ? Number(pk.hs) : Number(pk.as);
        const oas = pm.home === ah ? Number(pk.as) : Number(pk.hs);
        const resultOk = (pm.winner && am.winner) ? pm.winner === am.winner : koOutcome(ohs, oas) === aOut;
        if (ohs === ahsN && oas === aasN) exactHit.push({ name: l.name, extra: sc });
        else if (resultOk) resultHit.push({ name: l.name, extra: sc });
        else matchupOnly.push({ name: l.name, extra: sc });
      } else matchupOnly.push({ name: l.name, extra: sc });
    } else {
      const got = [ah, aa].filter((t) => teamsInRound.has(t));
      if (got.length === 1) oneTeam.push({ name: l.name, team: got[0] });
    }
  }
  const tot = exactHit.length + resultHit.length + matchupOnly.length + oneTeam.length;
  return { exactHit, resultHit, matchupOnly, oneTeam, tot, aHas };
}

function KoDistGroup({ icon, label, items, color }) {
  if (!items.length) return null;
  return (
    <div className="mt-1.5">
      <p className="text-[11px] font-semibold text-ink/60">{icon} {label} ({items.length})</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {items.map((n, i) => (
          <span key={i} className={`rounded-full px-2 py-0.5 text-[11px] ${color || 'bg-black/5 text-ink/70'}`}>
            {n.name}{n.extra ? ` · ${n.extra}` : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

function KoOneTeamGroups({ items }) {
  if (!items.length) return null;
  const byTeam = {};
  for (const it of items) { (byTeam[it.team] ||= []).push(it.name); }
  const teams = Object.keys(byTeam).sort((a, b) => byTeam[b].length - byTeam[a].length);
  return (
    <div className="mt-1.5">
      <p className="text-[11px] font-semibold text-ink/60">1️⃣ Bir takımı tutturan ({items.length})</p>
      <div className="mt-1 space-y-1.5">
        {teams.map((t) => (
          <div key={t}>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-ink/70">
              <Flag team={t} size={14} className="shrink-0" />{shortName(t)} <span className="text-ink/40">({byTeam[t].length})</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {byTeam[t].map((n, i) => (
                <span key={i} className="rounded-full bg-black/5 text-ink/70 px-2 py-0.5 text-[11px]">{n}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KoDist({ d }) {
  if (!d.aHas) return <p className="text-xs text-ink/45">Eşleşme henüz belli değil.</p>;
  if (d.tot === 0) return <p className="text-xs text-ink/45">Kimse bu eşleşmeyi/takımı tutturamadı.</p>;
  return (
    <div>
      <KoDistGroup icon="🎯" label="Tam skoru bilen" items={d.exactHit} color="bg-pitch/15 text-pitch-dark font-semibold" />
      <KoDistGroup icon="✅" label="Doğru galibi bilen" items={d.resultHit} color="bg-gold/20 text-gold-dark font-semibold" />
      <KoDistGroup icon="🤝" label="Eşleşmeyi tutturan (tahmini)" items={d.matchupOnly} />
      <KoOneTeamGroups items={d.oneTeam} />
    </div>
  );
}

// Bir eleme tarafını çizer: belli takım (bayrak+ad) · belli değilse besleyen maçın
// iki takımı (ör. "Hollanda / Fas") · o da belli değilse köken etiketi ("1A", "en iyi 3.").
function KoSide({ team, slot, A, tsg, winner, align }) {
  if (team) {
    const cls = `truncate text-sm ${winner === team ? 'font-bold text-pitch' : 'font-semibold'}`;
    return align === 'right'
      ? <><span className={cls}>{shortName(team)}</span><Flag team={team} size={18} className="shrink-0" /></>
      : <><Flag team={team} size={18} className="shrink-0" /><span className={cls}>{shortName(team)}</span></>;
  }
  if (slot && (slot.t === 'Wm' || slot.t === 'Lm')) {
    const fm = A.matches?.[slot.n];
    if (fm?.home && fm?.away) {
      return (
        <span className={`flex items-center gap-1 min-w-0 text-ink/55 ${align === 'right' ? 'justify-end' : ''}`}>
          <Flag team={fm.home} size={13} className="shrink-0" />
          <span className="truncate text-xs">{shortName(fm.home)}</span>
          <span className="text-ink/30 text-xs">/</span>
          <Flag team={fm.away} size={13} className="shrink-0" />
          <span className="truncate text-xs">{shortName(fm.away)}</span>
        </span>
      );
    }
  }
  return <span className={`truncate text-sm text-ink/45 italic ${align === 'right' ? 'text-right' : ''}`}>{koRefLabel(slot, tsg)}</span>;
}

// Puana etkisiz "kim yener" bahsi. Maç başlamadan 1 saat önce kapanır; % dağılım gösterir.
function KoBet({ no, home, away, now }) {
  const { betsByNo = {}, setBet, user } = useStore();
  const picks = betsByNo[no] || {};
  const my = user ? picks[user.uid] : null;
  let cH = 0, cA = 0;
  for (const uid in picks) { const t = picks[uid]; if (t === home) cH++; else if (t === away) cA++; }
  const tot = cH + cA;
  const pH = tot ? Math.round((cH / tot) * 100) : 0;
  const pA = tot ? 100 - pH : 0;
  const startMs = matchStartMs({ date: KO_DATES[no]?.date, time: KO_DATES[no]?.time });
  const closed = startMs ? now >= startMs - 3600000 : false;
  const choose = (t) => { if (closed || !user) return; setBet(no, my === t ? '' : t); };
  const Cell = ({ t, pct, sel }) => (
    <button disabled={closed || !user} onClick={() => choose(t)}
      className={`relative overflow-hidden rounded-md border text-left transition-colors duration-200 px-2 py-1 ${sel ? 'border-pitch/70 bg-pitch/10' : 'border-black/[0.08] bg-black/[0.015]'} ${closed || !user ? '' : 'active:scale-[.98]'}`}>
      <div className="absolute inset-y-0 left-0 bg-pitch/15 transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
      <div className="relative flex items-center justify-between gap-1">
        <span className={`truncate text-[11px] ${sel ? 'font-bold text-pitch-dark' : 'font-semibold text-ink/75'}`}>{shortName(t)}</span>
        <span className="text-[11px] font-display tabular-nums text-ink/60">{pct}%</span>
      </div>
    </button>
  );
  return (
    <div className="px-4 pb-2 pt-0">
      <div className="flex items-center justify-between text-[10px] text-ink/40 mb-0.5">
        <span>Kim yener? · puana etkisiz</span>
        <span>{closed ? 'kapandı' : `${tot} oy${my ? ' · oyun ✓' : ''}`}</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <Cell t={home} pct={pH} sel={my === home} />
        <Cell t={away} pct={pA} sel={my === away} />
      </div>
    </div>
  );
}

function KoRow({ no, time, A, now, lists, getPrediction, actualKo, myMatch, open, onToggle }) {
  const def = MATCH_BY_NO[no] || {};
  const mm = A.matches[no] || {};
  const tsg = A.thirdSlotGroup;
  const homeT = mm.home, awayT = mm.away, win = mm.winner;
  const sc = actualKo?.[no];
  const hasSc = sc && sc.hs !== '' && sc.hs != null && sc.as !== '' && sc.as != null;
  const lb = liveBadge({ date: KO_DATES[no].date, time }, now);
  const d = open ? koDistribution(no, lists, getPrediction, A, actualKo) : null;
  // Kapalı satır için: senin (myPred) bu eşleşmede stake'in var mı?
  let star = null;
  if (homeT && awayT && myMatch?.home && myMatch?.away) {
    const inter = [myMatch.home, myMatch.away].filter((t) => t === homeT || t === awayT).length;
    star = inter === 2 ? 'full' : inter === 1 ? 'one' : null;
  }
  return (
    <div style={homeT || awayT ? { backgroundImage: `linear-gradient(90deg, ${homeT ? teamColor(homeT) : '#999'}10, transparent 26%, transparent 74%, ${awayT ? teamColor(awayT) : '#999'}10)` } : undefined}>
      <button className="w-full px-4 py-2.5 text-left" onClick={onToggle}>
        <div className="text-[11px] text-ink/45 mb-1 flex items-center gap-2">
          <span>{no}. maç · {KO_ROUND_TR[def.round] || 'Eleme'} · {time}</span>
          {star === 'full' && <span title="Bu eşleşmeyi tuttun" className="text-gold-dark text-xs">★</span>}
          {star === 'one' && <span title="Bir takımı tuttun" className="text-ink/35 text-xs">★</span>}
          {lb && lb.type === 'count' && <span className="inline-flex items-center gap-1 rounded-full bg-gold/20 text-gold-dark px-1.5 py-0.5 text-[10px] font-bold">⏱ {lb.text}</span>}
          {lb && lb.type === 'live' && <span className="inline-flex items-center gap-1 rounded-full bg-black/10 text-ink/60 px-1.5 py-0.5 text-[10px] font-bold">⏱ başladı</span>}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 flex items-center justify-end gap-1.5">
            <KoSide team={homeT} slot={def.home} A={A} tsg={tsg} winner={win} align="right" />
          </div>
          <span className={`shrink-0 w-12 text-center font-display tabular-nums ${hasSc ? 'text-ink/70' : 'text-ink/40 text-xs'}`}>
            {hasSc ? `${sc.hs}-${sc.as}` : win ? '✓' : 'vs'}
          </span>
          <div className="flex-1 min-w-0 flex items-center gap-1.5">
            <KoSide team={awayT} slot={def.away} A={A} tsg={tsg} winner={win} align="left" />
          </div>
          <span className={`shrink-0 text-ink/30 transition ${open ? 'rotate-180' : ''}`}>▾</span>
        </div>
      </button>
      {!hasSc && homeT && awayT && <KoBet no={no} home={homeT} away={awayT} now={now} />}
      {open && <div className="px-4 pb-3"><KoDist d={d} /></div>}
    </div>
  );
}

function DayBrowser({ lists, getPrediction, actual, myPred, liveScores }) {
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
  const A = useMemo(() => resolveBracket(actual, actual.ko || {}), [actual]);
  const myA = useMemo(() => (myPred ? resolveBracket(myPred, myPred.ko || {}) : null), [myPred]);
  const kos = useMemo(
    () => Object.entries(KO_DATES)
      .filter(([, info]) => info.date === date)
      .map(([no, info]) => ({ no: +no, time: info.time }))
      .sort((a, b) => (a.time < b.time ? -1 : 1)),
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
      {matches.length === 0 && kos.length === 0 ? (
        <p className="px-4 py-4 text-sm text-ink/55">Bu gün maç yok.</p>
      ) : (
        <div className="divide-y divide-black/5">
          {matches.map((m) => {
            const open = openNo === m.no;
            const a = actual.groupMatches?.[m.no];
            const mine = myPred?.groupMatches?.[m.no];
            const mineHas = mine && mine.home !== '' && mine.home != null && mine.away !== '' && mine.away != null;
            const live = liveScores?.[m.no];
            const isLive = !!live && (live.status === 'IN_PLAY' || live.status === 'PAUSED');
            const apiFinished = !!live && live.status === 'FINISHED';
            const d = open ? distribution(m.no, lists, getPrediction, actual.groupMatches?.[m.no]) : null;
            return (
              <div key={m.no}>
                <button className="w-full px-4 py-2.5 text-left" onClick={() => setOpenNo(open ? null : m.no)}
                  style={{ backgroundImage: `linear-gradient(90deg, ${teamColor(m.home)}14, transparent 26%, transparent 74%, ${teamColor(m.away)}14)` }}>
                  <div className="text-[11px] text-ink/45 mb-1 flex items-center gap-2">
                    <span>{m.no}. maç · {m.group} Grubu · {m.time}</span>
                    {(() => {
                      if (isLive) return (
                        <span className="blink inline-flex items-center gap-1 rounded-full bg-red-600 text-white px-1.5 py-0.5 text-[10px] font-bold">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-white" />{live.minute ? `${live.minute}'` : 'CANLI'}
                        </span>
                      );
                      const lb = liveBadge(m, now);
                      if (!lb) return null;
                      return lb.type === 'live'
                        ? <span className="inline-flex items-center gap-1 rounded-full bg-black/10 text-ink/60 px-1.5 py-0.5 text-[10px] font-bold">⏱ başladı</span>
                        : <span className="inline-flex items-center gap-1 rounded-full bg-gold/20 text-gold-dark px-1.5 py-0.5 text-[10px] font-bold">⏱ {lb.text}</span>;
                    })()}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0 flex items-center justify-end gap-1.5">
                      <span className="truncate text-sm font-semibold">{shortName(m.home)}</span>
                      <Flag team={m.home} size={18} className="shrink-0" />
                    </div>
                    <span className={`shrink-0 w-12 text-center font-display tabular-nums ${isLive ? 'text-red-600 font-bold' : 'text-ink/70'}`}>
                      {isLive ? `${live.hs}-${live.as}`
                        : hasScore(a) ? `${a.home}-${a.away}`
                        : apiFinished ? `${live.hs}-${live.as}`
                        : 'vs'}
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
          {kos.map(({ no, time }) => (
            <KoRow key={`ko${no}`} no={no} time={time} A={A} now={now}
              lists={lists} getPrediction={getPrediction} actualKo={actual.ko || {}}
              myMatch={myA?.matches?.[no]}
              open={openNo === no} onToggle={() => setOpenNo(openNo === no ? null : no)} />
          ))}
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
      {d.hasActual && (
        <div className="text-[11px] font-semibold text-pitch-dark">
          {d.exactCount > 0
            ? <>🔮 Tam skoru ({d.ah}-{d.aa}) {d.exactCount} kişi bildi · kalın yazılanlar</>
            : <>Tam skoru ({d.ah}-{d.aa}) bilen olmadı.</>}
        </div>
      )}
      {rows.map((r, i) => {
        const exactN = r.names.filter((n) => n.exact).length;
        return (
          <div key={i}>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>{r.label}{exactN > 0 && <span className="ml-1 text-pitch-dark">🔮{exactN}</span>}</span>
              <span className="tabular-nums">%{r.pct} · {r.names.length}</span>
            </div>
            <div className="mt-0.5 h-2 rounded-full bg-black/5 overflow-hidden">
              <div className={`h-full ${r.color}`} style={{ width: `${r.pct}%` }} />
            </div>
            {r.names.length > 0 && (
              <div className="mt-0.5 text-[11px] text-ink/50 leading-snug break-words">
                {r.names.map((n, j) => (
                  <span key={j}>
                    {j > 0 && ', '}
                    <span className={n.exact ? 'font-bold text-pitch-dark' : ''}>{n.name}{n.exact && ' 🔮'}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
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

  for (const r of recs) {
    if (r.exact > 0) out.push({ icon: '🔮', text: `${shortName(r.m.home)}–${shortName(r.m.away)} tam skorunu (${r.ah}-${r.aa}) ${r.exact} kişi bildi.` });
  }
  for (const r of recs.slice().sort((a, b) => b.correct - a.correct)) {
    if (r.correct > 0) {
      const lbl = r.O === 'H' ? `${shortName(r.m.home)} kazanır` : r.O === 'A' ? `${shortName(r.m.away)} kazanır` : 'beraberlik';
      out.push({ icon: '🎯', text: `${shortName(r.m.home)}–${shortName(r.m.away)}: ${r.correct}/${r.tot} kişi "${lbl}" deyip haklı çıktı.` });
    }
  }
  for (const r of recs) {
    if (r.tot >= 3 && r.correct > 0 && r.correct <= Math.max(1, Math.floor(r.tot * 0.25))) {
      out.push({ icon: '🤯', text: `Sürpriz! ${shortName(r.m.home)}–${shortName(r.m.away)} sonucunu ${r.tot} kişiden yalnızca ${r.correct}'i bildi.` });
    }
  }

  return dedupe(out);
}

function predStats(lists, getPrediction) {
  const out = [];
  if (lists.length === 0) return out;
  const champ = {}, scorer = {};
  let totalPreds = 0, bold = null;
  for (const l of lists) {
    const p = getPrediction(l.id);
    try { const b = resolveBracket(p, p.ko || {}); if (b.champion) champ[b.champion] = (champ[b.champion] || 0) + 1; } catch (e) {}
    if (p.topScorer) scorer[p.topScorer] = (scorer[p.topScorer] || 0) + 1;
    const g = p.groupMatches || {};
    for (const no in g) {
      const s = g[no]; if (!hasScore(s)) continue; totalPreds++;
      const tg = (+s.home) + (+s.away);
      if (!isNaN(tg) && (!bold || tg > bold.tg)) { const mm = GROUP_MATCHES.find((x) => String(x.no) === String(no)); if (mm) bold = { tg, s, mm, name: l.name }; }
    }
  }
  const champE = Object.entries(champ).sort((a, b) => b[1] - a[1]);
  if (champE.length) {
    out.push({ icon: '🏆', text: `En popüler şampiyon tahmini: ${shortName(champE[0][0])} (${champE[0][1]} kişi).` });
    if (champE.length > 1) out.push({ icon: '🌍', text: `Şampiyon için ${champE.length} farklı takım tahmin edildi.` });
    const lone = champE.filter(([, c]) => c === 1).map(([t]) => t);
    if (lone.length) out.push({ icon: '🦄', text: `${shortName(lone[lone.length - 1])} takımını şampiyon gören tek bir kişi var.` });
  }
  const scE = Object.entries(scorer).sort((a, b) => b[1] - a[1]);
  if (scE.length) out.push({ icon: '⚽', text: `Gol kralı için en çok tahmin edilen isim: ${scE[0][0]} (${scE[0][1]} kişi).` });
  if (totalPreds) out.push({ icon: '📊', text: `Şu ana kadar toplam ${totalPreds} maç tahmini girildi.` });
  if (bold && bold.tg >= 5) out.push({ icon: '🎆', text: `En iddialı skor: ${bold.name}, ${shortName(bold.mm.home)}–${shortName(bold.mm.away)} için ${bold.s.home}-${bold.s.away} yazmış.` });
  if (lists.length >= 2) out.push({ icon: '👥', text: `Yarışta ${lists.length} katılımcı var.` });
  return dedupe(out);
}

function dedupe(arr) {
  const seen = new Set();
  return arr.filter((f) => (seen.has(f.text) ? false : seen.add(f.text)));
}

function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; return h >>> 0; }
function seededShuffle(arr, seed) {
  const a = arr.slice();
  let s = hashStr(String(seed)) || 1;
  const rnd = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Eleme turu için "enteresan istatistikler" (grup aşaması bittikçe bunlar devreye girer).
function koFunStats(lists, getPrediction, actual) {
  const out = [];
  const A = resolveBracket(actual, actual.ko || {});
  const canon = (x, y) => [x, y].sort().join('|');
  const brackets = lists.map((l) => { const pr = getPrediction(l.id); return { P: resolveBracket(pr, pr.ko || {}), pred: pr }; });
  for (let no = 73; no <= 104; no++) {
    const am = A.matches?.[no], ak = actual.ko?.[no];
    if (!am?.home || !am?.away || !am?.winner) continue;
    if (!ak || ak.hs === '' || ak.hs == null || ak.as === '' || ak.as == null) continue;
    const pairC = canon(am.home, am.away);
    let matchup = 0, advHit = 0, advTot = 0, exact = 0, wrongAdv = 0;
    for (const b of brackets) {
      const pm = b.P.matches?.[no];
      if (!pm?.home || !pm?.away || canon(pm.home, pm.away) !== pairC) continue;
      matchup++;
      if (pm.winner) { advTot++; if (pm.winner === am.winner) advHit++; else wrongAdv++; }
      const pk = b.pred.ko?.[no];
      if (pk && pk.hs !== '' && pk.hs != null && pk.as !== '' && pk.as != null) {
        const ohs = pm.home === am.home ? +pk.hs : +pk.as;
        const oas = pm.home === am.home ? +pk.as : +pk.hs;
        if (ohs === +ak.hs && oas === +ak.as) exact++;
      }
    }
    const rnd = KO_ROUND_TR[MATCH_BY_NO[no]?.round] || 'Eleme';
    if (matchup > 0) out.push({ icon: '🤝', text: `${rnd}: ${shortName(am.home)}–${shortName(am.away)} eşleşmesini ${matchup} kişi tutturdu.` });
    if (advTot > 0 && advHit > 0) out.push({ icon: '✅', text: `${shortName(am.winner)} turu geçti; ${advHit}/${advTot} kişi bunu bilmişti.` });
    if (exact > 0) out.push({ icon: '🔮', text: `${shortName(am.home)}–${shortName(am.away)} eleme skorunu (${ak.hs}-${ak.as}) ${exact} kişi tam bildi.` });
    if (advTot >= 3 && advHit > 0 && advHit <= Math.max(1, Math.floor(advTot * 0.25))) out.push({ icon: '🤯', text: `Sürpriz! ${shortName(am.winner)} turu geçer diyen ${advTot} kişiden yalnızca ${advHit} kişiydi.` });
    if (wrongAdv > 0) { const loser = am.winner === am.home ? am.away : am.home; out.push({ icon: '🙈', text: `${wrongAdv} kişi ${shortName(loser)} turu geçer demişti ama ${shortName(am.winner)} geçti.` }); }
  }
  return dedupe(out);
}

// Enteresan istatistik seçimi: RASTGELE (sırayla değil), ama gösterilen bir fakt,
// diğerlerinin tamamı gösterilene (tam bir tur) kadar tekrar gelmez. İlerleme
// localStorage'da "görülenler" kümesi olarak tutulur.
const FUNSTATS_SEEN_KEY = 'kymal_funstats_seen_v3';
function pickRotatingFacts(all, n) {
  const want = Math.min(n, all.length);
  if (want === 0) return [];
  const texts = new Set(all.map((f) => f.text));
  let seen;
  try { seen = JSON.parse(localStorage.getItem(FUNSTATS_SEEN_KEY) || '[]'); } catch { seen = []; }
  if (!Array.isArray(seen)) seen = [];
  let seenSet = new Set(seen.filter((t) => texts.has(t)));   // artık geçersizleri at
  const used = new Set();
  const result = [];
  let guard = 0;
  while (result.length < want && guard++ < all.length * 2 + 5) {
    let pool = all.filter((f) => !seenSet.has(f.text) && !used.has(f.text));
    if (pool.length === 0) {                                  // tur bitti → sıfırla (bu turda gösterilenler hariç)
      seenSet = new Set(used);
      pool = all.filter((f) => !used.has(f.text));
      if (pool.length === 0) break;
    }
    const f = pool[(Math.random() * pool.length) | 0];        // RASTGELE seç
    used.add(f.text); seenSet.add(f.text); result.push(f);
  }
  try { localStorage.setItem(FUNSTATS_SEEN_KEY, JSON.stringify([...seenSet])); } catch { /* yoksay */ }
  return result;
}

function FunStats({ lists, getPrediction, actual }) {
  const all = useMemo(
    () => dedupe([...funStats(lists, getPrediction, actual), ...koFunStats(lists, getPrediction, actual), ...predStats(lists, getPrediction)]),
    [lists, actual]
  );
  const [facts, setFacts] = useState([]);
  const rolled = useRef(false);
  useEffect(() => {
    if (rolled.current || all.length === 0) return;
    setFacts(pickRotatingFacts(all, 3));
    rolled.current = true;
  }, [all]);

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
  const { highlightsByNo = {}, writeHighlight, highlightsAuto } = useStore();
  const A = useMemo(() => resolveBracket(actual, actual.ko || {}), [actual]);
  const days = useMemo(() => {
    const map = new Map();
    const push = (date, item) => { if (!date) return; if (!map.has(date)) map.set(date, []); map.get(date).push(item); };
    for (const m of GROUP_MATCHES) {
      const a = actual.groupMatches?.[m.no];
      if (!hasScore(a)) continue;
      push(m.date, { no: m.no, home: m.home, away: m.away, hs: a.home, as: a.away, time: m.time, date: m.date });
    }
    for (let no = 73; no <= 104; no++) {
      const k = actual.ko?.[no];
      if (!k || k.hs === '' || k.hs == null || k.as === '' || k.as == null) continue;
      const am = A.matches?.[no];
      if (!am?.home || !am?.away) continue;
      const d = KO_DATES[no] || {};
      push(d.date, { no, home: am.home, away: am.away, hs: k.hs, as: k.as, time: d.time, date: d.date, round: KO_ROUND_TR[MATCH_BY_NO[no]?.round] || 'Eleme' });
    }
    const arr = [...map.entries()].map(([date, ms]) => ({ date, matches: ms.sort((a, b) => timeKey(a) - timeKey(b)) }));
    arr.sort((a, b) => dayKey(a.date) - dayKey(b.date));
    return arr;
  }, [actual, A]);

  const [idx, setIdx] = useState(0);
  useEffect(() => { setIdx(days.length ? days.length - 1 : 0); }, [days.length]);
  const day = days[idx];

  // Otomatik özet bulma (görünen günün biten maçları için; Firestore yüklensin diye gecikmeli).
  useEffect(() => {
    if (!day || highlightsAuto === false) return;
    let cancelled = false;
    const tid = setTimeout(async () => {
      for (const m of day.matches) {
        if (cancelled) break;
        const ex = highlightsByNo[m.no];
        if (ex?.videoId) continue;
        const res = await attemptHighlight(m, ex, {});
        if (cancelled) break;
        if (res.action === 'save' || res.action === 'tried') await writeHighlight(m.no, res.data);
      }
    }, 1400);
    return () => { cancelled = true; clearTimeout(tid); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day?.date, days.length, highlightsAuto]);

  if (!day) return null;
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-black/5 flex items-center justify-between">
        <div className="min-w-0">
          <p className="font-display text-xl">Son sonuçlar</p>
          <p className="text-xs text-ink/45">{day.date}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button className="h-7 w-7 rounded-full bg-black/5 text-ink/70 active:scale-95 disabled:opacity-30"
            disabled={idx === 0} onClick={() => setIdx((i) => Math.max(0, i - 1))} aria-label="Önceki gün">‹</button>
          <span className="text-[11px] text-ink/40 tabular-nums w-9 text-center">{idx + 1}/{days.length}</span>
          <button className="h-7 w-7 rounded-full bg-black/5 text-ink/70 active:scale-95 disabled:opacity-30"
            disabled={idx === days.length - 1} onClick={() => setIdx((i) => Math.min(days.length - 1, i + 1))} aria-label="Sonraki gün">›</button>
        </div>
      </div>
      <div className="divide-y divide-black/5">
        {day.matches.map((m) => {
          const hl = highlightsByNo[m.no];
          const hn = Number(m.hs), an = Number(m.as);
          return (
            <div key={m.no} className="px-4 py-2">
              {m.round && <div className="text-[10px] text-ink/40 mb-0.5">{m.round}</div>}
              <div className="flex items-center gap-2 text-sm">
                <div className="flex-1 min-w-0 flex items-center justify-end gap-1.5">
                  <span className={`truncate ${hn > an ? 'font-bold text-pitch' : hn < an ? 'text-ink/40' : ''}`}>{shortName(m.home)}</span>
                  <Flag team={m.home} size={16} className="shrink-0" />
                </div>
                <span className="shrink-0 w-12 text-center font-display tabular-nums">{m.hs}-{m.as}</span>
                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  <Flag team={m.away} size={16} className="shrink-0" />
                  <span className={`truncate ${an > hn ? 'font-bold text-pitch' : an < hn ? 'text-ink/40' : ''}`}>{shortName(m.away)}</span>
                </div>
              </div>
              {hl?.videoId && (
                <div className="mt-1.5 flex justify-center">
                  <a href={hl.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-red-600 text-white px-2.5 py-1 text-[11px] font-bold active:scale-95">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.6 7.2s-.2-1.4-.8-2c-.8-.8-1.6-.8-2-.9C16 4 12 4 12 4h0s-4 0-6.8.3c-.4.1-1.2.1-2 .9-.6.6-.8 2-.8 2S2 8.8 2 10.4v1.2c0 1.6.2 3.2.2 3.2s.2 1.4.8 2c.8.8 1.8.8 2.3.9 1.7.2 6.7.3 6.7.3s4 0 6.8-.3c.4-.1 1.2-.1 2-.9.6-.6.8-2 .8-2s.2-1.6.2-3.2v-1.2c0-1.6-.2-3.2-.2-3.2zM9.8 14.6V8.8l5.2 2.9-5.2 2.9z"/></svg>
                    Maç özeti
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
