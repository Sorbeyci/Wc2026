import { useMemo, useState, useRef, useLayoutEffect } from 'react';
import { useStore } from '../lib/store.jsx';
import { scoreUser, SCORING, allGroupsComplete, groupOrder, hasOrder } from '../lib/scoring.js';
import { GROUP_MATCHES, GROUP_NAMES } from '../data/tournament.js';
import { bestThirds } from '../data/bracket.js';
import { shortName } from '../data/flags.js';
import { SectionTitle, Dot, Empty, Avatar, Flag, CountUp, Segmented, BrandHeader } from '../components/ui.jsx';
import { shareLeaderboard } from '../lib/shareCard.js';
import FullStats from '../components/FullStats.jsx';

const SUB = [
  { id: 'board', label: 'Sıralama' },
  { id: 'stats', label: 'İstatistik' },
  { id: 'h2h', label: 'Karşılaştır' },
];
const VIEWS = [
  { id: 'detay', label: 'Detay' },
  { id: 'liste', label: 'Liste' },
  { id: 'tablo', label: 'Tablo' },
];
const SORTS = [
  { id: 'total', label: 'Puan' },
  { id: 'ko', label: 'Eleme' },
  { id: 'group', label: 'Grup' },
  { id: 'exact', label: 'Tam skor' },
  { id: 'thirds', label: "3.'ler" },
];
const sortVal = (r, id) => {
  const b = r.breakdown || {}, s = r.stats || {};
  if (id === 'ko') return b.knockout || 0;
  if (id === 'group') return (b.groupMatches || 0) + (b.groupTables || 0);
  if (id === 'exact') return (s.exact || 0) + (s.koExact || 0);
  if (id === 'thirds') return b.thirds || 0;
  return r.total || 0;
};
const sortLabel = (id) => SORTS.find((s) => s.id === id)?.label || 'Puan';

const MON = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const dkeyOf = (d) => { const m = (d || '').match(/^(\S+)\s+(\d+),\s*(\d+)$/); return m ? (+m[3]) * 10000 + (MON.indexOf(m[1]) + 1) * 100 + (+m[2]) : 0; };
const hasS = (s) => s && s.home !== '' && s.home != null && s.away !== '' && s.away != null;
function prevActualOf(actual) {
  const byNo = Object.fromEntries(GROUP_MATCHES.map((m) => [m.no, m]));
  const scoredNos = Object.keys(actual.groupMatches || {}).filter((no) => hasS(actual.groupMatches[no]));
  if (scoredNos.length === 0) return null;
  const latest = Math.max(...scoredNos.map((no) => dkeyOf(byNo[no]?.date)));
  if (!latest) return null;
  const gm = { ...actual.groupMatches };
  let removed = 0;
  for (const no of scoredNos) if (dkeyOf(byNo[no]?.date) === latest) { delete gm[no]; removed++; }
  return removed ? { ...actual, groupMatches: gm } : null;
}

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
const KO_ROUND_RANGES = [[73, 88], [89, 96], [97, 100], [101, 102], [103, 103], [104, 104]];
const koRoundLabel = (no) => (no <= 88 ? 'S32' : no <= 96 ? 'S16' : no <= 100 ? 'ÇF' : no <= 102 ? 'YF' : no === 103 ? '3.' : 'F');

