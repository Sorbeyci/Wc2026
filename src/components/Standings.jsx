import { computeStandings } from '../lib/scoring.js';
import { GROUP_NAMES } from '../data/tournament.js';
import { Flag } from './ui.jsx';

// Column legend: O=Oynadı G=Galibiyet B=Beraberlik M=Mağlubiyet
//                A=Attığı Y=Yediği Av=Averaj P=Puan
const COLS = [
  ['O', 'P'], ['G', 'W'], ['B', 'D'], ['M', 'L'],
  ['A', 'GF'], ['Y', 'GA'], ['Av', 'GD'], ['P', 'Pts'],
];

export function GroupStandings({ group, scores }) {
  const table = computeStandings(group, scores);
  const played = table.reduce((n, r) => n + r.P, 0) > 0;
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-black/5 flex items-center justify-between">
        <span className="font-display text-xl text-ink">{group} Grubu</span>
        {!played && <span className="text-[11px] text-ink/40">skor girilmedi</span>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-ink/45">
              <th className="text-left font-semibold pl-3 py-1.5 w-6"></th>
              <th className="text-left font-semibold py-1.5">Takım</th>
              {COLS.map(([abbr]) => (
                <th key={abbr} className="font-semibold py-1.5 w-7 text-center">{abbr}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.map((r, i) => (
              <tr key={r.team} className={`border-t border-black/5 ${i < 2 ? 'bg-pitch/[0.05]' : ''}`}>
                <td className={`pl-3 py-1.5 font-display ${i < 2 ? 'text-pitch' : 'text-ink/30'}`}>{i + 1}</td>
                <td className="py-1.5 pr-2">
                  <span className="flex items-center gap-1.5">
                    <Flag team={r.team} size={16} />
                    <span className="font-semibold text-ink truncate max-w-[110px]">{r.team}</span>
                  </span>
                </td>
                <td className="text-center text-ink/70">{r.P}</td>
                <td className="text-center text-ink/70">{r.W}</td>
                <td className="text-center text-ink/70">{r.D}</td>
                <td className="text-center text-ink/70">{r.L}</td>
                <td className="text-center text-ink/70">{r.GF}</td>
                <td className="text-center text-ink/70">{r.GA}</td>
                <td className={`text-center ${r.GD > 0 ? 'text-pitch' : r.GD < 0 ? 'text-red-500' : 'text-ink/50'}`}>
                  {r.GD > 0 ? `+${r.GD}` : r.GD}
                </td>
                <td className="text-center font-display text-ink">{r.Pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StandingsLegend() {
  return (
    <p className="text-[11px] text-ink/45 px-1 leading-relaxed">
      O Oynadı · G Galibiyet · B Beraberlik · M Mağlubiyet · A Attığı · Y Yediği · Av Averaj · P Puan
      <span className="block mt-0.5">Galibiyet 3 puan, beraberlik 1 puan. İlk 2 takım üst tura çıkar.</span>
    </p>
  );
}

export default function Standings({ scores }) {
  return (
    <div className="space-y-3">
      <StandingsLegend />
      {GROUP_NAMES.map((g) => <GroupStandings key={g} group={g} scores={scores} />)}
    </div>
  );
}
