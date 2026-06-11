import { resolveBracket, bestThirds } from '../data/bracket.js';
import { Flag } from './ui.jsx';
import { shortName } from '../data/flags.js';

// Display order: group rounds, then Final, then 3rd-place match.
const ROUNDS = [
  { id: 'R32', labelTr: 'Son 32', from: 73, to: 88 },
  { id: 'R16', labelTr: 'Son 16', from: 89, to: 96 },
  { id: 'QF', labelTr: 'Çeyrek Final', from: 97, to: 100 },
  { id: 'SF', labelTr: 'Yarı Final', from: 101, to: 102 },
  { id: 'F', labelTr: 'Final', from: 104, to: 104 },
  { id: 'TP', labelTr: 'Üçüncülük Maçı', from: 103, to: 103 },
];

function TeamRow({ team, winner, onPick, readOnly, placeholder }) {
  if (!team) {
    return <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-ink/35">{placeholder}</div>;
  }
  const isWin = winner && winner === team;
  return (
    <button
      type="button"
      disabled={readOnly}
      onClick={() => onPick(team)}
      className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition ${
        isWin ? 'bg-pitch/12 text-pitch-dark' : readOnly ? '' : 'hover:bg-black/[0.04] active:bg-black/[0.07]'
      }`}
    >
      <Flag team={team} size={18} className="shrink-0" />
      <span className={`flex-1 min-w-0 truncate text-sm ${isWin ? 'font-bold' : 'font-medium'}`}>{shortName(team)}</span>
      {isWin && <span className="shrink-0 text-pitch font-bold">✓</span>}
    </button>
  );
}

function MatchCard({ m, onPick, readOnly }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-3 pt-1.5 text-[10px] font-semibold text-ink/40">{m.no}. maç</div>
      <TeamRow team={m.home} winner={m.winner} onPick={(t) => onPick(m.no, t)} readOnly={readOnly} placeholder="Belirlenecek" />
      <div className="mx-3 h-px bg-black/5" />
      <TeamRow team={m.away} winner={m.winner} onPick={(t) => onPick(m.no, t)} readOnly={readOnly} placeholder="Belirlenecek" />
    </div>
  );
}

export default function Bracket({ source, ko, onPick, readOnly = false }) {
  const b = resolveBracket(source, ko || {});
  const thirds = bestThirds(source);

  return (
    <div className="space-y-5">
      {/* Auto-qualified best-8 third-placed teams */}
      <div className="card p-3">
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-ink/55">Otomatik en iyi 8 üçüncü</div>
        <div className="flex flex-wrap gap-1.5">
          {thirds.top8.map((t) => (
            <span key={t.group} className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2 py-1 text-xs font-semibold">
              <Flag team={t.team} size={14} /> {t.group}: {shortName(t.team)}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-snug text-ink/45">
          Sıralama tahminlerinden otomatik hesaplanır; eşleşmeler resmi FIFA bracket'ine göre kurulur.
        </p>
      </div>

      {b.champion && (
        <div className="rounded-2xl bg-gradient-to-br from-gold/25 to-gold/5 p-4 text-center">
          <div className="text-xs font-bold uppercase tracking-wide text-ink/55">Şampiyon Tahmini</div>
          <div className="mt-1 flex items-center justify-center gap-2">
            <Flag team={b.champion} size={26} />
            <span className="font-display text-2xl">{b.champion}</span>
          </div>
        </div>
      )}

      {ROUNDS.map((r) => {
        const nos = [];
        for (let n = r.from; n <= r.to; n++) nos.push(n);
        return (
          <div key={r.id}>
            <div className="mb-2 flex items-center gap-2">
              <h3 className="font-display text-lg">{r.labelTr}</h3>
              <div className="h-px flex-1 bg-black/10" />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {nos.map((no) => (
                <MatchCard key={no} m={b.matches[no]} onPick={onPick} readOnly={readOnly} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Compact read-only bracket summary for list detail / stats.
export function BracketSummary({ source, ko }) {
  const b = resolveBracket(source, ko || {});
  const Row = ({ label, team }) => (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-ink/55">{label}</span>
      <span className="flex items-center gap-1.5 font-semibold">
        {team ? <><Flag team={team} size={16} />{shortName(team)}</> : <span className="text-ink/35">—</span>}
      </span>
    </div>
  );
  return (
    <div className="card p-3 divide-y divide-black/5">
      <Row label="🏆 Şampiyon" team={b.champion} />
      <Row label="🥈 Finalist" team={b.runnerUp} />
      <Row label="🥉 Üçüncü" team={b.third} />
      <Row label="4." team={b.fourth} />
    </div>
  );
}