// Knockout matchups where the pairing (two teams) is right — ignoring home/away
// and ignoring which slot they land in within that round (10p each).
function matchupHitsOf(P, A, r32Final) {
  const hits = [];
  const canon = (x, y) => [x, y].sort().join('|');
  for (const [from, to] of KO_ROUND_RANGES) {
    if (from === 73 && !r32Final) continue;
    const actualPairs = new Map();
    for (let no = from; no <= to; no++) {
      const a = A?.matches?.[no];
      if (a?.home && a?.away) actualPairs.set(canon(a.home, a.away), { no, home: a.home, away: a.away });
    }
    const seen = new Set();
    for (let no = from; no <= to; no++) {
      const p = P?.matches?.[no];
      if (!p?.home || !p?.away || p.home === p.away) continue;
      const key = canon(p.home, p.away);
      if (actualPairs.has(key) && !seen.has(key)) {
        seen.add(key);
        const ap = actualPairs.get(key);
        hits.push({ key: 'm' + ap.no, no: ap.no, home: ap.home, away: ap.away, pts: SCORING.knockout.matchup });
      }
    }
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

// FLIP animation: smoothly slides rows to new positions when ranking changes.
function useFlip() {
  const ref = useRef(null);
  const prev = useRef(new Map());
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const nodes = el.querySelectorAll('[data-flip-id]');
    const next = new Map();
    nodes.forEach((n) => next.set(n.getAttribute('data-flip-id'), n.getBoundingClientRect().top));
    nodes.forEach((n) => {
      const id = n.getAttribute('data-flip-id');
      const p = prev.current.get(id), c = next.get(id);
      if (p != null && c != null) {
        const dy = p - c;
        if (Math.abs(dy) > 1) {
          n.style.transition = 'none';
          n.style.transform = `translateY(${dy}px)`;
          requestAnimationFrame(() => {
            n.style.transition = 'transform .32s cubic-bezier(.4,0,.2,1)';
            n.style.transform = '';
          });
        }
      }
    });
    prev.current = next;
  });
  return ref;
}

