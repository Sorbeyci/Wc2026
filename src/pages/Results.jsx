import { useRef, useState, useEffect } from 'react';
import { useStore } from '../lib/store.jsx';
import { SectionTitle, BrandHeader, Flag, FormBadges } from '../components/ui.jsx';
import { computeStandings, teamForm, groupOrder } from '../lib/scoring.js';
import { rankedThirds } from '../data/bracket.js';
import { shortName } from '../data/flags.js';
import { GROUP_NAMES } from '../data/tournament.js';
import ResultBracket from '../components/ResultBracket.jsx';

function ResultGroup({ g, actual, compareOrder }) {
  const scores = actual.groupMatches || {};
  const rows = computeStandings(g, scores);
  const byTeam = Object.fromEntries(rows.map((r) => [r.team, r]));
  const override = actual.groupTables?.[g];
  const manual = !!(override && override.length === 4 && override.every(Boolean));
  const order = manual ? override.filter((t) => byTeam[t]) : rows.map((r) => r.team);
  const played = rows.reduce((n, r) => n + r.P, 0) > 0;
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-black/5 flex items-center justify-between">
        <span className="font-display text-xl text-ink">{g} Grubu</span>
        {!played && <span className="text-[11px] text-ink/40">skor girilmedi</span>}
      </div>
      <div className="divide-y divide-black/5 px-2">
        {order.map((t, i) => {
          const r = byTeam[t] || { Pts: 0, GD: 0, GF: 0 };
          let cmp = null;
          if (compareOrder) {
            const pIdx = compareOrder.indexOf(t);
            if (pIdx >= 0) {
              const exact = pIdx === i;
              cmp = (
                <span className={`shrink-0 text-[10px] font-bold rounded px-1.5 py-0.5 ${exact ? 'bg-pitch/15 text-pitch-dark' : 'bg-gold/20 text-gold-dark'}`}
                  title={exact ? 'Sıra tam tuttu' : `Senin tahminin: ${pIdx + 1}.`}>
                  {exact ? `✓ ${pIdx + 1}.` : `sen ${pIdx + 1}.`}
                </span>
              );
            }
          }
          return (
            <div key={t} className={`flex items-center gap-2 py-2 px-1 ${i < 2 ? 'bg-pitch/[0.05]' : ''}`}>
              <span className={`font-display text-sm w-5 text-center ${i < 2 ? 'text-pitch' : 'text-ink/40'}`}>{i + 1}</span>
              <Flag team={t} size={18} className="shrink-0" />
              <div className="flex-1 min-w-0 flex items-center gap-1.5">
                <span className="truncate text-sm font-semibold">{shortName(t)}</span>
                {cmp}
              </div>
              <div className="shrink-0 w-[64px] flex justify-end"><FormBadges form={teamForm(t, scores)} /></div>
              <span className="shrink-0 w-[96px] text-right text-[11px] text-ink/45 tabular-nums whitespace-nowrap">{r.Pts}p · Av {r.GD >= 0 ? '+' : ''}{r.GD} · AG {r.GF}</span>
            </div>
          );
        })}
      </div>
      <p className="px-4 py-1.5 text-[11px] text-ink/40 border-t border-black/5">İlk 2 üst tura çıkar · 3. en iyi 8 üçüncüye girebilir.</p>
    </div>
  );
}

function ThirdsTable({ actual }) {
  const ranked = rankedThirds(actual).filter((r) => r.team);
  if (ranked.length === 0) {
    return <p className="text-xs text-ink/45 px-1">Henüz 3.’lük sıralaması için yeterli sonuç girilmedi.</p>;
  }
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-black/5 flex items-center justify-between">
        <span className="font-display text-xl text-ink">En iyi 3.’ler</span>
        <span className="text-[11px] text-ink/40">ilk 8 üst tura çıkar</span>
      </div>
      <div className="divide-y divide-black/5 px-2">
        {ranked.map((r, i) => {
          const adv = i < 8;
          return (
            <div key={r.group} className={`flex items-center gap-2 py-2 px-1 ${adv ? 'bg-pitch/[0.05]' : ''}`}>
              <span className={`font-display text-sm w-5 text-center ${adv ? 'text-pitch' : 'text-ink/40'}`}>{i + 1}</span>
              <span className="text-[11px] font-bold text-ink/35 w-4 text-center">{r.group}</span>
              <Flag team={r.team} size={18} className="shrink-0" />
              <span className="flex-1 min-w-0 truncate text-sm font-semibold">{shortName(r.team)}</span>
              {adv
                ? <span className="chip bg-pitch/15 text-pitch-dark">çıkar</span>
                : <span className="chip bg-black/5 text-ink/40">elenir</span>}
              <span className="text-[11px] text-ink/45 tabular-nums whitespace-nowrap">{r.Pts}p · Av {r.GD >= 0 ? '+' : ''}{r.GD} · AG {r.GF}</span>
            </div>
          );
        })}
      </div>
      <p className="px-4 py-1.5 text-[11px] text-ink/40 border-t border-black/5">12 grubun 3.’sü puan → averaj → atılan gole göre sıralanır; ilk 8’i eleme turuna kalır.</p>
    </div>
  );
}

