import { useState, useMemo } from 'react';
import { useStore } from '../lib/store.jsx';
import { scoreUser, SCORING } from '../lib/scoring.js';
import { GROUP_MATCHES, GROUP_NAMES } from '../data/tournament.js';
import { resolveBracket, bestThirds } from '../data/bracket.js';
import { exportPredictionXlsx } from '../lib/excel.js';
import { Flag, Dot, Avatar, Segmented, CountUp } from '../components/ui.jsx';
import Standings from '../components/Standings.jsx';
import BracketTree from '../components/BracketTree.jsx';
import { shortName, teamColor } from '../data/flags.js';
import { sharePerson } from '../lib/shareCard.js';
import { achievements } from '../lib/achievements.js';
import FullStats from '../components/FullStats.jsx';

const KO_VIEW = [
  { id: 'R32', labelTr: 'Son 32', from: 73, to: 88 },
  { id: 'R16', labelTr: 'Son 16', from: 89, to: 96 },
  { id: 'QF', labelTr: 'Çeyrek Final', from: 97, to: 100 },
  { id: 'SF', labelTr: 'Yarı Final', from: 101, to: 102 },
  { id: 'F', labelTr: 'Final', from: 104, to: 104 },
  { id: 'TP', labelTr: 'Üçüncülük', from: 103, to: 103 },
];

const SUB = [
  { id: 'standings', label: 'Puan Durumu' },
  { id: 'stats', label: 'İstatistik' },
  { id: 'picks', label: 'Tahminler' },
  { id: 'tree', label: 'Ağaç' },
];