export default function Board({ onOpenList }) {
  const { lists, actual, getPrediction, isOnline, onlineCount } = useStore();
  const [sub, setSub] = useState('board');
  const [view, setView] = useState('detay');
  const [proj, setProj] = useState(false);
  const [sortKey, setSortKey] = useState('total');
  const [onlyOnline, setOnlyOnline] = useState(false);
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const rows = useMemo(() => {
    const cur = lists
      .map((l) => {
        const pred = getPrediction(l.id);
        const res = scoreUser(pred, actual, { projection: proj });
        return { list: l, ...res, pred, champion: res.bracket?.pred?.champion || null, topScorer: pred.topScorer || '' };
      })
      .sort((a, b) => b.total - a.total);
    const prevA = prevActualOf(actual);
    const prevRank = {};
    if (prevA) {
      lists.map((l) => ({ id: l.id, total: scoreUser(getPrediction(l.id), prevA, { projection: proj }).total }))
        .sort((a, b) => b.total - a.total)
        .forEach((r, i) => { prevRank[r.id] = i + 1; });
    }
    return cur.map((r, i) => ({ ...r, rank: i + 1, delta: prevRank[r.list.id] ? prevRank[r.list.id] - (i + 1) : 0 }));
  }, [lists, actual, proj]);

  const q = query.trim().toLowerCase();
  const displayRows = useMemo(() => {
    let a = rows.slice();
    if (onlyOnline) a = a.filter((r) => isOnline?.(r.list));
    if (q) a = a.filter((r) => (r.list.name || '').toLowerCase().includes(q) || (r.list.ownerName || '').toLowerCase().includes(q));
    if (sortKey !== 'total') a = a.slice().sort((x, y) => sortVal(y, sortKey) - sortVal(x, sortKey));
    return a;
  }, [rows, onlyOnline, q, sortKey, isOnline]);

  return (
    <div className="space-y-5">
      <BrandHeader />
      <SectionTitle title="Sıralama" />

      {onlineCount > 0 && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-pitch -mt-1">
          <span className="inline-block h-2 w-2 rounded-full bg-pitch animate-pulse" />
          {onlineCount} kişi çevrimiçi
        </div>
      )}

      <Segmented items={SUB} value={sub} onChange={setSub} />

      {lists.length > 0 && sub === 'board' && (
        <button onClick={() => shareLeaderboard(rows, { title: 'Sıralama', subtitle: new Date().toLocaleDateString('tr-TR') })}
          className="w-full btn bg-ink text-white hover:opacity-90 text-sm">
          📲 Sıralamayı paylaş (story)
        </button>
      )}

      <div key={sub} className="fade-in">
      {lists.length === 0 ? (
        <Empty title="Henüz liste yok">Tabloyu görmek için liste ve tahmin ekle.</Empty>
      ) : sub === 'h2h' ? (
        <H2H rows={rows} />
      ) : sub === 'board' ? (
        <div className="space-y-5">
          <Podium rows={rows} onOpenList={onOpenList} />
          <button onClick={() => setProj(!proj)}
            className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold border transition ${
              proj ? 'bg-gold text-ink border-gold-dark shadow-sm' : 'bg-gold/15 text-gold-dark border-gold/40 hover:bg-gold/25'
            }`}>
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${proj ? 'bg-pitch animate-pulse' : 'bg-gold-dark'}`} />
            {proj ? 'Geçici puanlar AÇIK — kapatmak için dokun' : '⚡ Geçici puanları göster (canlı projeksiyon)'}
          </button>
          <div className="flex items-center justify-between gap-2">
            <button onClick={() => setFiltersOpen((v) => !v)} title="Sırala / filtrele" aria-label="Sırala ve filtrele"
              className={`h-9 w-9 grid place-items-center rounded-lg transition ${filtersOpen || sortKey !== 'total' || onlyOnline || query ? 'bg-ink text-white' : 'bg-black/5 text-ink/60'}`}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6" /><line x1="7" y1="12" x2="17" y2="12" /><line x1="10" y1="18" x2="14" y2="18" /></svg>
            </button>
            <Segmented items={VIEWS} value={view} onChange={setView} className="flex-1 max-w-[240px]" />
          </div>
          {proj && (
            <div className="rounded-xl bg-gold/10 border border-gold/30 px-3 py-2 text-xs text-gold-dark">
              <b>Geçici / projeksiyon:</b> şu anki sonuçlara göre tahmini puanlar. Gruplar
              ve eşleşmeler kesinleşince değişebilir — resmî sıralama bu değildir.
            </div>
          )}

          {filtersOpen && (
            <div className="space-y-2 fade-in">
              <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5">
                {SORTS.map((s) => (
                  <button key={s.id} onClick={() => setSortKey(s.id)}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${sortKey === s.id ? 'bg-ink text-white' : 'bg-black/5 text-ink/60'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="İsim ara…"
                  className="flex-1 rounded-lg bg-black/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pitch/30" />
                <button onClick={() => setOnlyOnline((v) => !v)}
                  className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${onlyOnline ? 'bg-pitch text-white' : 'bg-black/5 text-ink/60'}`}>
                  ● Online
                </button>
              </div>
            </div>
          )}
          {sortKey !== 'total' && (
            <p className="text-[11px] text-ink/45 px-1">
              "{sortLabel(sortKey)}" puanına göre sıralandı{onlyOnline ? ' · sadece online' : ''}{q ? ` · "${query}"` : ''}.
            </p>
          )}

          {displayRows.length === 0 ? (
            <p className="text-sm text-ink/45 text-center py-6">Eşleşen kişi yok.</p>
          ) : view === 'detay' ? (
            <Leaderboard rows={displayRows} onOpenList={onOpenList} isOnline={isOnline} actual={actual} proj={proj} metric={sortKey} />
          ) : view === 'liste' ? (
            <CompactList rows={displayRows} onOpenList={onOpenList} isOnline={isOnline} metric={sortKey} />
          ) : (
            <GridView rows={displayRows} onOpenList={onOpenList} isOnline={isOnline} metric={sortKey} />
          )}
        </div>
      ) : (
        <Stats rows={rows} />
      )}
      </div>
    </div>
  );
}

function Delta({ d }) {
  if (!d) return null;
  const up = d > 0;
  return (
    <span className={`inline-flex items-center text-[11px] font-bold ${up ? 'text-pitch' : 'text-red-500'}`}>
      {up ? '▲' : '▼'}{Math.abs(d)}
    </span>
  );
}

function Podium({ rows, onOpenList }) {
  const top = rows.slice(0, 3).filter((r) => r.total > 0);
  if (top.length < 3) return null;
  const medal = ['ring-gold bg-gold/10', 'ring-black/15 bg-black/[0.03]', 'ring-[#cd7f32]/40 bg-[#cd7f32]/10'];
  const order = [1, 0, 2]; // 2nd, 1st, 3rd visually
  return (
    <div className="grid grid-cols-3 gap-2.5 items-end pt-1">
      {order.map((idx, pos) => {
        const r = top[idx];
        const big = idx === 0;
        return (
          <button key={r.list.id} onClick={() => onOpenList(r.list.id)}
            className={`card p-3 text-center ring-2 ${medal[idx]} ${big ? '-translate-y-1' : ''}`}>
            <div className="flex justify-center">
              <Avatar name={r.list.ownerName || r.list.name} color={r.list.color} src={r.list.ownerPhoto} size={big ? 48 : 40} />
            </div>
            <div className="mt-1 text-lg">{['🥇', '🥈', '🥉'][idx]}</div>
            <p className="font-semibold text-xs truncate">{r.list.name}</p>
            <p className="font-display text-2xl text-ink leading-none"><CountUp value={r.total} /></p>
          </button>
        );
      })}
    </div>
  );
}

const H2H_DETAIL = [
  ['Grup tam skor', 'exact'], ['Grup doğru sonuç', 'correctResult'],
  ['Üst tura çıkan', 'correctQualified'], ['Doğru grup sırası', 'correctPositions'],
  ['Doğru 3. takım', 'thirdsCorrect'],
  ['Doğru eşleşme', 'koMatchupHits'], ['Eleme tam skor', 'koExact'], ['Eleme doğru sonuç', 'koResult'],
  ['Son 32 kazanan', 'koR32'], ['Son 16 kazanan', 'koR16'], ['Çeyrek kazanan', 'koQF'], ['Yarı kazanan', 'koSF'],
  ['Final isabet', 'finalsHits'],
];

function H2H({ rows }) {
  const [a, setA] = useState(rows[0]?.list.id || '');
  const [b, setB] = useState(rows[1]?.list.id || rows[0]?.list.id || '');
  const ra = rows.find((r) => r.list.id === a);
  const rb = rows.find((r) => r.list.id === b);
  const cats = [
    ['Toplam', 'total'], ['Maçlar', 'groupMatches'], ['Gruplar', 'groupTables'],
    ["3.'ler", 'thirds'], ['Eleme', 'knockout'], ['Final', 'finals'],
  ];
  const val = (r, k) => (k === 'total' ? r?.total : r?.breakdown?.[k]) || 0;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <select className="field" value={a} onChange={(e) => setA(e.target.value)}>
          {rows.map((r) => <option key={r.list.id} value={r.list.id}>{r.list.name}</option>)}
        </select>
        <select className="field" value={b} onChange={(e) => setB(e.target.value)}>
          {rows.map((r) => <option key={r.list.id} value={r.list.id}>{r.list.name}</option>)}
        </select>
      </div>
      {ra && rb && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar name={ra.list.ownerName || ra.list.name} color={ra.list.color} src={ra.list.ownerPhoto} size={36} />
              <span className="font-semibold text-sm truncate">{ra.list.name}</span>
            </div>
            <span className="text-xs text-ink/40 px-2">vs</span>
            <div className="flex items-center gap-2 min-w-0 justify-end">
              <span className="font-semibold text-sm truncate text-right">{rb.list.name}</span>
              <Avatar name={rb.list.ownerName || rb.list.name} color={rb.list.color} src={rb.list.ownerPhoto} size={36} />
            </div>
          </div>
          {cats.map(([label, k]) => {
            const va = val(ra, k), vb = val(rb, k);
            const max = Math.max(va, vb, 1);
            return (
              <div key={k}>
                <div className="flex items-center justify-between text-xs font-semibold mb-0.5">
                  <span className={va >= vb ? 'text-pitch' : 'text-ink/50'}>{va}</span>
                  <span className="text-ink/45 uppercase tracking-wide">{label}</span>
                  <span className={vb >= va ? 'text-pitch' : 'text-ink/50'}>{vb}</span>
                </div>
                <div className="flex gap-1 h-2">
                  <div className="flex-1 flex justify-end"><div className="bg-pitch/70 rounded-l" style={{ width: `${(va / max) * 100}%` }} /></div>
                  <div className="flex-1"><div className="bg-ink/60 rounded-r h-full" style={{ width: `${(vb / max) * 100}%` }} /></div>
                </div>
              </div>
            );
          })}
          <div className="rounded-xl bg-black/[0.02] border border-black/5 p-2">
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink/45 mb-1 text-center">Detaylı istatistik</div>
            {H2H_DETAIL.map(([label, k]) => {
              const av = ra.stats?.[k] || 0, bv = rb.stats?.[k] || 0;
              if (!av && !bv) return null;
              return (
                <div key={k} className="flex items-center gap-2 py-0.5 text-xs">
                  <span className={`w-8 text-right font-semibold tabular-nums ${av > bv ? 'text-pitch' : av < bv ? 'text-ink/40' : 'text-ink/60'}`}>{av}</span>
                  <span className="flex-1 text-center text-ink/50 truncate">{label}</span>
                  <span className={`w-8 text-left font-semibold tabular-nums ${bv > av ? 'text-pitch' : bv < av ? 'text-ink/40' : 'text-ink/60'}`}>{bv}</span>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
            <div className="rounded-lg bg-black/[0.03] p-2">🏆 {ra.champion || '—'}<br />⚽ {ra.topScorer || '—'}</div>
            <div className="rounded-lg bg-black/[0.03] p-2 text-right">{rb.champion || '—'} 🏆<br />{rb.topScorer || '—'} ⚽</div>
          </div>
        </div>
      )}
      {ra && <H2HFull r={ra} />}
      {rb && rb.list.id !== ra?.list.id && <H2HFull r={rb} />}
    </div>
  );
}

function H2HFull({ r }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card overflow-hidden">
      <button className="w-full flex items-center gap-2 px-4 py-3" onClick={() => setOpen((o) => !o)}>
        <Dot color={r.list.color} />
        <span className="flex-1 text-left font-semibold truncate">{r.list.name} · detaylı istatistik</span>
        <span className="font-display text-lg">{r.total}</span>
        <span className={`transition ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && <div className="border-t border-black/5 p-3 bg-black/[0.015]"><FullStats result={r} /></div>}
    </div>
  );
}

function CompactList({ rows, onOpenList, isOnline, metric }) {
  const flipRef = useFlip();
  const isTotal = !metric || metric === 'total';
  return (
    <div className="card divide-y divide-black/5" ref={flipRef}>
      {rows.map((r, i) => {
        const leader = i === 0 && r.total > 0 && isTotal;
        return (
          <button key={r.list.id} data-flip-id={r.list.id} onClick={() => onOpenList(r.list.id)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left active:bg-black/[0.02] bg-[var(--surface)]">
            <span className={`font-display text-lg w-6 ${leader ? 'text-gold-dark' : 'text-ink/30'}`}>{i + 1}</span>
            <Avatar name={r.list.ownerName || r.list.name} color={r.list.color} src={r.list.ownerPhoto} size={28} />
            <span className="flex-1 min-w-0 font-semibold text-sm truncate">
              {r.list.name}
              {isOnline?.(r.list) && <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-pitch align-middle" />}
            </span>
            <Delta d={r.delta} />
            <span className="font-display text-lg text-ink tabular-nums"><CountUp value={sortVal(r, metric || 'total')} /></span>
          </button>
        );
      })}
    </div>
  );
}

function GridView({ rows, onOpenList, isOnline, metric }) {
  const isTotal = !metric || metric === 'total';
  return (
    <div className="grid grid-cols-2 gap-2">
      {rows.map((r, i) => {
        const leader = i === 0 && r.total > 0 && isTotal;
        return (
          <button key={r.list.id} onClick={() => onOpenList(r.list.id)}
            className={`card p-3 text-left active:scale-[.99] transition ${leader ? 'ring-2 ring-gold' : ''}`}>
            <div className="flex items-center gap-1.5">
              <span className={`font-display text-base ${leader ? 'text-gold-dark' : 'text-ink/30'}`}>{i + 1}</span>
              <Avatar name={r.list.ownerName || r.list.name} color={r.list.color} src={r.list.ownerPhoto} size={24} />
              {isOnline?.(r.list) && <span className="h-2 w-2 rounded-full bg-pitch" />}
            </div>
            <p className="mt-1 font-semibold text-sm leading-tight truncate">{r.list.name}</p>
            <p className="font-display text-3xl text-ink leading-none mt-1"><CountUp value={sortVal(r, metric || 'total')} /></p>
            <p className="mt-1 text-[11px] text-ink/45 truncate">{isTotal ? `🏆 ${r.champion || '—'}` : sortLabel(metric)}</p>
          </button>
        );
      })}
    </div>
  );
}

function Leaderboard({ rows, onOpenList, isOnline, actual, proj, metric }) {
  const flipRef = useFlip();
  return (
    <div className="space-y-2" ref={flipRef}>
      <p className="text-xs text-ink/45 px-1">
        Adına dokunarak tahminlerini gör; kategori kutucuklarına dokunarak nereden kaç puan aldığını ve hangi maçları bildiğini aç.
      </p>
      {rows.map((r, i) => (
        <div key={r.list.id} data-flip-id={r.list.id}>
          <LbRow r={r} i={i} onOpenList={onOpenList} online={isOnline?.(r.list)} actual={actual} proj={proj} metric={metric} />
        </div>
      ))}
    </div>
  );
}

function LbRow({ r, i, onOpenList, online, actual, proj, metric }) {
  const [cat, setCat] = useState(null);
  const isTotal = !metric || metric === 'total';
  const leader = i === 0 && r.total > 0 && isTotal;
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
        <Avatar name={r.list.ownerName || r.list.name} color={r.list.color} src={r.list.ownerPhoto} size={38} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-ink truncate">
            {r.list.name}{leader && <span className="ml-2 chip bg-gold/20 text-gold-dark">Lider</span>}
            {online && <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-bold text-pitch align-middle"><span className="inline-block h-2 w-2 rounded-full bg-pitch" />Online</span>}
          </p>
          <p className="text-xs text-ink/45 truncate flex items-center gap-1.5">{r.list.ownerName}<Delta d={r.delta} /></p>
        </div>
        <div className="text-right leading-none">
          <span className="font-display text-2xl text-ink"><CountUp value={sortVal(r, metric || 'total')} /></span>
          {!isTotal && <div className="text-[9px] uppercase tracking-wide text-ink/40 mt-0.5">{sortLabel(metric)}</div>}
        </div>
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

      {cat && <CategoryDetail cat={cat} r={r} actual={actual} proj={proj} />}
    </div>
  );
}

function MatchupList({ hits }) {
  if (!hits || hits.length === 0) return null;
  return (
    <div className="mt-2">
      <div className="text-[11px] font-bold uppercase tracking-wide text-ink/45 mb-1">Doğru eşleşmeler ({hits.length})</div>
      <div className="max-h-52 overflow-y-auto divide-y divide-black/5 rounded-lg bg-white">
        {hits.map((h) => (
          <div key={h.key} className="flex items-center gap-2 px-2 py-1.5 text-xs">
            <span className="w-8 shrink-0 text-ink/40 font-semibold">{koRoundLabel(h.no)}</span>
            <span className="flex-1 min-w-0 truncate">{shortName(h.home)} - {shortName(h.away)}</span>
            <span className="chip bg-pitch/15 text-pitch-dark">+{h.pts}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GroupBreakdown({ pred, actual, proj }) {
  const groups = [];
  for (const g of GROUP_NAMES) {
    const started = GROUP_MATCHES.some((m) => m.group === g && hasS(actual.groupMatches?.[m.no]));
    const ok = proj ? started : (hasOrder(actual, g) && hasOrder(pred, g));
    if (!ok) continue;
    const P = groupOrder(pred, g), A = groupOrder(actual, g);
    const top2 = new Set(A.slice(0, 2));
    groups.push({ g, teams: P.map((t, idx) => ({ team: t, q: idx < 2 && top2.has(t), pos: A[idx] === t })) });
  }
  if (!groups.length) return <p className="mt-2 text-xs text-ink/45">Henüz puanlanan grup yok.</p>;
  return (
    <div className="mt-2 space-y-2">
      {groups.map(({ g, teams }) => (
        <div key={g} className="rounded-lg bg-white border border-black/5 p-2">
          <div className="text-[11px] font-bold text-ink/45 mb-1">{g} Grubu</div>
          {teams.map((t, i) => (
            <div key={i} className="flex items-center gap-2 py-0.5 text-xs">
              <span className="w-4 text-ink/40">{i + 1}</span>
              <span className="flex-1 min-w-0 truncate">{shortName(t.team)}</span>
              {t.q && <span className="chip bg-pitch/15 text-pitch-dark">üst tur +{SCORING.groupTable.qualified}</span>}
              {t.pos && <span className="chip bg-gold/20 text-gold-dark">sıra +{SCORING.groupTable.position}</span>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ThirdsBreakdown({ pred, actual, proj }) {
  if (!proj && !allGroupsComplete(actual)) return <p className="mt-2 text-xs text-ink/45">Tüm gruplar bitince hesaplanır.</p>;
  const aSet = new Set(bestThirds(actual).teams.filter(Boolean));
  const p = bestThirds(pred).top8 || [];
  return (
    <div className="mt-2 rounded-lg bg-white border border-black/5 p-2 space-y-0.5">
      {p.map((t) => (
        <div key={t.group} className="flex items-center gap-2 py-0.5 text-xs">
          <span className="w-6 text-ink/40">{t.group}</span>
          <span className="flex-1 min-w-0 truncate">{shortName(t.team)}</span>
          {aSet.has(t.team)
            ? <span className="chip bg-pitch/15 text-pitch-dark">+{SCORING.thirdPlace.advance}</span>
            : <span className="chip bg-black/5 text-ink/40">—</span>}
        </div>
      ))}
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

function CategoryDetail({ cat, r, actual, proj }) {
  const s = r.stats;
  const tick = (b) => (b ? '✓' : '—');
  const data = {
    gm: [['Tam skor (5p)', s.exact], ['Doğru sonuç (3p)', s.correctResult], ['Puanlanan maç', s.playedScored]],
    gt: [['Üst tura çıkan (10p)', s.correctQualified], ['Doğru sıra (5p)', s.correctPositions], ['Tamamlanan grup', `${s.groupsFinal}/12`]],
    th: [['Doğru 3. takım (10p)', `${s.thirdsCorrect}/8`]],
    ko: [['Doğru eşleşme (her tur)', s.koMatchupHits], ['Tam skor (5p)', s.koExact], ['Doğru sonuç (3p)', s.koResult], ['Son 32 doğru (20p)', s.koR32], ['Son 16 doğru (20p)', s.koR16], ['Çeyrek doğru (40p)', s.koQF], ['Yarı doğru (60p)', s.koSF]],
    fn: [['Şampiyon (80p)', tick(s.finalsHit.champion)], ['Finalist (50p)', tick(s.finalsHit.runnerUp)], ["3.'lük (30p)", tick(s.finalsHit.third)], ["4.'lük (20p)", tick(s.finalsHit.fourth)], ['Gol kralı (50p)', tick(s.finalsHit.topScorer)]],
  }[cat] || [];
  const total = { gm: r.breakdown.groupMatches, gt: r.breakdown.groupTables, th: r.breakdown.thirds, ko: r.breakdown.knockout, fn: r.breakdown.finals }[cat];
  const hits = cat === 'gm' ? groupHits(r.pred, actual)
    : cat === 'ko' ? koHits(r.pred, actual, r.bracket?.actual)
    : null;
  const mhits = cat === 'ko' ? matchupHitsOf(r.bracket?.pred, r.bracket?.actual, allGroupsComplete(actual)) : null;
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
      {cat === 'gt' && <GroupBreakdown pred={r.pred} actual={actual} proj={proj} />}
      {cat === 'th' && <ThirdsBreakdown pred={r.pred} actual={actual} proj={proj} />}
      {mhits && <MatchupList hits={mhits} />}
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
