import { useRef } from 'react';
import { useStore } from '../lib/store.jsx';
import { SectionTitle, BrandHeader, Flag, FormBadges } from '../components/ui.jsx';
import { computeStandings, teamForm } from '../lib/scoring.js';
import { rankedThirds } from '../data/bracket.js';
import { shortName } from '../data/flags.js';
import { GROUP_NAMES } from '../data/tournament.js';

function ResultGroup({ g, actual }) {
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
          return (
            <div key={t} className={`flex items-center gap-2 py-2 px-1 ${i < 2 ? 'bg-pitch/[0.05]' : ''}`}>
              <span className={`font-display text-sm w-5 text-center ${i < 2 ? 'text-pitch' : 'text-ink/40'}`}>{i + 1}</span>
              <Flag team={t} size={18} className="shrink-0" />
              <span className="flex-1 min-w-0 truncate text-sm font-semibold">{shortName(t)}</span>
              <FormBadges form={teamForm(t, scores)} />
              <span className="text-[11px] text-ink/45 tabular-nums whitespace-nowrap">{r.Pts}p · Av {r.GD >= 0 ? '+' : ''}{r.GD} · AG {r.GF}</span>
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
  const { actual } = useStore();
  const thirdsRef = useRef(null);
  const groupRefs = useRef({});
  const goThirds = () => thirdsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const goGroup = (g) => groupRefs.current[g]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return (
    <div className="space-y-4">
      <BrandHeader onClick={goHome} />
      <SectionTitle title="Gerçek Puan Durumu" />
      <p className="text-xs text-ink/55 px-1 leading-relaxed">
        Girilen skorlara göre güncel grup puan durumu. Her grupta ilk 2 takım üst tura çıkar;
        12 grubun 3.’sünden en iyi 8’i de eleme turuna kalır.
      </p>

      {/* Hızlı geçiş: gruplar (A B C …) + 3.'ler */}
      <div className="flex flex-wrap gap-1.5">
        {GROUP_NAMES.map((g) => (
          <button key={g} onClick={() => goGroup(g)}
            className="h-8 w-8 grid place-items-center rounded-lg bg-black/5 text-ink/70 text-sm font-display font-bold active:scale-95 hover:bg-black/10">
            {g}
          </button>
        ))}
        <button onClick={goThirds}
          className="h-8 px-3 grid place-items-center rounded-lg bg-ink text-white text-xs font-semibold active:scale-95">
          🥉 3.’ler
        </button>
      </div>

      <p className="text-[11px] text-ink/45 px-1 leading-relaxed">
        Sağdaki rozetler son maçları gösterir: <span className="font-semibold text-pitch">G</span> galibiyet ·
        <span className="font-semibold text-gold-dark"> B</span> beraberlik ·
        <span className="font-semibold text-red-500"> M</span> mağlubiyet. · Av Averaj · AG Atılan gol
      </p>

      {GROUP_NAMES.map((g) => (
        <div key={g} ref={(el) => { groupRefs.current[g] = el; }} className="scroll-mt-3">
          <ResultGroup g={g} actual={actual} />
        </div>
      ))}

      <div ref={thirdsRef} className="scroll-mt-3">
        <SectionTitle title="En iyi 3.’ler tablosu" />
      </div>
      <ThirdsTable actual={actual} />
    </div>
  );
}