export default function ListDetail({ listId, onBack, onEdit, crumbs }) {
  const { lists, getPrediction, actual, canEditList, isMyList } = useStore();
  const [sub, setSub] = useState('standings');
  const list = lists.find((l) => l.id === listId);
  if (!list) {
    return (
      <div className="space-y-4">
        <button className="text-sm font-semibold text-pitch" onClick={onBack}>← Geri</button>
        <div className="card p-6 text-center text-ink/60">Liste bulunamadı.</div>
      </div>
    );
  }
  const pred = getPrediction(listId);
  const result = scoreUser(pred, actual);
  const mine = canEditList(list);
  const owned = isMyList(list);

  const rank = useMemo(() => {
    const totals = lists.map((l) => ({ id: l.id, total: scoreUser(getPrediction(l.id), actual).total }))
      .sort((a, b) => b.total - a.total);
    return totals.findIndex((t) => t.id === listId) + 1;
  }, [lists, actual, listId]);

  const bestDay = useMemo(() => {
    const byDate = {};
    for (const m of GROUP_MATCHES) {
      const pts = grpPts(pred.groupMatches?.[m.no], actual?.groupMatches?.[m.no]);
      if (pts == null) continue;
      byDate[m.date] = (byDate[m.date] || 0) + pts;
    }
    const vals = Object.values(byDate);
    return vals.length ? Math.max(...vals) : 0;
  }, [pred, actual]);

  const achs = useMemo(() => achievements(result, { rank, bestDay }), [result, rank, bestDay]);
  const earnedCount = achs.filter((a) => a.earned).length;
  const [achOpen, setAchOpen] = useState(false);

  const highlights = useMemo(() => {
    const b = result.breakdown || {};
    const cats = [
      ['Maç skorları', b.groupMatches], ['Grup sıralaması', b.groupTables],
      ["En iyi 3.'ler", b.thirds], ['Eleme', b.knockout], ['Final & kupa', b.finals],
    ].filter(([, v]) => (v || 0) > 0).sort((x, y) => y[1] - x[1]);
    return { best: cats[0] || null };
  }, [result]);

  const onShare = () => sharePerson({
    list, total: result.total, breakdown: result.breakdown,
    champion: result.bracket?.pred?.champion || '', topScorer: pred.topScorer || '',
  }, { rank });

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-1.5 text-sm font-semibold min-w-0">
        {(crumbs && crumbs.length ? crumbs : [{ label: 'Listeler', onClick: onBack }]).map((c, i) => (
          <span key={i} className="flex items-center gap-1.5 shrink-0">
            <button onClick={c.onClick} className="text-pitch hover:underline">{i === 0 ? '← ' : ''}{c.label}</button>
            <span className="text-ink/25">/</span>
          </span>
        ))}
        <span className="text-ink/55 truncate">{list.name}</span>
      </nav>

      <div className="card p-4 flex items-center gap-3">
        <Avatar name={list.ownerName || list.name} color={list.color} size={44} />
        <div className="flex-1 min-w-0">
          <p className="font-display text-2xl text-ink leading-tight truncate">{list.name}</p>
          <p className="text-xs text-ink/45 truncate">{list.ownerName}{owned ? ' · senin listen' : ''} · {rank}. sıra</p>
        </div>
        <button onClick={onShare} title="Paylaş"
          className="h-10 w-10 shrink-0 grid place-items-center rounded-full bg-black/5 text-ink/70 active:scale-95 transition" aria-label="Paylaş">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        </button>
        <div className="text-right">
          <div className="font-display text-3xl text-pitch leading-none"><CountUp value={result.total} /></div>
          <div className="text-[10px] uppercase tracking-wide text-ink/45">puan</div>
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <div className="grid grid-cols-4 gap-2 text-center">
          <Mini label="Tam skor" v={result.stats.exact} />
          <Mini label="Doğru sonuç" v={result.stats.correctResult} />
          <Mini label="Eşleşme" v={result.stats.koMatchupHits} />
          <Mini label="Doğru 3." v={result.stats.thirdsCorrect} />
        </div>
        {highlights.best && (
          <p className="text-xs text-ink/55 text-center">En güçlü kategori: <b className="text-pitch-dark">{highlights.best[0]}</b> · {highlights.best[1]} puan</p>
        )}
        <div className="flex items-center justify-center gap-5 text-sm">
          <span className="flex items-center gap-1">🏆 {result.bracket?.pred?.champion ? shortName(result.bracket.pred.champion) : '—'}</span>
          <span className="flex items-center gap-1">⚽ {pred.topScorer || '—'}</span>
        </div>
      </div>

      <div className="card overflow-hidden">
        <button onClick={() => setAchOpen((v) => !v)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
          <span className="text-2xl">🏅</span>
          <div className="flex-1 min-w-0">
            <p className="font-display text-lg leading-none">Başarımlar</p>
            <p className="text-[11px] text-ink/45 mt-0.5">
              {earnedCount > 0 ? `${earnedCount}/${achs.length} rozet açıldı — gerisini keşfet` : `${achs.length} rozet seni bekliyor — keşfet`}
            </p>
          </div>
          <div className="flex -space-x-1 mr-1">
            {achs.slice(0, 4).map((a) => (
              <span key={a.id} className="h-6 w-6 grid place-items-center rounded-full bg-black/5 text-sm" style={a.earned ? undefined : { filter: 'grayscale(1)', opacity: 0.5 }}>{a.icon}</span>
            ))}
          </div>
          <span className={`shrink-0 grid place-items-center h-7 w-7 rounded-full bg-gold/20 text-gold-dark transition ${achOpen ? 'rotate-180' : 'animate-pulse'}`}>▾</span>
        </button>
        {achOpen && (
          <div className="px-4 pb-4 fade-in">
            <div className="grid grid-cols-3 gap-2">
              {achs.map((a) => <Badge key={a.id} a={a} />)}
            </div>
            <p className="text-[11px] text-ink/40 text-center mt-2">Bir rozete dokun: nasıl kazanılır?</p>
          </div>
        )}
      </div>

      {mine && (
        <button className="w-full btn-primary" onClick={() => onEdit(listId)}>Tahminleri düzenle</button>
      )}
      <button className="w-full btn btn-ghost" onClick={() => exportPredictionXlsx(list.name || list.ownerName || 'tahmin', pred)}>
        Excel olarak dışa aktar
      </button>

      <Segmented items={SUB} value={sub} onChange={setSub} />

      <div key={sub} className="fade-in">
        {sub === 'standings' && <Standings scores={pred.groupMatches} />}
        {sub === 'stats' && <FullStats result={result} />}
        {sub === 'picks' && <Picks pred={pred} actual={actual} />}
        {sub === 'tree' && <BracketTree pred={pred} actual={actual} />}
      </div>
    </div>
  );
}

