import { useMemo, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { GROUP_MATCHES, GROUP_NAMES } from '../data/tournament.js';
import { ScoreBox, ProgressBar, Flag } from '../components/ui.jsx';
import { shortName } from '../data/flags.js';

export default function GroupMatches({ listId }) {
  const { getPrediction, setGroupMatch } = useStore();
  const pred = getPrediction(listId);
  const [openGroup, setOpenGroup] = useState('A');

  const byGroup = useMemo(() => {
    const m = {};
    for (const g of GROUP_NAMES) m[g] = GROUP_MATCHES.filter((x) => x.group === g);
    return m;
  }, []);

  const isFilled = (no) => {
    const p = pred.groupMatches[no];
    return p && p.home !== '' && p.home != null && p.away !== '' && p.away != null;
  };
  const filled = GROUP_MATCHES.filter((m) => isFilled(m.no)).length;

  return (
    <div className="space-y-3">
      <div className="card p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-ink">Skor tahminleri</span>
          <span className="text-ink/55">{filled}/{GROUP_MATCHES.length}</span>
        </div>
        <div className="mt-2"><ProgressBar value={filled} total={GROUP_MATCHES.length} /></div>
      </div>

      {GROUP_NAMES.map((g) => {
        const open = openGroup === g;
        const groupFilled = byGroup[g].filter((m) => isFilled(m.no)).length;
        return (
          <div key={g} className="card overflow-hidden">
            <button className="w-full flex items-center justify-between px-4 py-3" onClick={() => setOpenGroup(open ? null : g)}>
              <span className="font-display text-xl text-ink">{g} Grubu</span>
              <span className="flex items-center gap-2 text-sm text-ink/55">
                {groupFilled}/{byGroup[g].length}
                <span className={`transition ${open ? 'rotate-180' : ''}`}>▾</span>
              </span>
            </button>
            {open && (
              <div className="divide-y divide-black/5 border-t border-black/5">
                {byGroup[g].map((m) => {
                  const p = pred.groupMatches[m.no] || {};
                  return (
                    <div key={m.no} className="px-4 py-3">
                      <div className="text-[11px] text-ink/45 mb-1.5">{m.no}. maç · {m.date} · {m.time}</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0 flex items-center justify-end gap-1.5">
                          <span className="truncate text-sm font-semibold text-ink">{shortName(m.home)}</span>
                          <Flag team={m.home} size={18} className="shrink-0" />
                        </div>
                        <ScoreBox value={p.home} onChange={(v) => setGroupMatch(listId, m.no, 'home', v)} />
                        <span className="text-ink/30 font-bold shrink-0">:</span>
                        <ScoreBox value={p.away} onChange={(v) => setGroupMatch(listId, m.no, 'away', v)} />
                        <div className="flex-1 min-w-0 flex items-center gap-1.5">
                          <Flag team={m.away} size={18} className="shrink-0" />
                          <span className="truncate text-sm font-semibold text-ink">{shortName(m.away)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <p className="text-center text-xs text-ink/45 px-4">
        Tam skor = 5 puan · sadece doğru sonuç = 3 puan
      </p>
    </div>
  );
}
