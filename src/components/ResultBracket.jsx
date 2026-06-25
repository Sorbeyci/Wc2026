import { resolveBracket, R32 } from '../data/bracket.js';
import { hasOrder, allGroupsComplete } from '../lib/scoring.js';
import { shortName, teamColor } from '../data/flags.js';
import { Flag } from './ui.jsx';

const ROW = 64;
const H = 16 * ROW;
const LINE = 'rgba(120,120,120,.35)';
const ROUNDS = [
  { label: 'Son 32', from: 73, to: 88 },
  { label: 'Son 16', from: 89, to: 96 },
  { label: 'Çeyrek', from: 97, to: 100 },
  { label: 'Yarı', from: 101, to: 102 },
  { label: 'Final', from: 104, to: 104 },
];

// R32 slotlarının grup kökeni etiketi: 1A (grup birincisi), 2B (ikinci), 3.(en iyi üçüncü)
function refLabel(ref, tsg) {
  if (!ref) return '';
  if (ref.t === 'W') return '1' + ref.g;
  if (ref.t === 'R') return '2' + ref.g;
  if (ref.t === 'T') { const g = tsg?.[ref.slot]; return g ? '3.' + g : '3.'; }
  return '';
}
const R32_REF = Object.fromEntries(R32.map((m) => [m.no, { home: m.home, away: m.away }]));

function SlotRow({ team, label, isWinner }) {
  if (team) {
    const col = teamColor(team);
    return (
      <div className="h-5 flex items-center gap-1 px-1.5 rounded"
        style={isWinner ? { background: `${col}22`, boxShadow: `inset 2px 0 0 ${col}` } : undefined}>
        <Flag team={team} size={12} className="shrink-0" />
        <span className={`flex-1 min-w-0 truncate text-[11px] ${isWinner ? 'font-bold text-ink' : 'text-ink/55'}`}>{shortName(team)}</span>
        {isWinner && <span className="text-[10px] text-pitch-dark font-bold">✓</span>}
      </div>
    );
  }
  return (
    <div className="h-5 flex items-center px-1.5">
      <span className="text-[10px] font-bold text-ink/35 bg-black/[0.04] rounded px-1 py-px">{label || '—'}</span>
    </div>
  );
}

function MatchCell({ cell }) {
  if (!cell) return null;
  const { home, away, winner, lh, la } = cell;
  return (
    <div className="rounded-lg border border-black/10 bg-[var(--surface)] shadow-sm w-[140px] py-1">
      <SlotRow team={home} label={lh} isWinner={winner && winner === home} />
      <div className="h-px bg-black/5 mx-1.5" />
      <SlotRow team={away} label={la} isWinner={winner && winner === away} />
    </div>
  );
}

function Column({ round, cells }) {
  const nos = [];
  for (let n = round.from; n <= round.to; n++) nos.push(n);
  return (
    <div className="shrink-0">
      <p className="text-[10px] font-bold uppercase tracking-wide text-ink/40 text-center mb-1 h-3">{round.label}</p>
      <div className="flex flex-col justify-around items-center" style={{ height: H }}>
        {nos.map((no) => <MatchCell key={no} cell={cells[no]} />)}
      </div>
    </div>
  );
}

function Connectors({ pairs }) {
  return (
    <div className="shrink-0" style={{ width: 20 }}>
      <div className="h-3 mb-1" />
      <div className="flex flex-col justify-around" style={{ height: H }}>
        {Array.from({ length: pairs }).map((_, i) => (
          <div key={i} className="flex-1 flex items-center">
            <div style={{ height: '50%', width: 20, borderTop: `2px solid ${LINE}`, borderRight: `2px solid ${LINE}`, borderBottom: `2px solid ${LINE}`, borderRadius: '0 8px 8px 0' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ResultBracket({ source }) {
  const A = resolveBracket(source, source?.ko || {});
  const tsg = A.thirdSlotGroup;
  const allDone = allGroupsComplete(source);

  // Bir R32 slotunun takımı yalnız kaynağı KESİNLEŞMİŞSE gösterilir; yoksa grup-kökeni etiketi.
  const decidedRef = (ref) => {
    if (!ref) return false;
    if (ref.t === 'W' || ref.t === 'R') return hasOrder(source, ref.g);
    if (ref.t === 'T') return allDone; // en iyi 3.'ler ancak tüm gruplar bitince netleşir
    return false;
  };

  const cells = {};
  for (let no = 73; no <= 104; no++) {
    const m = A.matches[no];
    if (!m) continue;
    if (no >= 73 && no <= 88) {
      const ref = R32_REF[no];
      cells[no] = {
        home: decidedRef(ref.home) ? m.home : null,
        away: decidedRef(ref.away) ? m.away : null,
        winner: m.winner,
        lh: refLabel(ref.home, tsg),
        la: refLabel(ref.away, tsg),
      };
    } else {
      cells[no] = { home: m.home, away: m.away, winner: m.winner, lh: '', la: '' };
    }
  }

  return (
    <div className="space-y-3">
      <div className="card p-3">
        <p className="text-[11px] text-ink/45 mb-2">Takımlar gruplar bittikçe netleşir. Boş kutularda “1A” grup birincisi, “2B” grup ikincisi, “3.” en iyi üçüncü demektir. ✓ = bir üst tura çıktı.</p>
        <div className="overflow-x-auto -mx-3 px-3 pb-2">
          <div className="flex items-start" style={{ minWidth: 5 * 140 + 4 * 20 + 24 }}>
            <Column round={ROUNDS[0]} cells={cells} />
            <Connectors pairs={8} />
            <Column round={ROUNDS[1]} cells={cells} />
            <Connectors pairs={4} />
            <Column round={ROUNDS[2]} cells={cells} />
            <Connectors pairs={2} />
            <Column round={ROUNDS[3]} cells={cells} />
            <Connectors pairs={1} />
            <Column round={ROUNDS[4]} cells={cells} />
          </div>
        </div>
      </div>

      <div className="card p-3">
        <p className="font-display text-base mb-2">Üçüncülük maçı</p>
        <div className="max-w-[170px]"><MatchCell cell={cells[103]} /></div>
      </div>

      {(A.champion || A.runnerUp || A.third) && (
        <div className="card p-3 flex items-center justify-around text-center">
          <div><p className="text-[11px] text-ink/45">🏆 Şampiyon</p><p className="font-display text-base">{A.champion ? shortName(A.champion) : '—'}</p></div>
          <div><p className="text-[11px] text-ink/45">🥈 İkinci</p><p className="font-display text-base">{A.runnerUp ? shortName(A.runnerUp) : '—'}</p></div>
          <div><p className="text-[11px] text-ink/45">🥉 Üçüncü</p><p className="font-display text-base">{A.third ? shortName(A.third) : '—'}</p></div>
        </div>
      )}
    </div>
  );
}
