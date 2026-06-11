import { thirdPlacedTeams } from '../lib/scoring.js';
import { MAX_THIRDS } from '../lib/store.jsx';
import { Flag } from './ui.jsx';

// source: a prediction or the actual results (used to derive each group's 3rd team).
// selected: array of chosen team names. onToggle(team). disabled: read-only.
export default function ThirdsPicker({ source, selected = [], onToggle, disabled }) {
  const candidates = thirdPlacedTeams(source);
  const count = selected.length;
  const full = count >= MAX_THIRDS;

  return (
    <div className="space-y-3">
      <div className="card p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-ink">Üst tura çıkan 3.'ler</span>
          <span className={`font-display text-lg ${full ? 'text-pitch' : 'text-ink/55'}`}>{count}/{MAX_THIRDS}</span>
        </div>
        <p className="mt-1 text-xs text-ink/50">
          12 grubun 3.'sünden en iyi 8'i üst tura çıkar. Çıkacağını düşündüğün 8 takımı seç.
          Doğru her takım {`+10`} puan.
        </p>
      </div>

      <div className="card divide-y divide-black/5">
        {candidates.map(({ group, team }) => {
          const on = selected.includes(team);
          const blocked = !on && full;
          return (
            <button
              key={group}
              disabled={disabled || blocked}
              onClick={() => onToggle(team)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${on ? 'bg-pitch/[0.06]' : ''} ${blocked ? 'opacity-40' : ''}`}
            >
              <span className="w-6 font-display text-lg text-ink/30">{group}</span>
              <Flag team={team} size={20} />
              <span className="flex-1 text-sm font-semibold text-ink truncate">{team || '—'}</span>
              <span className={`w-6 h-6 rounded-full grid place-items-center text-sm font-bold ${
                on ? 'bg-pitch text-white' : 'border border-black/15 text-transparent'
              }`}>✓</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
