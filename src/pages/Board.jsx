import { useMemo, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { scoreUser } from '../lib/scoring.js';
import { GROUP_MATCHES } from '../data/tournament.js';
import { shortName } from '../data/flags.js';
import { SectionTitle, Dot, Empty } from '../components/ui.jsx';
import FullStats from '../components/FullStats.jsx';

const SUB = [
  { id: 'board', label: 'Sıralama' },
  { id: 'stats', label: 'İstatistik' },
];
const VIEWS = [
  { id: 'detay', label: 'Detay' },
  { id: 'liste', label: 'Liste' },
  { id: 'tablo', label: 'Tablo' },
];

const sg = (n) => (n > 0 ? 1 : n < 0 ? -1 : 0);
const scored = (s) => s && s.home !== '' && s.home != null && s.away !== '' && s.away != null;

function groupHits(pred, actual) {
  const hits = [];
  for (const m of GROUP_MATCHES) {
    const p = pred.groupMatches?.[m.no], a = actual.groupMatches?.[m.no];
    if (!scored(p) || !scored(a)) continue;
    const ph = +p.home, pa = +p.away, ah = +a.home, aa = +a.away;
    let pts = 0;
    if (ph === ah && pa === aa) pts = 5; else if (sg(ph - pa) === sg(ah - aa)) pts = 3;
    if (pts) hits.push({ key: 'g' + m.no, no: m.no, home: m.home, away: m.away, pred: `${ph}-${pa}`, act: `${ah}-${aa}`, pts });
  }
  return hits;
}
function koHits(pred, actual, bracketActual) {
  const hits = [];
  for (let no = 73; no <= 104; no++) {
    const p = pred.ko?.[no], a = actual.ko?.[no];
    if (!p || !a || !scored(p) || !scored(a)) continue;
    const ph = +p.hs, pa = +p.as, ah = +a.hs, aa = +a.as;
    let pts = 0;
    if (ph === ah && pa === aa) pts = 5; else if (sg(ph - pa) === sg(ah - aa)) pts = 3;
    if (pts) {
      const mm = bracketActual?.matches?.[no];
      hits.push({ key: 'k' + no, no, home: mm?.home || '?', away: mm?.away || '?', pred: `${ph}-${pa}`, act: `${ah}-${aa}`, pts });
    }
  }
  return hits;
}

export default function Board({ onOpenList }) {
  const { lists, actual, getPrediction, isOnline, onlineCount } = useStore();
  const [sub, setSub] = useState('board');
  const [view, setView] = useState('detay');

  const rows = useMemo(() => (
    lists
      .map((l) => {
        const pred = getPrediction(l.id);
        const res = scoreUser(pred, actual);
        return { list: l, ...res, pred, champion: res.bracket?.pred?.champion || null, topScorer: pred.topScorer || '' };
      })
      .sort((a, b) => b.total - a.total)
  ), [lists, actual]);

  return (
    <div className="space-y-4">
      <SectionTitle eyebrow="3. Adım" title="Sıralama" />

      {onlineCount > 0 && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-pitch -mt-1">
          <span className="inline-block h-2 w-2 rounded-full bg-pitch animate-pulse" />
          {onlineCount} kişi çevrimiçi
        </div>
      )}

      <div className="flex rounded-xl bg-black/5 p-1">
        {SUB.map((s) => (
          <button key={s.id} onClick={() => setSub(s.id)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${sub === s.id ? 'bg-white shadow-sm text-ink' : 'text-ink/55'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {lists.length === 0 ? (
        <Empty title="Henüz liste yok">Tabloyu görmek için liste ve tahmin ekle.</Empty>
      ) : sub === 'board' ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-ink/45">Görünüm</p>
            <div className="flex rounded-lg bg-black/5 p-0.5">
              {VIEWS.map((v) => (
                <button key={v.id} onClick={() => setView(v.id)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition ${view === v.id ? 'bg-white shadow-sm text-ink' : 'text-ink/55'}`}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
          {view === 'detay' && <Leaderboard rows={rows} onOpenList={onOpenList} isOnline={isOnline} actual={actual} />}
          {view === 'liste' && <CompactList rows={rows} onOpenList={onOpenList} isOnline={isOnline} />}
          {view === 'tablo' && <GridView rows={rows} onOpenList={onOpenList} isOnline={isOnline} />}
        </>
      ) : (
        <Stats rows={rows} />
      )}
    </div>
  );
}

function CompactList({ rows, onOpenList, isOnline }) {
  return (
    <div className="card divide-y divide-black/5">
      {rows.map((r, i) => {
        const leader = i === 0 && r.total > 0;
        return (
          <button key={r.list.id} onClick={() => onOpenList(r.list.id)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left active:bg-black/[0.02]">
            <span className={`font-display text-lg w-6 ${leader ? 'text-gold-dark' : 'text-ink/30'}`}>{i + 1}</span>
            <Dot color={r.list.color} />
            <span className="flex-1 min-w-0 font-semibold text-sm truncate">
              {r.list.name}
              {isOnline?.(r.list) && <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-pitch align-middle" />}
            </span>
            <span className="font-display text-lg text-ink tabular-nums">{r.total}</span>
          </button>
        );
      })}
    </div>
  );
}

function GridView({ rows, onOpenList, isOnline }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {rows.map((r, i) => {
        const leader = i === 0 && r.total > 0;
        return (
          <button key={r.list.id} onClick={() => onOpenList(r.list.id)}
            className={`card p-3 text-left active:scale-[.99] transition ${leader ? 'ring-2 ring-gold' : ''}`}>
            <div className="flex items-center gap-1.5">
              <span className={`font-display text-base ${leader ? 'text-gold-dark' : 'text-ink/30'}`}>{i + 1}</span>
              <Dot color={r.list.color} />
              {isOnline?.(r.list) && <span className="h-2 w-2 rounded-full bg-pitch" />}
            </div>
            <p className="mt-1 font-semibold text-sm leading-tight truncate">{r.list.name}</p>
            <p className="font-display text-3xl text-ink leading-none mt-1">{r.total}</p>
            <p className="mt-1 text-[11px] text-ink/45 truncate">🏆 {r.champion || '—'}</p>
          </button>
        );
      })}
    </div>
  );
}

function Leaderboard({ rows, onOpenList, isOnline, actual }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-ink/45 px-1">
        Adına dokunarak tahminlerini gör; kategori kutucuklarına dokunarak nereden kaç puan aldığını ve hangi maçları bildiğini aç.
      </p>
      {rows.map((r, i) => <LbRow key={r.list.id} r={r} i={i} onOpenList={onOpenList} online={isOnline?.(r.list)} actual={actual} />)}
    </div>
  );
}

function LbRow({ r, i, onOpenList, online, actual }) {
  const [cat, setCat] = useState(null);
  const leader = i === 0 && r.total > 0;
  const cats = [
    { id: 'gm', label: 'Maçlar', value: r.breakdown.groupMatches },
    { id: 'gt', label: 'Gruplar', value: r.breakdown.groupTables },
    { id: 'th', label: "3.'ler", value: r.breakdown.thirds },
    { id: 'ko', label: 'Eleme', value: r.breakdown.knockout },
    { id: 'fn', label: 'Final', value: r.breakdown.finals },
  ];
  const best = cats.reduce((a, b) => (b.value > a.value ? b : a), cats[0]);
  return (
    <div className={`card p-4 ${leader ? 'ring-2 ring-gold' : ''}`}>
      <button className="w-full flex items-center gap-3 text-left active:scale-[.99] transition" onClick={() => onOpenList(r.list.id)}>
        <span className={`font-display text-2xl w-7 ${leader ? 'text-gold-dark' : 'text-ink/30'}`}>{i + 1}</span>
        <Dot color={r.list.color} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-ink truncate">
            {r.list.name}{leader && <span className="ml-2 chip bg-gold/20 text-gold-dark">Lider</span>}
            {online && <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-bold text-pitch align-middle"><span className="inline-block h-2 w-2 rounded-full bg-pitch" />Online</span>}
          </p>
          <p className="text-xs text-ink/45 truncate">{r.list.ownerName}</p>
        </div>
        <span className="font-display text-2xl text-ink">{r.total}</span>
        <span className="text-ink/25">›</span>
      </button>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-2 py-0.5 text-xs font-semibold">🏆 {r.champion || '—'}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-2 py-0.5 text-xs font-semibold">⚽ {r.topScorer || '—'}</span>
        {r.total > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-pitch/10 text-pitch-dark px-2 py-0.5 text-xs font-semibold">
            🔥 En çok: {best.label} {best.value}p
          </span>
        )}
      </div>

      <div className="mt-2 grid grid-cols-5 gap-1.5 text-center">
        {cats.map((c) => (
          <button key={c.id} onClick={() => setCat(cat === c.id ? null : c.id)}
            className={`rounded-lg py-1.5 transition ${cat === c.id ? 'bg-ink text-white' : 'bg-black/[0.03] text-ink'}`}>
            <div className="font-display text-lg leading-none">{c.value}</div>
            <div className={`text-[10px] uppercase tracking-wide mt-0.5 ${cat === c.id ? 'text-white/70' : 'text-ink/45'}`}>{c.label}</div>
          </button>
        ))}
      </div>

      {cat && <CategoryDetail cat={cat} r={r} actual={actual} />}
    </div>
  );
}

function HitList({ hits }) {
  if (hits.length === 0) return <p className="mt-2 text-xs text-ink/45">Bu kategoride henüz bilinen maç yok.</p>;
  return (
    <div className="mt-2">
      <div className="text-[11px] font-bold uppercase tracking-wide text-ink/45 mb-1">Bildiğin maçlar ({hits.length})</div>
      <div className="max-h-52 overflow-y-auto divide-y divide-black/5 rounded-lg bg-white">
        {hits.map((h) => (
          <div key={h.key} className="flex items-center gap-2 px-2 py-1.5 text-xs">
            <span className="flex-1 min-w-0 truncate">{shortName(h.home)} - {shortName(h.away)}</span>
            <span className="text-ink/45 tabular-nums">{h.pred}</span>
            <span className={`chip ${h.pts === 5 ? 'bg-pitch/15 text-pitch-dark' : 'bg-gold/20 text-gold-dark'}`}>+{h.pts}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryDetail({ cat, r, actual }) {
  const s = r.stats;
  const tick = (b) => (b ? '✓' : '—');
  const data = {
    gm: [['Tam skor (5p)', s.exact], ['Doğru sonuç (3p)', s.correctResult], ['Puanlanan maç', s.playedScored]],
    gt: [['Üst tura çıkan (10p)', s.correctQualified], ['Doğru sıra (5p)', s.correctPositions], ['Tamamlanan grup', `${s.groupsFinal}/12`]],
    th: [['Doğru 3. takım (10p)', `${s.thirdsCorrect}/8`]],
    ko: [['Tam skor (5p)', s.koExact], ['Doğru sonuç (3p)', s.koResult], ['Son 32 doğru (20p)', s.koR32], ['Son 16 doğru (20p)', s.koR16], ['Çeyrek doğru (40p)', s.koQF], ['Yarı doğru (60p)', s.koSF]],
    fn: [['Şampiyon (80p)', tick(s.finalsHit.champion)], ['Finalist (50p)', tick(s.finalsHit.runnerUp)], ["3.'lük (30p)", tick(s.finalsHit.third)], ["4.'lük (20p)", tick(s.finalsHit.fourth)], ['Gol kralı (50p)', tick(s.finalsHit.topScorer)]],
  }[cat] || [];
  const total = { gm: r.breakdown.groupMatches, gt: r.breakdown.groupTables, th: r.breakdown.thirds, ko: r.breakdown.knockout, fn: r.breakdown.finals }[cat];
  const hits = cat === 'gm' ? groupHits(r.pred, actual)
    : cat === 'ko' ? koHits(r.pred, actual, r.bracket?.actual)
    : null;
  return (
    <div className="mt-2 rounded-xl bg-black/[0.02] border border-black/5 p-3">
      <div className="flex justify-between text-xs font-bold uppercase tracking-wide text-ink/50 mb-1">
        <span>Döküm</span><span>{total} puan</span>
      </div>
      <div className="divide-y divide-black/5">
        {data.map(([label, val], idx) => (
          <div key={idx} className="flex justify-between py-1 text-sm">
            <span className="text-ink/65">{label}</span>
            <span className="font-semibold tabular-nums">{val}</span>
          </div>
        ))}
      </div>
      {hits && <HitList hits={hits} />}
    </div>
  );
}

function Stats({ rows }) {
  const [openId, setOpenId] = useState(rows[0]?.list.id || null);
  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const open = openId === r.list.id;
        return (
          <div key={r.list.id} className="card overflow-hidden">
            <button className="w-full flex items-center gap-3 px-4 py-3" onClick={() => setOpenId(open ? null : r.list.id)}>
              <Dot color={r.list.color} />
              <span className="flex-1 text-left font-semibold truncate">{r.list.name}</span>
              <span className="font-display text-xl">{r.total}</span>
              <span className={`transition ${open ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {open && (
              <div className="border-t border-black/5 p-3 bg-black/[0.015]">
                <FullStats result={r} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
