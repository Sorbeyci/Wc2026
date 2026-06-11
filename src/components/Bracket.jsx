import { resolveBracket, bestThirds } from '../data/bracket.js';
import { Flag, ScoreBox } from './ui.jsx';
import { shortName } from '../data/flags.js';

const ROUNDS = [
  { id: 'R32', labelTr: 'Son 32', from: 73, to: 88 },
  { id: 'R16', labelTr: 'Son 16', from: 89, to: 96 },
  { id: 'QF', labelTr: 'Çeyrek Final', from: 97, to: 100 },
  { id: 'SF', labelTr: 'Yarı Final', from: 101, to: 102 },
  { id: 'F', labelTr: 'Final', from: 104, to: 104 },
  { id: 'TP', labelTr: 'Üçüncülük Maçı', from: 103, to: 103 },
];

const num = (v) => (v === '' || v == null || isNaN(v) ? null : Number(v));

// Tappable team label — picks who advances (winner). Highlighted when winning.
function TeamLabel({ team, winner, onPick, readOnly, align }) {
  if (!team) {
    return <span className="flex-1 min-w-0 truncate text-sm text-ink/35">Belirlenecek</span>;
  }
  const isWin = winner && winner === team;
  const cls = `flex-1 min-w-0 flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : ''}`;
  const name = (
    <span className={`truncate text-sm ${isWin ? 'font-bold text-pitch-dark' : 'font-medium'}`}>
      {shortName(team)}{isWin && ' ✓'}
    </span>
  );
  const flag = <Flag team={team} size={16} className="shrink-0" />;
  return (
    <button type="button" disabled={readOnly} onClick={() => onPick(team)} className={cls}>
      {align === 'right' ? <>{name}{flag}</> : <>{flag}{name}</>}
    </button>
  );
}

function MatchCard({ m, cur, onChange, readOnly }) {
  const decisive = (hs, as) => {
    hs = num(hs); as = num(as);
    if (hs == null || as == null || hs === as) return null;
    return hs > as ? m.home : m.away;
  };
  const onScore = (side, value) => {
    const next = { ...cur, [side]: value };
    const w = decisive(next.hs, next.as);
    onChange(m.no, w ? { [side]: value, winner: w } : { [side]: value });
  };
  const onPick = (team) => onChange(m.no, { winner: team });

  const hs = num(cur.hs), as = num(cur.as);
  const isDraw = hs != null && as != null && hs === as;
  const bothKnown = m.home && m.away;

  return (
    <div className="card px-3 py-2.5">
      <div className="mb-1 text-[10px] font-semibold text-ink/40">{m.no}. maç</div>
      <div className="flex items-center gap-2">
        <TeamLabel team={m.home} winner={m.winner} onPick={onPick} readOnly={readOnly} align="right" />
        <ScoreBox value={cur.hs} onChange={(v) => onScore('hs', v)} disabled={readOnly || !bothKnown} />
        <span className="shrink-0 font-bold text-ink/30">:</span>
        <ScoreBox value={cur.as} onChange={(v) => onScore('as', v)} disabled={readOnly || !bothKnown} />
        <TeamLabel team={m.away} winner={m.winner} onPick={onPick} readOnly={readOnly} align="left" />
      </div>
      {bothKnown && isDraw && !m.winner && (
        <div className="mt-1.5 text-center text-[11px] text-amber-600">
          Beraberlik — penaltıları kim geçer? İsme dokun.
        </div>
      )}
    </div>
  );
}

export default function Bracket({ source, ko, onChange, readOnly = false }) {
  const b = resolveBracket(source, ko || {});
  const thirds = bestThirds(source);

  return (
    <div className="space-y-5">
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
          Skoru gir; kazanan bir sonraki tura otomatik taşınır.
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
                <MatchCard key={no} m={b.matches[no]} cur={ko?.[no] || {}} onChange={onChange} readOnly={readOnly} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

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