const numv = (v) => (v === '' || v == null || isNaN(v) ? null : Number(v));
const outc = (h, a) => (h > a ? 'H' : h < a ? 'A' : 'D');
function grpPts(p, a) {
  const ph = numv(p?.home), pa = numv(p?.away), ah = numv(a?.home), aa = numv(a?.away);
  if (ph == null || pa == null || ah == null || aa == null) return null;
  if (ph === ah && pa === aa) return SCORING.match.exact;
  if (outc(ph, pa) === outc(ah, aa)) return SCORING.match.result;
  return 0;
}
function koScorePts(p, a) {
  const ph = numv(p?.hs), pa = numv(p?.as), ah = numv(a?.hs), aa = numv(a?.as);
  if (ph == null || pa == null || ah == null || aa == null) return null;
  if (ph === ah && pa === aa) return SCORING.knockout.match.exact;
  if (outc(ph, pa) === outc(ah, aa)) return SCORING.knockout.match.result;
  return 0;
}
const advanceOf = (no) => (no <= 88 ? SCORING.knockout.advance.R32 : no <= 96 ? SCORING.knockout.advance.R16 : no <= 100 ? SCORING.knockout.advance.QF : no <= 102 ? SCORING.knockout.advance.SF : 0);

function Pts({ n }) {
  if (n == null) return null;
  return <span className={`chip shrink-0 ${n > 0 ? 'bg-pitch/15 text-pitch-dark' : 'bg-black/5 text-ink/40'}`}>+{n}</span>;
}

