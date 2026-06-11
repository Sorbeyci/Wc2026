import { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { scoreUser } from '../lib/scoring.js';
import { GROUP_MATCHES, GROUP_NAMES, KO_ROUNDS } from '../data/tournament.js';
import { Flag, Dot } from '../components/ui.jsx';
import Standings from '../components/Standings.jsx';
import FullStats from '../components/FullStats.jsx';

const SUB = [
  { id: 'standings', label: 'Puan Durumu' },
  { id: 'stats', label: 'İstatistik' },
  { id: 'picks', label: 'Tahminler' },
];

export default function ListDetail({ listId, onBack, onEdit }) {
  const { lists, getPrediction, actual, canEditList } = useStore();
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

  return (
    <div className="space-y-4">
      <button className="text-sm font-semibold text-pitch" onClick={onBack}>← Listeler</button>

      <div className="card p-4 flex items-center gap-3">
        <Dot color={list.color} />
        <div className="flex-1 min-w-0">
          <p className="font-display text-2xl text-ink leading-tight truncate">{list.name}</p>
          <p className="text-xs text-ink/45 truncate">{list.ownerName}{mine ? ' · senin listen' : ''}</p>
        </div>
        <div className="text-right">
          <div className="font-display text-3xl text-pitch leading-none">{result.total}</div>
          <div className="text-[10px] uppercase tracking-wide text-ink/45">puan</div>
        </div>
      </div>

      {mine && (
        <button className="w-full btn-primary" onClick={() => onEdit(listId)}>Tahminleri düzenle</button>
      )}

      <div className="flex rounded-xl bg-black/5 p-1">
        {SUB.map((s) => (
          <button key={s.id} onClick={() => setSub(s.id)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${sub === s.id ? 'bg-white shadow-sm text-ink' : 'text-ink/55'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {sub === 'standings' && <Standings scores={pred.groupMatches} />}
      {sub === 'stats' && <FullStats result={result} />}
      {sub === 'picks' && <Picks pred={pred} />}
    </div>
  );
}

export function Picks({ pred }) {
  const finals = pred.finals || {};
  const thirds = pred.thirds || [];
  const hasScore = (s) => s && s.home !== '' && s.home != null && s.away !== '' && s.away != null;
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
                return (
                  <div key={m.no} className="flex items-center gap-2 px-4 py-2 text-sm">
                    <span className="flex-1 flex items-center justify-end gap-1.5 text-right">
                      <span className="truncate">{m.home}</span><Flag team={m.home} size={16} />
                    </span>
                    <span className="font-display tabular-nums w-12 text-center">
                      {hasScore(s) ? `${s.home}-${s.away}` : '–'}
                    </span>
                    <span className="flex-1 flex items-center gap-1.5">
                      <Flag team={m.away} size={16} /><span className="truncate">{m.away}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* best third-placed teams */}
      {thirds.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-2 border-b border-black/5 font-display text-lg">Üst tura çıkan 3.'ler ({thirds.length})</div>
          <div className="flex flex-wrap gap-1.5 p-3">
            {thirds.map((t) => (
              <span key={t} className="chip bg-pitch/10 text-pitch gap-1"><Flag team={t} size={14} />{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* knockout */}
      {KO_ROUNDS.map((round) => {
        const arr = pred.knockout?.[round.id] || [];
        const filled = arr.filter((x) => x && (x.home || x.away));
        if (filled.length === 0) return null;
        return (
          <div key={round.id} className="card overflow-hidden">
            <div className="px-4 py-2 border-b border-black/5 font-display text-lg">{round.labelTr}</div>
            <div className="divide-y divide-black/5">
              {arr.map((x, i) => {
                if (!x || (!x.home && !x.away)) return null;
                return (
                  <div key={i} className="px-4 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="flex-1 flex items-center justify-end gap-1.5 text-right">
                        <span className="truncate">{x.home || '—'}</span>{x.home && <Flag team={x.home} size={16} />}
                      </span>
                      <span className="font-display tabular-nums w-12 text-center">
                        {x.hs !== '' && x.hs != null && x.as !== '' && x.as != null ? `${x.hs}-${x.as}` : 'vs'}
                      </span>
                      <span className="flex-1 flex items-center gap-1.5">
                        {x.away && <Flag team={x.away} size={16} />}<span className="truncate">{x.away || '—'}</span>
                      </span>
                    </div>
                    {x.advancer && (
                      <div className="mt-1 text-[11px] text-pitch flex items-center gap-1 justify-center">
                        <Flag team={x.advancer} size={12} /> {x.advancer} çıkıyor
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* finals */}
      {(finals.champion || finals.runnerUp || finals.third || finals.fourth || finals.topScorer) && (
        <div className="card overflow-hidden">
          <div className="px-4 py-2 border-b border-black/5 font-display text-lg">Kupa & podyum</div>
          <div className="divide-y divide-black/5">
            <PickRow label="🏆 Şampiyon" team={finals.champion} />
            <PickRow label="🥈 İkinci" team={finals.runnerUp} />
            <PickRow label="🥉 Üçüncü" team={finals.third} />
            <PickRow label="4. Dördüncü" team={finals.fourth} />
            {finals.topScorer && (
              <div className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="text-ink/60">⚽ Gol kralı</span>
                <span className="font-semibold">{finals.topScorer}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PickRow({ label, team }) {
  if (!team) return null;
  return (
    <div className="flex items-center justify-between px-4 py-2 text-sm">
      <span className="text-ink/60">{label}</span>
      <span className="flex items-center gap-1.5 font-semibold"><Flag team={team} size={16} />{team}</span>
    </div>
  );
}
