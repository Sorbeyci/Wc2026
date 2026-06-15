import { resolveBracket } from '../data/bracket.js';
import { shortName, teamColor } from '../data/flags.js';
import { Flag } from './ui.jsx';

const ROW = 66;            // vertical slot per R32 match
const H = 16 * ROW;        // total tree height (16 first-round matches)
const LINE = 'rgba(120,120,120,.35)';

const ROUNDS = [
  { id: 'R32', label: 'Son 32', from: 73, to: 88 },
  { id: 'R16', label: 'Son 16', from: 89, to: 96 },
  { id: 'QF', label: 'Çeyrek', from: 97, to: 100 },
  { id: 'SF', label: 'Yarı', from: 101, to: 102 },
  { id: 'F', label: 'Final', from: 104, to: 104 },
];

function TeamRow({ team, predWin, actualWin, actualLose }) {
  if (!team) return <div className="h-5 flex items-center text-[11px] text-ink/30 px-1.5">—</div>;
  const col = teamColor(team);
  return (
    <div className="h-5 flex items-center gap-1 px-1.5 rounded"
      style={predWin ? { background: `${col}22`, boxShadow: `inset 2px 0 0 ${col}` } : undefined}>
      <Flag team={team} size={12} className="shrink-0" />
      <span className={`flex-1 min-w-0 truncate text-[11px] ${predWin ? 'font-bold text-ink' : 'text-ink/55'}`}>{shortName(team)}</span>
      {actualWin && <span className="text-[10px] text-pitch-dark font-bold">✓</span>}
      {actualLose && <span className="text-[10px] text-red-500 font-bold">✗</span>}
    </div>
  );
}

function Match({ pm, am }) {
  const home = pm?.home, away = pm?.away;
  const pw = pm?.winner, aw = am?.winner;
  return (
    <div className="rounded-lg border border-black/10 bg-[var(--surface)] shadow-sm w-[150px] py-1">
      <TeamRow team={home} predWin={pw && pw === home} actualWin={aw && aw === home} actualLose={aw && pw === home && aw !== home} />
      <div className="h-px bg-black/5 mx-1.5" />
      <TeamRow team={away} predWin={pw && pw === away} actualWin={aw && aw === away} actualLose={aw && pw === away && aw !== away} />
    </div>
  );
}

function Column({ round, P, A }) {
  const nos = [];
  for (let n = round.from; n <= round.to; n++) nos.push(n);
  return (
    <div className="flex flex-col justify-around items-center shrink-0" style={{ height: H }}>
      {nos.map((no) => (
        <Match key={no} pm={P.matches[no]} am={A.matches[no]} />
      ))}
    </div>
  );
}

// Connector column: `pairs` elbows linking a 2n round to an n round.
function Connectors({ pairs }) {
  return (
    <div className="flex flex-col justify-around shrink-0" style={{ height: H, width: 22 }}>
      {Array.from({ length: pairs }).map((_, i) => (
        <div key={i} className="flex-1 flex items-center">
          <div style={{ height: '50%', width: 22, borderTop: `2px solid ${LINE}`, borderRight: `2px solid ${LINE}`, borderBottom: `2px solid ${LINE}`, borderRadius: '0 8px 8px 0' }} />
        </div>
      ))}
    </div>
  );
}

export default function BracketTree({ pred, actual }) {
  const P = resolveBracket(pred, pred?.ko || {});
  const A = resolveBracket(actual, actual?.ko || {});
  const third = { pm: P.matches[103], am: A.matches[103] };

  return (
    <div className="space-y-3">
      <div className="card p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="font-display text-lg">Eleme ağacı</p>
          <p className="text-[11px] text-ink/45">kalın = tahmin · ✓/✗ = gerçek sonuç</p>
        </div>
        <div className="overflow-x-auto -mx-3 px-3 pb-2">
          <div className="flex items-stretch" style={{ minWidth: 5 * 150 + 4 * 22 + 40 }}>
            <Column round={ROUNDS[0]} P={P} A={A} />
            <Connectors pairs={8} />
            <Column round={ROUNDS[1]} P={P} A={A} />
            <Connectors pairs={4} />
            <Column round={ROUNDS[2]} P={P} A={A} />
            <Connectors pairs={2} />
            <Column round={ROUNDS[3]} P={P} A={A} />
            <Connectors pairs={1} />
            <Column round={ROUNDS[4]} P={P} A={A} />
          </div>
        </div>
      </div>

      <div className="card p-3">
        <p className="font-display text-lg mb-2">Üçüncülük</p>
        <div className="max-w-[180px]"><Match pm={third.pm} am={third.am} /></div>
      </div>

      {(P.champion || P.runnerUp) && (
        <div className="card p-3 flex items-center justify-around text-center">
          <div>
            <p className="text-[11px] text-ink/45">🏆 Şampiyon</p>
            <p className="font-display text-lg">{P.champion ? shortName(P.champion) : '—'}</p>
          </div>
          <div>
            <p className="text-[11px] text-ink/45">🥈 İkinci</p>
            <p className="font-display text-lg">{P.runnerUp ? shortName(P.runnerUp) : '—'}</p>
          </div>
          <div>
            <p className="text-[11px] text-ink/45">🥉 Üçüncü</p>
            <p className="font-display text-lg">{P.third ? shortName(P.third) : '—'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
