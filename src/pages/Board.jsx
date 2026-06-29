import { useMemo, useState, useRef, useLayoutEffect, useEffect } from 'react';
import { useStore } from '../lib/store.jsx';
import { scoreUser, SCORING, allGroupsComplete, groupOrder, hasOrder, advancingTeams } from '../lib/scoring.js';
import { GROUP_MATCHES, GROUP_NAMES } from '../data/tournament.js';
import { bestThirds } from '../data/bracket.js';
import { shortName } from '../data/flags.js';
import { SectionTitle, Dot, Empty, Avatar, Flag, CountUp, Segmented, BrandHeader, ScrollTopFab } from '../components/ui.jsx';
import { shareLeaderboard } from '../lib/shareCard.js';
import { topAchievement } from '../lib/achievements.js';
import FullStats from '../components/FullStats.jsx';

const SUB = [
  { id: 'board', label: 'Sıralama' },
  { id: 'grafik', label: 'Grafik' },
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
    // Pozisyonları KAPSAYICIYA göre ölç. Böylece listenin üstündeki içerik
    // (ör. "X kişi çevrimiçi" bloğu) gelip gidince tüm liste topluca kaysa bile
    // FLIP bunu "sıra değişti" sanmaz; yalnız gerçek yeniden sıralamada animasyon olur.
    const base = el.getBoundingClientRect().top;
    const nodes = el.querySelectorAll('[data-flip-id]');
    const next = new Map();
    nodes.forEach((n) => next.set(n.getAttribute('data-flip-id'), n.getBoundingClientRect().top - base));
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

// Görünüm durumu sayfadan ayrılınca da hatırlansın (gezmeye kaldığı yerden devam).
const boardMem = { sub: 'board', view: 'detay', proj: false, sortKey: 'total', onlyOnline: false, query: '', filtersOpen: false, showOnline: false };

// Bir kullanıcının Son 32'ye (R32) soktuğu takımlar: tahmin bracketindeki 73-88
// ev/deplasman takımları ile gerçek R32 takımlarının kesişimi.
function r32Sets(res) {
  const A = res.bracket?.actual, P = res.bracket?.pred;
  const actualR32 = new Set();
  for (let no = 73; no <= 88; no++) { const m = A?.matches?.[no]; if (m?.home) actualR32.add(m.home); if (m?.away) actualR32.add(m.away); }
  const seen = new Set(), hit = [], miss = [];
  for (let no = 73; no <= 88; no++) {
    const m = P?.matches?.[no];
    for (const t of [m?.home, m?.away]) {
      if (!t || seen.has(t)) continue;
      seen.add(t);
      (actualR32.has(t) ? hit : miss).push(t);
    }
  }
  return { n: hit.length, total: actualR32.size, hit, miss };
}

export default function Board({ onOpenList, goHome }) {
  const { lists, actual, getPrediction, isOnline, onlineCount, onlineUsers, user } = useStore();
  const [sub, setSub] = useState(boardMem.sub);
  const [view, setView] = useState(boardMem.view);
  const [proj, setProj] = useState(boardMem.proj);
  const [sortKey, setSortKey] = useState(boardMem.sortKey);
  const [onlyOnline, setOnlyOnline] = useState(boardMem.onlyOnline);
  const [query, setQuery] = useState(boardMem.query);
  const [filtersOpen, setFiltersOpen] = useState(boardMem.filtersOpen);
  const [showOnline, setShowOnline] = useState(boardMem.showOnline);
  useEffect(() => {
    Object.assign(boardMem, { sub, view, proj, sortKey, onlyOnline, query, filtersOpen, showOnline });
  }, [sub, view, proj, sortKey, onlyOnline, query, filtersOpen, showOnline]);

  const rows = useMemo(() => {
    const cur = lists
      .map((l) => {
        const pred = getPrediction(l.id);
        const res = scoreUser(pred, actual, { projection: proj });
        return { list: l, ...res, pred, r32: r32Sets(res), champion: res.bracket?.pred?.champion || null, topScorer: pred.topScorer || '' };
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

  // Karşılaştır için resmi (projeksiyonsuz) ve resmi-olmayan (projeksiyon) satırlar.
  const mkH2H = (projection) => lists
    .map((l) => {
      const pred = getPrediction(l.id);
      const res = scoreUser(pred, actual, { projection });
      return { list: l, ...res, pred, champion: res.bracket?.pred?.champion || null, topScorer: pred.topScorer || '' };
    })
    .sort((a, b) => b.total - a.total);
  const h2hOfficial = useMemo(() => mkH2H(false), [lists, actual]);
  const h2hProj = useMemo(() => mkH2H(true), [lists, actual]);

  return (
    <div className="space-y-5">
      <BrandHeader onClick={goHome} />
      <SectionTitle title="Sıralama" />

      {onlineCount > 0 && (
        <div className="-mt-1">
          <button onClick={() => setShowOnline((v) => !v)} className="flex items-center gap-1.5 text-xs font-semibold text-pitch">
            <span className="inline-block h-2 w-2 rounded-full bg-pitch animate-pulse" />
            {onlineCount} kişi çevrimiçi
            <span className={`text-ink/30 transition ${showOnline ? 'rotate-180' : ''}`}>▾</span>
          </button>
          {showOnline && (
            <div className="mt-2 card p-3 flex flex-wrap gap-1.5 fade-in">
              {onlineUsers.length === 0 ? (
                <span className="text-xs text-ink/45">Şu an kimse görünmüyor.</span>
              ) : onlineUsers.map((u) => (
                <span key={u.uid} className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] pl-1 pr-2.5 py-0.5 text-xs font-semibold">
                  <Avatar name={u.name} size={20} />
                  <span className="truncate max-w-[120px]">{u.name}</span>
                  {u.me && <span className="text-pitch-dark">· sen</span>}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <Segmented items={SUB} value={sub} onChange={setSub} />

      {lists.length > 0 && sub === 'board' && (
        <div className="flex justify-end -mt-2 -mb-1">
          <button onClick={() => shareLeaderboard(rows, { title: 'Sıralama', subtitle: new Date().toLocaleDateString('tr-TR') })}
            title="Sıralamayı paylaş (story)" aria-label="Sıralamayı paylaş (story)"
            className="inline-flex items-center gap-1.5 rounded-full bg-ink text-white px-3 h-8 text-xs font-semibold active:scale-95 hover:opacity-90">
            📲 Paylaş
          </button>
        </div>
      )}

      <div key={sub} className="fade-in">
      {lists.length === 0 ? (
        <Empty title="Henüz liste yok">Tabloyu görmek için liste ve tahmin ekle.</Empty>
      ) : sub === 'h2h' ? (
        <H2H rows={h2hOfficial} projRows={h2hProj} actual={actual} />
      ) : sub === 'grafik' ? (
        <RankRace lists={lists} actual={actual} getPrediction={getPrediction} user={user} />
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
      <ScrollTopFab />
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

function H2H({ rows, projRows, actual }) {
  const [unofficial, setUnofficial] = useState(false);
  const [a, setA] = useState(rows[0]?.list.id || '');
  const [b, setB] = useState(rows[1]?.list.id || rows[0]?.list.id || '');
  const src = unofficial ? projRows : rows;
  const ra = src.find((r) => r.list.id === a);
  const rb = src.find((r) => r.list.id === b);
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

      <button onClick={() => setUnofficial((v) => !v)}
        className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold border transition ${
          unofficial ? 'bg-gold text-ink border-gold-dark shadow-sm' : 'bg-gold/15 text-gold-dark border-gold/40 hover:bg-gold/25'
        }`}>
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${unofficial ? 'bg-pitch animate-pulse' : 'bg-gold-dark'}`} />
        {unofficial ? 'Resmi olmayan (projeksiyon) sonuçlar AÇIK' : '⚡ Resmi olmayan sonuçları da göster'}
      </button>
      {unofficial && (
        <div className="rounded-xl bg-gold/10 border border-gold/30 px-3 py-2 text-xs text-gold-dark">
          Şu anki canlı/yarım sonuçlara göre tahmini puanlar. Gruplar ve eşleşmeler kesinleşince değişebilir.
        </div>
      )}

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
          <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
            <div className="rounded-lg bg-black/[0.03] p-2">🏆 {ra.champion || '—'}<br />⚽ {ra.topScorer || '—'}</div>
            <div className="rounded-lg bg-black/[0.03] p-2 text-right">{rb.champion || '—'} 🏆<br />{rb.topScorer || '—'} ⚽</div>
          </div>
        </div>
      )}
      {ra && rb && <H2HDetail ra={ra} rb={rb} actual={actual} unofficial={unofficial} />}
    </div>
  );
}

const H2H_SECTIONS = [
  { title: 'Grup maçları', pts: 'groupMatchPoints', detail: 'group', rows: [['Tam skor', 'exact'], ['Doğru sonuç', 'correctResult'], ['Puanlanan maç', 'playedScored']] },
  { title: 'Grup sıralamaları', pts: 'groupTablePoints', rows: [['Üst tura çıkan', 'correctQualified'], ['Doğru sıra', 'correctPositions'], ['Tamamlanan grup', 'groupsFinal']] },
  { title: "En iyi 3.'ler", pts: 'thirdsPoints', rows: [['Doğru 3. takım', 'thirdsCorrect']] },
  { title: 'Eleme turu', pts: 'knockoutPoints', detail: 'ko', rows: [['Doğru eşleşme', 'koMatchupHits'], ['Tam skor', 'koExact'], ['Doğru sonuç', 'koResult'], ['Son 32 kazanan', 'koR32'], ['Son 16 kazanan', 'koR16'], ['Çeyrek kazanan', 'koQF'], ['Yarı kazanan', 'koSF'], ['Sonuçlanan maç', 'koScored']] },
  { title: 'Final & podyum', pts: 'finalsPoints', rows: [['Doğru tahmin (/5)', 'finalsHits']] },
];

function CmpRow({ label, a, b, strong }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className={`w-10 text-right tabular-nums ${strong ? 'font-bold' : 'font-semibold'} ${a > b ? 'text-pitch' : a < b ? 'text-ink/35' : 'text-ink/60'}`}>{a}</span>
      <span className={`flex-1 text-center truncate ${strong ? 'text-ink/70 font-semibold' : 'text-ink/50'}`}>{label}</span>
      <span className={`w-10 text-left tabular-nums ${strong ? 'font-bold' : 'font-semibold'} ${b > a ? 'text-pitch' : b < a ? 'text-ink/35' : 'text-ink/60'}`}>{b}</span>
    </div>
  );
}

// Bir kişinin eleme turundaki puan getiren isabetleri (eşleşme +10, tam skor +5, sonuç +3).
function koDetail(r, actual) {
  const mh = matchupHitsOf(r.bracket?.pred, r.bracket?.actual, allGroupsComplete(actual)) || [];
  const kh = koHits(r.pred, actual, r.bracket?.actual) || [];
  return [
    ...mh.map((h) => ({ ...h, round: koRoundLabel(h.no) })),
    ...kh.map((h) => ({ ...h, round: koRoundLabel(h.no) })),
  ].sort((x, y) => x.no - y.no);
}

function MiniHits({ hits }) {
  if (!hits || !hits.length) return <div className="text-[11px] text-ink/35 py-2 text-center">—</div>;
  return (
    <div className="rounded-lg bg-white border border-black/5 divide-y divide-black/5 max-h-44 overflow-auto">
      {hits.map((h) => (
        <div key={h.key} className="flex items-center gap-1 px-1.5 py-1 text-[11px]">
          {h.round && <span className="w-7 shrink-0 text-ink/40 font-semibold">{h.round}</span>}
          <span className="flex-1 min-w-0 truncate">{shortName(h.home)}-{shortName(h.away)}</span>
          {h.pred && <span className="text-ink/40 tabular-nums">{h.pred}</span>}
          <span className={`chip ${h.pts >= 10 ? 'bg-gold/20 text-gold-dark' : h.pts === 5 ? 'bg-pitch/15 text-pitch-dark' : 'bg-black/5 text-ink/60'}`}>+{h.pts}</span>
        </div>
      ))}
    </div>
  );
}

function TwoColHits({ nameA, nameB, aHits, bHits }) {
  if ((!aHits || !aHits.length) && (!bHits || !bHits.length))
    return <p className="mt-2 text-[11px] text-ink/40 text-center">Henüz puan getiren maç yok.</p>;
  return (
    <div className="mt-2">
      <div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-wide text-ink/45 mb-1">
        <span className="truncate">{nameA}</span><span className="truncate text-right">{nameB}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <MiniHits hits={aHits} /><MiniHits hits={bHits} />
      </div>
    </div>
  );
}

function H2HDetail({ ra, rb, actual, unofficial }) {
  const sa = ra.stats || {}, sb = rb.stats || {};
  const [open, setOpen] = useState(null);
  const nameA = ra.list.name, nameB = rb.list.name;
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-bold uppercase tracking-wide text-ink/45 text-center pt-1">
        Kategori kategori karşılaştırma{unofficial ? ' · resmi değil' : ''}
      </div>
      {H2H_SECTIONS.map((sec) => {
        const ex = open === sec.title;
        return (
          <div key={sec.title} className="card p-3 text-xs">
            <button className="w-full" onClick={() => setOpen(ex ? null : sec.title)}>
              <CmpRow label={sec.title.toUpperCase()} a={sa[sec.pts] || 0} b={sb[sec.pts] || 0} strong />
              <div className="text-center text-[10px] text-ink/40 mt-1">{ex ? 'detayları gizle ▴' : 'detay ▾'}</div>
            </button>
            {ex && (
              <div className="mt-1 pt-1.5 border-t border-black/5">
                {sec.rows.map(([label, k]) => <CmpRow key={k} label={label} a={sa[k] || 0} b={sb[k] || 0} />)}
                {sec.detail === 'group' && (
                  <TwoColHits nameA={nameA} nameB={nameB} aHits={groupHits(ra.pred, actual)} bHits={groupHits(rb.pred, actual)} />
                )}
                {sec.detail === 'ko' && (
                  <TwoColHits nameA={nameA} nameB={nameB} aHits={koDetail(ra, actual)} bHits={koDetail(rb, actual)} />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CompactList({ rows, onOpenList, isOnline, metric }) {
  const { quizWinsByUid = {}, activeDaysByUid = {}, earnedBadgesByUid = {} } = useStore();
  const flipRef = useFlip();
  const isTotal = !metric || metric === 'total';
  return (
    <div className="card divide-y divide-black/5" ref={flipRef}>
      {rows.map((r, i) => {
        const leader = i === 0 && r.total > 0 && isTotal;
        const top = topAchievement(r, {
          rank: i + 1, quizWins: quizWinsByUid[r.list.ownerUid] || 0,
          activeDays: activeDaysByUid[r.list.ownerUid] || 0, online: isOnline?.(r.list),
          latched: earnedBadgesByUid[r.list.ownerUid] || [],
        });
        return (
          <button key={r.list.id} data-flip-id={r.list.id} onClick={() => onOpenList(r.list.id)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left active:bg-black/[0.02] bg-[var(--surface)]">
            <span className={`font-display text-lg w-6 ${leader ? 'text-gold-dark' : 'text-ink/30'}`}>{i + 1}</span>
            <Avatar name={r.list.ownerName || r.list.name} color={r.list.color} src={r.list.ownerPhoto} size={28} />
            <span className="flex-1 min-w-0 font-semibold text-sm truncate">
              {top && <span title={top.title} className="mr-1">{top.icon}</span>}
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
  const { quizWinsByUid = {}, activeDaysByUid = {}, earnedBadgesByUid = {} } = useStore();
  const [cat, setCat] = useState(null);
  const isTotal = !metric || metric === 'total';
  const leader = i === 0 && r.total > 0 && isTotal;
  const topBadge = topAchievement(r, {
    rank: i + 1, quizWins: quizWinsByUid[r.list.ownerUid] || 0,
    activeDays: activeDaysByUid[r.list.ownerUid] || 0, online,
    latched: earnedBadgesByUid[r.list.ownerUid] || [],
  });
  const cats = [
    { id: 'gm', label: 'Maçlar', value: r.breakdown.groupMatches },
    { id: 'gt', label: 'Gruplar', value: r.breakdown.groupTables },
    { id: 'th', label: "3.'ler", value: r.breakdown.thirds },
    { id: 'ko', label: 'Eleme', value: r.breakdown.knockout },
    { id: 'fn', label: 'Final', value: r.breakdown.finals },
  ];
  const best = cats.reduce((a, b) => (b.value > a.value ? b : a), cats[0]);
  // Görünen ızgara: Eleme ile Final arasına "Son 32'ye soktuğun takım sayısı" eklenir.
  const gridCats = [
    cats[0], cats[1], cats[2], cats[3],
    { id: 'r32', label: 'Son 32', value: r.r32?.n ?? 0, count: true },
    cats[4],
  ];
  return (
    <div className={`card p-4 ${leader ? 'ring-2 ring-gold' : ''}`}>
      <button className="w-full flex items-center gap-3 text-left active:scale-[.99] transition" onClick={() => onOpenList(r.list.id)}>
        <span className={`font-display text-2xl w-7 ${leader ? 'text-gold-dark' : 'text-ink/30'}`}>{i + 1}</span>
        <Avatar name={r.list.ownerName || r.list.name} color={r.list.color} src={r.list.ownerPhoto} size={38} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-ink truncate">
            {topBadge && <span title={topBadge.title} className="mr-1">{topBadge.icon}</span>}
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

      <div className="mt-2 grid grid-cols-6 gap-1 text-center">
        {gridCats.map((c) => (
          <button key={c.id} onClick={() => setCat(cat === c.id ? null : c.id)}
            className={`rounded-lg py-1.5 transition ${cat === c.id ? (c.count ? 'bg-pitch text-white' : 'bg-ink text-white') : 'bg-black/[0.03] text-ink'}`}>
            <div className="font-display text-base leading-none">{c.value}{c.count && <span className="text-[9px] align-top opacity-60">/32</span>}</div>
            <div className={`text-[9px] uppercase tracking-tight mt-0.5 ${cat === c.id ? 'text-white/70' : 'text-ink/45'}`}>{c.label}</div>
          </button>
        ))}
      </div>

      {cat === 'r32' ? <R32Teams r={r} /> : cat && <CategoryDetail cat={cat} r={r} actual={actual} proj={proj} />}
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
  const adv = advancingTeams(actual, proj);
  const groups = [];
  for (const g of GROUP_NAMES) {
    const started = GROUP_MATCHES.some((m) => m.group === g && hasS(actual.groupMatches?.[m.no]));
    const ok = proj ? started : (hasOrder(actual, g) && hasOrder(pred, g));
    if (!ok) continue;
    const P = groupOrder(pred, g), A = groupOrder(actual, g);
    groups.push({ g, teams: P.map((t, idx) => ({ team: t, q: idx < 2 && adv.has(t), pos: A[idx] === t })) });
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
  const aSet = advancingTeams(actual, proj);
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

function CmpBox({ mine, real, fmt }) {
  const f = fmt || shortName;
  return (
    <div className="mt-2 rounded-lg bg-white border border-black/5 p-2 text-xs space-y-1">
      <div className="flex justify-between"><span className="text-ink/45">Senin tahminin</span><span className="font-semibold">{mine ? f(mine) : '—'}</span></div>
      <div className="flex justify-between"><span className="text-ink/45">Gerçek</span><span className="font-semibold">{real ? f(real) : '—'}</span></div>
    </div>
  );
}

// "Son 32" kategorisi açılınca: kullanıcının R32'ye soktuğu takımlar (doğru) ve
// sokamadıkları (tahmininde R32'deydi ama gerçekte çıkamadı).
function R32Teams({ r }) {
  const { hit = [], miss = [], total = 0 } = r.r32 || {};
  return (
    <div className="mt-2 rounded-xl bg-black/[0.02] border border-black/5 p-3">
      <div className="flex justify-between text-xs font-bold uppercase tracking-wide text-ink/50 mb-2">
        <span>Son 32'ye soktukların</span><span>{hit.length}/{total || 32}</span>
      </div>
      {hit.length === 0 ? (
        <p className="text-xs text-ink/45">Henüz doğru takım yok.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {hit.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-pitch/10 text-pitch-dark px-2 py-1 text-xs font-semibold">
              <Flag team={t} size={14} />{shortName(t)}
            </span>
          ))}
        </div>
      )}
      {miss.length > 0 && (
        <>
          <p className="text-[11px] text-ink/45 mt-2.5 mb-1">Çıkaramadıkların ({miss.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {miss.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] text-ink/45 px-2 py-1 text-xs">
                <Flag team={t} size={14} className="opacity-50" />{shortName(t)}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CategoryDetail({ cat, r, actual, proj }) {
  const s = r.stats;
  const tick = (b) => (b ? '✓' : '—');
  const [open, setOpen] = useState(null);

  const gHits = groupHits(r.pred, actual);
  const kHits = koHits(r.pred, actual, r.bracket?.actual);
  const mhits = matchupHitsOf(r.bracket?.pred, r.bracket?.actual, proj || allGroupsComplete(actual));
  const roundHits = (lo, hi) => mhits.filter((h) => h.no >= lo && h.no <= hi);
  const bp = r.bracket?.pred || {}, ba = r.bracket?.actual || {};

  const ROWS = {
    gm: [
      { label: 'Tam skor (5p)', val: s.exact, detail: () => <HitList hits={gHits.filter((h) => h.pts === 5)} /> },
      { label: 'Doğru sonuç (3p)', val: s.correctResult, detail: () => <HitList hits={gHits.filter((h) => h.pts === 3)} /> },
      { label: 'Puanlanan maç', val: s.playedScored },
    ],
    gt: [
      { label: 'Üst tura çıkan (10p)', val: s.correctQualified, detail: () => <GroupBreakdown pred={r.pred} actual={actual} proj={proj} /> },
      { label: 'Doğru sıra (5p)', val: s.correctPositions, detail: () => <GroupBreakdown pred={r.pred} actual={actual} proj={proj} /> },
      { label: 'Tamamlanan grup', val: `${s.groupsFinal}/12` },
    ],
    th: [
      { label: 'Doğru 3. takım (10p)', val: `${s.thirdsCorrect}/8`, detail: () => <ThirdsBreakdown pred={r.pred} actual={actual} proj={proj} /> },
    ],
    ko: [
      { label: 'Doğru eşleşme (her tur)', val: s.koMatchupHits, detail: () => <MatchupList hits={mhits} /> },
      { label: 'Tam skor (5p)', val: s.koExact, detail: () => <HitList hits={kHits.filter((h) => h.pts === 5)} /> },
      { label: 'Doğru sonuç (3p)', val: s.koResult, detail: () => <HitList hits={kHits.filter((h) => h.pts === 3)} /> },
      { label: 'Son 32 doğru (20p)', val: s.koR32, detail: () => <MatchupList hits={roundHits(73, 88)} /> },
      { label: 'Son 16 doğru (20p)', val: s.koR16, detail: () => <MatchupList hits={roundHits(89, 96)} /> },
      { label: 'Çeyrek doğru (40p)', val: s.koQF, detail: () => <MatchupList hits={roundHits(97, 100)} /> },
      { label: 'Yarı doğru (60p)', val: s.koSF, detail: () => <MatchupList hits={roundHits(101, 102)} /> },
    ],
    fn: [
      { label: 'Şampiyon (80p)', val: tick(s.finalsHit.champion), detail: () => <CmpBox mine={bp.champion} real={ba.champion} /> },
      { label: 'Finalist (50p)', val: tick(s.finalsHit.runnerUp), detail: () => <CmpBox mine={bp.runnerUp} real={ba.runnerUp} /> },
      { label: "3.'lük (30p)", val: tick(s.finalsHit.third), detail: () => <CmpBox mine={bp.third} real={ba.third} /> },
      { label: "4.'lük (20p)", val: tick(s.finalsHit.fourth), detail: () => <CmpBox mine={bp.fourth} real={ba.fourth} /> },
      { label: 'Gol kralı (50p)', val: tick(s.finalsHit.topScorer), detail: () => <CmpBox mine={r.pred.topScorer} real={actual.topScorer} fmt={(x) => x} /> },
    ],
  };
  const rows = ROWS[cat] || [];
  const total = { gm: r.breakdown.groupMatches, gt: r.breakdown.groupTables, th: r.breakdown.thirds, ko: r.breakdown.knockout, fn: r.breakdown.finals }[cat];

  return (
    <div className="mt-2 rounded-xl bg-black/[0.02] border border-black/5 p-3">
      <div className="flex justify-between text-xs font-bold uppercase tracking-wide text-ink/50 mb-1">
        <span>Döküm</span><span>{total} puan</span>
      </div>
      <div className="divide-y divide-black/5">
        {rows.map((row, idx) => {
          const hasDetail = !!row.detail;
          const isOpen = open === idx;
          return (
            <div key={idx}>
              <button type="button" onClick={() => hasDetail && setOpen(isOpen ? null : idx)}
                className="w-full flex items-center justify-between py-1.5 text-sm text-left">
                <span className="text-ink/65 flex items-center gap-1">
                  {row.label}
                  {hasDetail && <span className={`text-ink/30 text-[10px] transition ${isOpen ? 'rotate-180' : ''}`}>▾</span>}
                </span>
                <span className="font-semibold tabular-nums">{row.val}</span>
              </button>
              {isOpen && hasDetail && <div className="pb-2 fade-in">{row.detail()}</div>}
            </div>
          );
        })}
      </div>
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

// --- Sıralama yarışı (zaman içinde sıra değişimi: bump chart) ---
const RACE_PALETTE = ['#e6194B', '#3cb44b', '#4363d8', '#f58231', '#911eb4', '#42d4f4', '#f032e6', '#1f9d55', '#9A6324', '#469990', '#800000', '#808000', '#000075', '#e07a5f', '#6a4c93', '#bc6c25', '#2a9d8f', '#d62828', '#5f0f40', '#3d405b'];
const raceLabel = (d) => { const m = (d || '').match(/^(\S+)\s+(\d+),/); return m ? `${m[2]} ${m[1]}` : (d || ''); };

function buildRace(lists, actual, getPrediction) {
  const byNo = Object.fromEntries(GROUP_MATCHES.map((m) => [m.no, m]));
  const scoredDates = new Set();
  for (const no of Object.keys(actual.groupMatches || {})) {
    if (hasS(actual.groupMatches[no]) && byNo[no]) scoredDates.add(byNo[no].date);
  }
  const dates = [...scoredDates].sort((a, b) => dkeyOf(a) - dkeyOf(b));
  const rankMapFor = (filterFn, fullActual) => {
    let src;
    if (fullActual) src = actual;
    else {
      const gm = {};
      for (const no of Object.keys(actual.groupMatches || {})) {
        const mm = byNo[no];
        if (mm && hasS(actual.groupMatches[no]) && filterFn(mm)) gm[no] = actual.groupMatches[no];
      }
      src = { ...actual, groupMatches: gm, groupTables: {}, ko: {}, topScorer: '' };
    }
    const ranked = lists
      .map((l) => ({ id: l.id, name: l.name || '', total: scoreUser(getPrediction(l.id), src, { projection: false }).total }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'tr') || a.id.localeCompare(b.id));
    const map = {};
    ranked.forEach((r, i) => { map[r.id] = { rank: i + 1, total: r.total }; });
    return map;
  };
  const snaps = dates.map((d) => { const cut = dkeyOf(d); return { label: raceLabel(d), rankMap: rankMapFor((mm) => dkeyOf(mm.date) <= cut) }; });
  const fullMap = rankMapFor(null, true);
  const last = snaps[snaps.length - 1];
  const differs = !last || lists.some((l) => (fullMap[l.id]?.total || 0) !== (last.rankMap[l.id]?.total || 0));
  if (differs) snaps.push({ label: 'Güncel', rankMap: fullMap });
  return snaps;
}

function RankRace({ lists, actual, getPrediction, user }) {
  const snaps = useMemo(() => buildRace(lists, actual, getPrediction), [lists, actual]);
  const n = snaps.length;
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showNames, setShowNames] = useState(true);
  const scrollRef = useRef(null);
  useEffect(() => { setT(n ? n - 1 : 0); }, [n]);
  useEffect(() => {
    if (!playing) return;
    if (t >= n - 1) { setPlaying(false); return; }
    const iv = setInterval(() => setT((x) => Math.min(n - 1, x + 1)), 950);
    return () => clearInterval(iv);
  }, [playing, t, n]);
  // Oynatırken/ilerlerken oynatma çizgisini görünür tut (isimler ekrandan kaybolmasın).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const colW = 58, leftPad = 22;
    const target = leftPad + t * colW - el.clientWidth * 0.45;
    el.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }, [t]);

  if (n === 0) return <Empty title="Henüz veri yok">İlk maç sonuçları girilince sıralama değişim grafiği burada oluşur.</Empty>;

  const count = lists.length;
  const colorMap = {};
  lists.forEach((l, idx) => { colorMap[l.id] = l.color || RACE_PALETTE[idx % RACE_PALETTE.length]; });
  const mineId = lists.find((l) => l.ownerUid === user?.uid)?.id;

  const rowH = Math.max(15, Math.min(24, Math.floor(380 / Math.max(count, 1))));
  const colW = 58, leftPad = 22, topPad = 22, bottomPad = 10;
  const rightPad = showNames ? 116 : 14;
  const W = leftPad + (n - 1) * colW + rightPad + 6;
  const H = topPad + count * rowH + bottomPad;
  const X = (i) => leftPad + i * colW;
  const Y = (rank) => topPad + (rank - 0.5) * rowH;
  const ease = 'transform .6s cubic-bezier(.4,0,.2,1)';
  const gridRanks = [];
  for (let r = 1; r <= count; r += (count > 12 ? 5 : 3)) gridRanks.push(r);
  if (gridRanks[gridRanks.length - 1] !== count) gridRanks.push(count);

  const orderNow = lists
    .map((l) => ({ l, ...(snaps[t].rankMap[l.id] || {}) }))
    .sort((a, b) => (a.rank || 999) - (b.rank || 999));
  const prevSnap = t > 0 ? snaps[t - 1] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-xs text-ink/45">Kişilerin zaman içindeki sıra değişimi. Alttan ileri/geri al ya da “Oynat”.</p>
        <button onClick={() => setShowNames((v) => !v)}
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${showNames ? 'bg-ink text-white' : 'bg-black/5 text-ink/60'}`}>
          İsimler
        </button>
      </div>

      <div ref={scrollRef} className="card p-2 overflow-x-auto">
        <svg width={W} height={H} className="block">
          {gridRanks.map((r) => (
            <g key={'g' + r}>
              <line x1={leftPad} y1={Y(r)} x2={W - rightPad + 6} y2={Y(r)} stroke="#000" strokeOpacity="0.05" />
              <text x={4} y={Y(r) + 3} fontSize="9" fill="#999">{r}</text>
            </g>
          ))}
          <g style={{ transform: `translateX(${X(t)}px)`, transition: ease }}>
            <line x1={0} y1={topPad - 6} x2={0} y2={H - bottomPad} stroke="#1f9d55" strokeOpacity="0.3" strokeWidth="2" />
          </g>
          {snaps.map((s, i) => (
            <text key={'x' + i} x={X(i)} y={12} fontSize="9" textAnchor="middle" fontWeight={i === t ? 700 : 400} fill={i === t ? '#111' : '#aaa'}>{s.label}</text>
          ))}
          {lists.map((l) => {
            const pts = [];
            for (let i = 0; i <= t; i++) { const rm = snaps[i].rankMap[l.id]; if (rm) pts.push(`${X(i)},${Y(rm.rank)}`); }
            if (!pts.length) return null;
            const me = l.id === mineId;
            const here = snaps[t].rankMap[l.id];
            return (
              <g key={l.id}>
                <polyline points={pts.join(' ')} fill="none" stroke={colorMap[l.id]} strokeWidth={me ? 3.5 : 2}
                  strokeOpacity={me ? 1 : 0.8} strokeLinejoin="round" strokeLinecap="round" style={{ transition: 'stroke-width .3s' }} />
                {here && (
                  <g style={{ transform: `translate(${X(t)}px, ${Y(here.rank)}px)`, transition: ease }}>
                    <circle cx={0} cy={0} r={me ? 4.5 : 3.2} fill={colorMap[l.id]} stroke="#fff" strokeWidth={me ? 1.5 : 0} />
                    {showNames && (
                      <text x={7} y={3} fontSize="9" fontWeight={me ? 700 : 500} fill={colorMap[l.id]}
                        stroke="#fff" strokeWidth="3" paintOrder="stroke" strokeLinejoin="round">{(l.name || '').slice(0, 14)}</text>
                    )}
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="card p-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">{snaps[t].label}</span>
          <span className="text-ink/45 text-xs tabular-nums">{t + 1}/{n}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setPlaying(false); setT((x) => Math.max(0, x - 1)); }} aria-label="Geri"
            className="h-9 w-9 grid place-items-center rounded-lg bg-black/5 text-ink/70 active:scale-95">◀</button>
          <input type="range" min={0} max={n - 1} value={t} onChange={(e) => { setPlaying(false); setT(+e.target.value); }}
            className="flex-1 accent-pitch" />
          <button onClick={() => { setPlaying(false); setT((x) => Math.min(n - 1, x + 1)); }} aria-label="İleri"
            className="h-9 w-9 grid place-items-center rounded-lg bg-black/5 text-ink/70 active:scale-95">▶</button>
          <button onClick={() => { if (t >= n - 1) setT(0); setPlaying((p) => !p); }}
            className="h-9 px-3 rounded-lg bg-ink text-white text-xs font-semibold shrink-0">{playing ? 'Duraklat' : '▶ Oynat'}</button>
        </div>
      </div>

      <div className="card divide-y divide-black/5">
        {orderNow.map(({ l, rank, total }) => {
          const prev = prevSnap?.rankMap[l.id]?.rank;
          const delta = prev && rank ? prev - rank : 0;
          const me = l.id === mineId;
          return (
            <div key={l.id} className={`flex items-center gap-3 px-3 py-2 ${me ? 'bg-pitch/[0.05]' : ''}`}>
              <span className="w-5 text-center font-display text-ink/40">{rank ?? '—'}</span>
              <span className="h-3 w-3 rounded-full shrink-0" style={{ background: colorMap[l.id] }} />
              <span className={`flex-1 min-w-0 truncate text-sm ${me ? 'font-bold' : 'font-semibold'}`}>{l.name}{me && <span className="ml-1 text-[11px] text-pitch-dark">· sen</span>}</span>
              {delta !== 0 && <span className={`text-[11px] font-bold ${delta > 0 ? 'text-pitch' : 'text-red-500'}`}>{delta > 0 ? '▲' : '▼'}{Math.abs(delta)}</span>}
              <span className="font-display tabular-nums text-ink">{total ?? 0}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