export function Picks({ pred, actual }) {
  const hasScore = (s) => s && s.home !== '' && s.home != null && s.away !== '' && s.away != null;
  const b = resolveBracket(pred, pred.ko || {});
  const bA = resolveBracket(actual || {}, actual?.ko || {});
  const thirds = bestThirds(pred);
  const anyGroupScore = GROUP_MATCHES.some((m) => hasScore(pred.groupMatches?.[m.no]));
  return (
    <div className="space-y-3">
      {/* group match scores */}
      {GROUP_NAMES.map((g) => {
        const matches = GROUP_MATCHES.filter((m) => m.group === g);
        const any = matches.some((m) => hasScore(pred.groupMatches?.[m.no]));
        if (!any) return null;
        return (
          <div key={g} className="card overflow-hidden">
            <div className="px-4 py-2 border-b border-black/5 font-display text-lg">{g} Grubu</div>
            <div className="divide-y divide-black/5">
              {matches.map((m) => {
                const s = pred.groupMatches?.[m.no] || {};
                const pts = grpPts(s, actual?.groupMatches?.[m.no]);
                return (
                  <div key={m.no} className="flex items-center gap-2 px-3 py-2 text-sm"
                    style={{ backgroundImage: `linear-gradient(90deg, ${teamColor(m.home)}12, transparent 24%, transparent 76%, ${teamColor(m.away)}12)` }}>
                    <div className="w-10 shrink-0" />
                    <div className="flex-1 min-w-0 flex items-center justify-end gap-1.5">
                      <span className="truncate">{shortName(m.home)}</span>
                      <Flag team={m.home} size={16} className="shrink-0" />
                    </div>
                    <span className="font-display tabular-nums w-12 text-center shrink-0">
                      {hasScore(s) ? `${s.home}-${s.away}` : '–'}
                    </span>
                    <div className="flex-1 min-w-0 flex items-center gap-1.5">
                      <Flag team={m.away} size={16} className="shrink-0" />
                      <span className="truncate">{shortName(m.away)}</span>
                    </div>
                    <div className="w-10 shrink-0 flex justify-end"><Pts n={pts} /></div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* best third-placed teams (auto) */}
      {anyGroupScore && (
        <div className="card overflow-hidden">
          <div className="px-4 py-2 border-b border-black/5 font-display text-lg">En iyi 8 üçüncü (otomatik)</div>
          <div className="flex flex-wrap gap-1.5 p-3">
            {thirds.top8.map((t) => (
              <span key={t.group} className="inline-flex items-center gap-1 rounded-full bg-pitch/10 px-2 py-1 text-xs font-semibold text-pitch-dark">
                <Flag team={t.team} size={14} />{t.group}: {shortName(t.team)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* knockout bracket (auto matchups, picked winners in bold) */}
      {KO_VIEW.map((r) => {
        const rows = [];
        for (let no = r.from; no <= r.to; no++) { const m = b.matches[no]; if (m && m.home && m.away) rows.push(m); }
        if (!rows.length) return null;
        return (
          <div key={r.id} className="card overflow-hidden">
            <div className="px-4 py-2 border-b border-black/5 font-display text-lg">{r.labelTr}</div>
            <div className="divide-y divide-black/5">
              {rows.map((m) => {
                const sc = pred.ko?.[m.no] || {};
                const hasSc = sc.hs !== '' && sc.hs != null && sc.as !== '' && sc.as != null;
                const spts = koScorePts(sc, actual?.ko?.[m.no]);
                const aw = bA.matches?.[m.no]?.winner;
                const advHit = aw && m.winner === aw && advanceOf(m.no) > 0;
                return (
                  <div key={m.no} className="flex items-center gap-2 px-3 py-2 text-sm"
                    style={{ backgroundImage: `linear-gradient(90deg, ${teamColor(m.home)}12, transparent 24%, transparent 76%, ${teamColor(m.away)}12)` }}>
                    <div className="w-12 shrink-0" />
                    <div className="flex-1 min-w-0 flex items-center justify-end gap-1.5">
                      <span className={`truncate ${m.winner === m.home ? 'font-bold text-pitch-dark' : ''}`}>{shortName(m.home)}</span>
                      <Flag team={m.home} size={16} className="shrink-0" />
                    </div>
                    <span className="shrink-0 w-12 text-center font-display tabular-nums text-ink/70">
                      {hasSc ? `${sc.hs}-${sc.as}` : 'vs'}
                    </span>
                    <div className="flex-1 min-w-0 flex items-center gap-1.5">
                      <Flag team={m.away} size={16} className="shrink-0" />
                      <span className={`truncate ${m.winner === m.away ? 'font-bold text-pitch-dark' : ''}`}>{shortName(m.away)}</span>
                    </div>
                    <div className="w-12 shrink-0 flex flex-col items-end gap-0.5">
                      {advHit && <span className="chip bg-gold/20 text-gold-dark text-[10px] px-1.5 py-0">✓{advanceOf(m.no)}</span>}
                      <Pts n={spts} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* podium (derived from bracket) + top scorer */}
      {(b.champion || b.third || pred.topScorer) && (
        <div className="card overflow-hidden">
          <div className="px-4 py-2 border-b border-black/5 font-display text-lg">Kupa & podyum</div>
          <div className="divide-y divide-black/5">
            <PickRow label="🏆 Şampiyon" team={b.champion} />
            <PickRow label="🥈 İkinci" team={b.runnerUp} />
            <PickRow label="🥉 Üçüncü" team={b.third} />
            <PickRow label="4. Dördüncü" team={b.fourth} />
            {pred.topScorer && (
              <div className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="text-ink/60">⚽ Gol kralı</span>
                <span className="font-semibold">{pred.topScorer}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Mini({ label, v }) {
  return (
    <div className="rounded-lg bg-black/[0.03] py-2">
      <div className="font-display text-xl text-ink leading-none">{v || 0}</div>
      <div className="text-[10px] text-ink/45 mt-0.5">{label}</div>
    </div>
  );
}

function Badge({ a }) {
  const [show, setShow] = useState(false);
  return (
    <button onClick={() => setShow((s) => !s)} title={`${a.title} — ${a.desc}`}
      className={`rounded-xl border p-2 text-center transition active:scale-95 ${a.earned ? 'border-gold/40 bg-gold/10' : 'border-black/5 bg-black/[0.02] opacity-60'}`}>
      <div className="text-2xl leading-none" style={a.earned ? undefined : { filter: 'grayscale(1)' }}>{a.icon}</div>
      <div className="text-[11px] font-bold mt-1 leading-tight">{a.title}</div>
      <div className="text-[9px] leading-tight mt-0.5 min-h-[22px] flex items-center justify-center">
        {show
          ? <span className="text-ink/60">{a.desc}</span>
          : <span className="text-ink/45">{a.earned ? 'kazanıldı ✓' : (a.progress || 'kilitli')}</span>}
      </div>
    </button>
  );
}

function PickRow({ label, team }) {
  if (!team) return null;
  return (
    <div className="flex items-center justify-between px-4 py-2 text-sm" style={{ boxShadow: `inset 3px 0 0 ${teamColor(team)}` }}>
      <span className="text-ink/60">{label}</span>
      <span className="flex items-center gap-1.5 font-semibold"><Flag team={team} size={16} />{shortName(team)}</span>
    </div>
  );
}
