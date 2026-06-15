import { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { scoreUser } from '../lib/scoring.js';
import { GROUP_MATCHES, GROUP_NAMES } from '../data/tournament.js';
import { resolveBracket, bestThirds } from '../data/bracket.js';
import { exportPredictionXlsx } from '../lib/excel.js';
import { Flag, Dot } from '../components/ui.jsx';
import Standings from '../components/Standings.jsx';
import { shortName } from '../data/flags.js';
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
      <button className="w-full btn btn-ghost" onClick={() => exportPredictionXlsx(list.name || list.ownerName || 'tahmin', pred)}>
        Excel olarak dışa aktar
      </button>

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
  const hasScore = (s) => s && s.home !== '' && s.home != null && s.away !== '' && s.away != null;
  const b = resolveBracket(pred, pred.ko || {});
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
                return (
                  <div key={m.no} className="flex items-center gap-2 px-4 py-2 text-sm">
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
                return (
                  <div key={m.no} className="flex items-center gap-2 px-4 py-2 text-sm">
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

function PickRow({ label, team }) {
  if (!team) return null;
  return (
    <div className="flex items-center justify-between px-4 py-2 text-sm">
      <span className="text-ink/60">{label}</span>
      <span className="flex items-center gap-1.5 font-semibold"><Flag team={team} size={16} />{shortName(team)}</span>
    </div>
  );
}
