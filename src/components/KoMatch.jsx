import { TeamSelect, ScoreBox, Flag } from './ui.jsx';
import { SCORING } from '../lib/scoring.js';

// A single knockout fixture: two team selects, score, and (optionally) an advancer pick.
export default function KoMatch({ index, roundId, data = {}, onChange, disabled }) {
  const showAdvancer = (SCORING.knockout.advance[roundId] || 0) > 0;
  const set = (patch) => onChange(patch);
  const chosen = [data.home, data.away].filter(Boolean);

  return (
    <div className="px-4 py-3 space-y-2">
      <div className="text-[11px] text-ink/45">{index + 1}. eşleşme</div>
      <div className="grid grid-cols-1 gap-2">
        <div className="flex items-center gap-2">
          <Flag team={data.home} size={20} />
          <div className="flex-1"><TeamSelect value={data.home} disabled={disabled} onChange={(v) => set({ home: v })} placeholder="Ev sahibi" /></div>
          <ScoreBox value={data.hs} disabled={disabled} onChange={(v) => set({ hs: v })} />
        </div>
        <div className="flex items-center gap-2">
          <Flag team={data.away} size={20} />
          <div className="flex-1"><TeamSelect value={data.away} disabled={disabled} onChange={(v) => set({ away: v })} placeholder="Deplasman" /></div>
          <ScoreBox value={data.as} disabled={disabled} onChange={(v) => set({ as: v })} />
        </div>
      </div>

      {showAdvancer && chosen.length === 2 && (
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <span className="label">Tur atlayan</span>
          <div className="flex gap-1.5 flex-wrap">
            {chosen.map((t) => (
              <button
                key={t}
                disabled={disabled}
                onClick={() => set({ advancer: t })}
                className={`chip px-3 py-1 border gap-1 ${
                  data.advancer === t ? 'bg-pitch text-white border-pitch' : 'bg-white text-ink border-black/10'
                }`}
              >
                <Flag team={t} size={14} />{t}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
