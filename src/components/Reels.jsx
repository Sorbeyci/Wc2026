import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { scoreUser, scoreLog, logDateKey, tournamentComplete } from '../lib/scoring.js';
import { sharePerson } from '../lib/shareCard.js';
import { Flag, Avatar } from './ui.jsx';
import { shortName } from '../data/flags.js';

// ---------------------------------------------------------------------------
// Turnuva hikayesi (reels): kişinin kupa yolculuğu — story tarzı tam ekran,
// otomatik/dokunmatik ilerleyen slaytlar. Veriler scoreLog/scoreUser'dan.
// ---------------------------------------------------------------------------
const SLIDE_MS = 5000;

export default function Reels({ list, onClose }) {
  const { lists, actual, getPrediction } = useStore();
  const data = useMemo(() => {
    const pred = getPrediction(list.id);
    const res = scoreUser(pred, actual);
    const { entries } = scoreLog(pred, actual);
    const ranked = lists.map((l) => ({ id: l.id, total: scoreUser(getPrediction(l.id), actual).total })).sort((a, b) => b.total - a.total);
    const rank = ranked.findIndex((r) => r.id === list.id) + 1;
    const byDay = {};
    for (const e of entries) if (e.date) (byDay[e.date] ||= []).push(e);
    const days = Object.entries(byDay).map(([d, es]) => ({ d, pts: es.reduce((s, e) => s + e.pts, 0) }));
    days.sort((a, b) => b.pts - a.pts || logDateKey(a.d) - logDateKey(b.d));
    const exact = entries.filter((e) => e.tag === 'Tam skor').length;
    const advs = entries.filter((e) => e.kind === 'ko-adv');
    const A = res.bracket?.actual, P = res.bracket?.pred;
    const champHit = !!(A?.champion && P?.champion === A.champion);
    const pTop = (pred.topScorer || '').trim(), aTop = (actual.topScorer || '').trim();
    const topHit = !!(pTop && aTop && pTop.toLowerCase() === aTop.toLowerCase());
    const done = tournamentComplete(actual);
    return { pred, res, rank, n: lists.length, bestDay: days[0] || null, exact, advCount: advs.length,
      champPick: P?.champion || '', champHit, realChamp: A?.champion || '', topPick: pTop, topHit, done, activeDays: days.length };
  }, [list.id, lists, actual]);

  const slides = useMemo(() => {
    const s = [];
    s.push({ icon: null, title: 'Dünya Kupası 2026', sub: `${list.name} · turnuva hikayen`, avatar: true });
    s.push({ icon: '🏅', title: `${data.res.total} puan`, sub: `${data.n} kişi arasında ${data.rank}. sıra${data.done ? ' (nihai)' : ''}` });
    if (data.bestDay) s.push({ icon: '🔥', title: `+${data.bestDay.pts} puan`, sub: `En iyi günün · ${data.bestDay.d}` });
    if (data.exact > 0) s.push({ icon: '🎯', title: `${data.exact} tam skor`, sub: 'Skoru harfiyen bildiğin maçlar' });
    if (data.advCount > 0) s.push({ icon: '🚀', title: `${data.advCount} tur atlatan`, sub: 'Elemede doğru bildiğin takımlar' });
    if (data.activeDays > 1) s.push({ icon: '📅', title: `${data.activeDays} gün`, sub: 'Puan kazandığın gün sayısı' });
    if (data.champPick) s.push({
      icon: data.champHit ? '🏆' : '💔',
      title: shortName(data.champPick), team: data.champPick,
      sub: data.champHit ? 'Şampiyonu BİLDİN! +80' : data.realChamp ? `Şampiyon tahminin · kupayı ${shortName(data.realChamp)} aldı` : 'Şampiyon tahminin',
    });
    if (data.topPick) s.push({ icon: data.topHit ? '👑' : '⚽', title: data.topPick, sub: data.topHit ? 'Gol kralını BİLDİN! +50' : 'Gol kralı tahminin' });
    s.push({ icon: '📲', title: 'Karnen hazır', sub: data.done ? '2030’da görüşürüz 👋' : 'Turnuva sürüyor — devamı gelecek', share: true });
    return s;
  }, [data, list.name]);

  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setI((x) => Math.min(x + 1, slides.length - 1)), SLIDE_MS);
    return () => clearTimeout(t);
  }, [i, paused, slides.length]);
  const cur = slides[i];
  const share = () => sharePerson({
    list, total: data.res.total, breakdown: data.res.breakdown,
    champion: data.champPick, topScorer: data.pred.topScorer || '',
  }, { rank: data.rank });

  return (
    <div className="fixed inset-0 z-[60] bg-ink text-white flex flex-col select-none"
      onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} onPointerCancel={() => setPaused(false)}>
      {/* progress */}
      <div className="flex gap-1 px-3 pt-3">
        {slides.map((_, k) => (
          <div key={k} className="h-1 flex-1 rounded-full bg-white/20 overflow-hidden">
            <div className={`h-full bg-white ${k < i ? 'w-full' : k === i ? 'reel-fill' : 'w-0'}`}
              style={k === i && !paused ? { animationDuration: `${SLIDE_MS}ms` } : k === i ? { width: '40%' } : undefined} />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between px-4 pt-2">
        <div className="flex items-center gap-2 text-sm font-semibold"><Avatar name={list.ownerName || list.name} color={list.color} src={list.ownerPhoto} size={26} />{list.name}</div>
        <button onClick={onClose} aria-label="Kapat" className="h-8 w-8 grid place-items-center rounded-full bg-white/10 text-white/80">✕</button>
      </div>
      {/* slide */}
      <div className="flex-1 grid place-items-center px-8 text-center">
        <div key={i} className="fade-in">
          {cur.avatar
            ? <div className="mx-auto w-fit"><Avatar name={list.ownerName || list.name} color={list.color} src={list.ownerPhoto} size={84} /></div>
            : cur.team
              ? <div className="mx-auto w-fit flex items-center gap-3 text-6xl">{cur.icon}<Flag team={cur.team} size={56} /></div>
              : <p className="text-7xl">{cur.icon}</p>}
          <p className="font-display text-4xl mt-4 leading-tight">{cur.title}</p>
          <p className="text-white/60 mt-2 text-sm">{cur.sub}</p>
          {cur.share && (
            <button onClick={share} className="mt-5 rounded-full bg-white text-ink px-5 py-2 text-sm font-bold active:scale-95">📲 Karneyi paylaş</button>
          )}
        </div>
      </div>
      {/* tap zones */}
      <div className="absolute inset-y-16 left-0 w-1/3" onClick={() => setI((x) => Math.max(0, x - 1))} />
      <div className="absolute inset-y-16 right-0 w-1/3" onClick={() => setI((x) => Math.min(slides.length - 1, x + 1))} />
      <p className="pb-4 text-center text-[10px] text-white/30">kupayikimalir.com</p>
    </div>
  );
}
