import { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { KO_ROUNDS } from '../data/tournament.js';
import { SCORING } from '../lib/scoring.js';
import KoMatch from '../components/KoMatch.jsx';
import { TeamSelect, Flag } from '../components/ui.jsx';

export default function Knockout({ listId }) {
  const { getPrediction, setKnockout, setFinals } = useStore();
  const pred = getPrediction(listId);
  const [openRound, setOpenRound] = useState('R32');
  const finals = pred.finals || {};

  return (
    <div className="space-y-3">
      <div className="card p-3 text-sm text-ink/70">
        Kimin kiminle eşleşeceğini, skoru ve tur atlayanı tahmin et.
        <div className="mt-1 text-xs text-ink/45">Eşleşme = 10 puan · skor kuralı geçerli · tur atlayan puanı tura göre artar.</div>
      </div>

      {KO_ROUNDS.map((round) => {
        const open = openRound === round.id;
        const advPts = SCORING.knockout.advance[round.id] || 0;
        return (
          <div key={round.id} className="card overflow-hidden">
            <button className="w-full flex items-center justify-between px-4 py-3" onClick={() => setOpenRound(open ? null : round.id)}>
              <span className="font-display text-xl text-ink">{round.labelTr}</span>
              <span className="flex items-center gap-2 text-xs text-ink/55">
                {advPts ? `atlayan +${advPts}` : ''}
                <span className={`transition ${open ? 'rotate-180' : ''}`}>▾</span>
              </span>
            </button>
            {open && (
              <div className="divide-y divide-black/5 border-t border-black/5">
                {Array.from({ length: round.matches }).map((_, i) => (
                  <KoMatch key={i} index={i} roundId={round.id}
                    data={pred.knockout?.[round.id]?.[i] || {}}
                    onChange={(patch) => setKnockout(listId, round.id, i, patch)} />
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div className="card overflow-hidden">
        <div className="px-4 py-2.5 border-b border-black/5 font-display text-xl text-ink">Kupa & podyum</div>
        <div className="p-4 space-y-3">
          <Field label={`Şampiyon (+${SCORING.finals.champion})`} team={finals.champion}>
            <TeamSelect value={finals.champion} onChange={(v) => setFinals(listId, { champion: v })} placeholder="Şampiyon" />
          </Field>
          <Field label={`İkinci (+${SCORING.finals.runnerUp})`} team={finals.runnerUp}>
            <TeamSelect value={finals.runnerUp} onChange={(v) => setFinals(listId, { runnerUp: v })} placeholder="Finalde kaybeden" />
          </Field>
          <Field label={`Üçüncü (+${SCORING.finals.third})`} team={finals.third}>
            <TeamSelect value={finals.third} onChange={(v) => setFinals(listId, { third: v })} placeholder="3.lük" />
          </Field>
          <Field label={`Dördüncü (+${SCORING.finals.fourth})`} team={finals.fourth}>
            <TeamSelect value={finals.fourth} onChange={(v) => setFinals(listId, { fourth: v })} placeholder="4.lük" />
          </Field>
          <Field label={`Gol kralı (+${SCORING.finals.topScorer})`}>
            <input className="field" placeholder="Oyuncu adı" value={finals.topScorer || ''}
              onChange={(e) => setFinals(listId, { topScorer: e.target.value })} />
          </Field>
        </div>
      </div>
    </div>
  );
}

function Field({ label, team, children }) {
  return (
    <div>
      <label className="label mb-1 flex items-center gap-1.5">{team && <Flag team={team} size={16} />}{label}</label>
      {children}
    </div>
  );
}
