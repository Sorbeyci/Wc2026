import { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { GROUP_NAMES } from '../data/tournament.js';
import { computeStandings, groupOrder } from '../lib/scoring.js';
import Standings from '../components/Standings.jsx';
import { Flag } from '../components/ui.jsx';

const move = (arr, from, to) => { const a = [...arr]; const [x] = a.splice(from, 1); a.splice(to, 0, x); return a; };

export default function GroupRankings({ listId }) {
  const { getPrediction, setGroupTable, clearGroupTable } = useStore();
  const pred = getPrediction(listId);
  const [mode, setMode] = useState('auto');

  return (
    <div className="space-y-3">
      <div className="card p-3 text-sm text-ink/70">
        Grup sıralaması, <b>Maçlar</b> sekmesinde girdiğin skorlardan otomatik oluşur.
        Eşitlik durumlarında istersen elle düzenleyebilirsin.
        <div className="mt-1 text-xs text-ink/45">Üst tura çıkan takım = 10 puan · doğru sıra = 5 puan</div>
      </div>

      <div className="flex rounded-xl bg-black/5 p-1">
        {[['auto', 'Otomatik'], ['manual', 'Elle düzenle']].map(([id, label]) => (
          <button key={id} onClick={() => setMode(id)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${mode === id ? 'bg-white shadow-sm text-ink' : 'text-ink/55'}`}>
            {label}
          </button>
        ))}
      </div>

      {mode === 'auto' ? (
        <Standings scores={pred.groupMatches} />
      ) : (
        GROUP_NAMES.map((g) => {
          const overridden = !!(pred.groupTables?.[g] && pred.groupTables[g].length === 4);
          const order = groupOrder(pred, g);
          const stats = Object.fromEntries(computeStandings(g, pred.groupMatches).map((r) => [r.team, r]));
          return (
            <div key={g} className="card overflow-hidden">
              <div className="px-4 py-2.5 border-b border-black/5 flex items-center justify-between">
                <span className="font-display text-xl text-ink">{g} Grubu</span>
                {overridden
                  ? <button className="text-xs font-semibold text-pitch" onClick={() => clearGroupTable(listId, g)}>Skorlara göre sıfırla</button>
                  : <span className="text-[11px] text-ink/40">otomatik</span>}
              </div>
              <div className="divide-y divide-black/5">
                {order.map((team, idx) => {
                  const s = stats[team] || { Pts: 0, GD: 0 };
                  return (
                    <div key={team} className={`flex items-center gap-3 px-3 py-2.5 ${idx < 2 ? 'bg-pitch/[0.04]' : ''}`}>
                      <span className={`w-6 text-center font-display text-lg ${idx < 2 ? 'text-pitch' : 'text-ink/30'}`}>{idx + 1}</span>
                      <Flag team={team} size={20} />
                      <span className="flex-1 text-sm font-semibold text-ink truncate">{team}</span>
                      <span className="text-[11px] text-ink/45 tabular-nums">{s.Pts}p · av {s.GD > 0 ? `+${s.GD}` : s.GD}</span>
                      <div className="flex flex-col">
                        <button className="px-2 text-ink/40 disabled:opacity-20 active:text-pitch" disabled={idx === 0}
                          onClick={() => setGroupTable(listId, g, move(order, idx, idx - 1))}>▲</button>
                        <button className="px-2 text-ink/40 disabled:opacity-20 active:text-pitch" disabled={idx === order.length - 1}
                          onClick={() => setGroupTable(listId, g, move(order, idx, idx + 1))}>▼</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