export default function Results({ goHome }) {
  const { actual, lists, getPrediction, user } = useStore();
  const thirdsRef = useRef(null);
  const bracketRef = useRef(null);
  const topRef = useRef(null);
  const groupRefs = useRef({});
  const [compare, setCompare] = useState(false);
  const [bracketOpen, setBracketOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);

  const myList = lists.find((l) => l.ownerUid === user?.uid);
  const myPred = myList ? getPrediction(myList.id) : null;

  const goThirds = () => thirdsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const goGroup = (g) => groupRefs.current[g]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const goBracket = () => { setBracketOpen(true); requestAnimationFrame(() => bracketRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })); };
  const goTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // Aşağı kayınca "yukarı" oku göster.
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 480);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="space-y-4" ref={topRef}>
      <BrandHeader onClick={goHome} />
      <SectionTitle title="Gerçek Puan Durumu" />
      <p className="text-xs text-ink/55 px-1 leading-relaxed">
        Girilen skorlara göre güncel grup puan durumu. Her grupta ilk 2 takım üst tura çıkar;
        12 grubun 3.’sünden en iyi 8’i de eleme turuna kalır.
      </p>

      {/* Hızlı geçiş: gruplar (A B C …) */}
      <div className="flex flex-wrap gap-1.5">
        {GROUP_NAMES.map((g) => (
          <button key={g} onClick={() => goGroup(g)}
            className="h-8 w-8 grid place-items-center rounded-lg bg-black/5 text-ink/70 text-sm font-display font-bold active:scale-95 hover:bg-black/10">
            {g}
          </button>
        ))}
      </div>

      {/* Kısayol butonları */}
      <div className="grid grid-cols-1 gap-2">
        <button onClick={goThirds}
          className="w-full btn bg-ink text-white hover:opacity-90 text-sm flex items-center justify-center gap-1.5">
          🥉 En iyi 3.’ler Puan tablosuna git ↓
        </button>
        <button onClick={goBracket}
          className="w-full btn bg-black/5 text-ink hover:bg-black/10 text-sm flex items-center justify-center gap-1.5">
          🏆 Eleme ağacını gör ↓
        </button>
      </div>

      {/* Kendi tahminimle karşılaştır (aç/kapa) — dikkat çekici */}
      {myPred && (
        <button onClick={() => setCompare((v) => !v)}
          className={`w-full rounded-xl px-3 py-3 text-sm font-bold flex items-center justify-between gap-2 transition active:scale-[.99] ${compare
            ? 'bg-pitch text-white shadow'
            : 'bg-gradient-to-r from-gold/35 via-gold/15 to-pitch/25 text-ink ring-1 ring-gold/50 shadow-sm'}`}>
          <span className="flex items-center gap-2 min-w-0">
            {!compare && (
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full rounded-full bg-pitch opacity-60 animate-ping" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-pitch" />
              </span>
            )}
            <span className="truncate">🔍 Kendi puan durumunla karşılaştır</span>
          </span>
          <span className={`shrink-0 text-xs rounded-full px-2 py-0.5 ${compare ? 'bg-white/20' : 'bg-pitch text-white'}`}>{compare ? 'açık ✓' : 'aç →'}</span>
        </button>
      )}
      {compare && (
        <p className="text-[11px] text-ink/45 px-1 -mt-1">
          Yeşil <span className="font-semibold text-pitch-dark">✓ N.</span> = sırayı tam bildin · sarı <span className="font-semibold text-gold-dark">sen N.</span> = senin o takıma verdiğin sıra.
        </p>
      )}

      <p className="text-[11px] text-ink/45 px-1 leading-relaxed">
        Sağdaki rozetler son maçları gösterir: <span className="font-semibold text-pitch">G</span> galibiyet ·
        <span className="font-semibold text-gold-dark"> B</span> beraberlik ·
        <span className="font-semibold text-red-500"> M</span> mağlubiyet. · Av Averaj · AG Atılan gol
      </p>

      {GROUP_NAMES.map((g) => (
        <div key={g} ref={(el) => { groupRefs.current[g] = el; }} className="scroll-mt-3">
          <ResultGroup g={g} actual={actual} compareOrder={compare && myPred ? groupOrder(myPred, g) : null} />
        </div>
      ))}

      <div ref={thirdsRef} className="scroll-mt-3">
        <SectionTitle title="En iyi 3.’ler tablosu" />
      </div>
      <ThirdsTable actual={actual} />

      <div ref={bracketRef} className="scroll-mt-3">
        <SectionTitle title="Eleme ağacı (gerçek)" right={
          <button onClick={() => setBracketOpen((v) => !v)} className="text-xs font-semibold text-pitch">
            {bracketOpen ? 'gizle' : 'göster'}
          </button>
        } />
      </div>
      {bracketOpen
        ? <ResultBracket source={actual} />
        : <button onClick={() => setBracketOpen(true)} className="w-full card p-4 text-sm text-ink/55 hover:bg-black/[0.02]">
            Eleme ağacını görmek için dokun. Takımlar gruplar bittikçe netleşir; boş kutular grup kökenini (1A, 2B, 3.) gösterir.
          </button>}

      {/* Yukarı çık FAB */}
      {showTop && (
        <button onClick={goTop} aria-label="Yukarı çık"
          className="fixed right-4 bottom-24 z-30 h-11 w-11 grid place-items-center rounded-full bg-ink text-white shadow-lg active:scale-95 fade-in">
          ↑
        </button>
      )}
    </div>
  );
}
