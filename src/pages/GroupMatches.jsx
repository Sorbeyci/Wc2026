import { useMemo, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { GROUP_MATCHES, GROUP_NAMES } from '../data/tournament.js';
import { ScoreBox, ProgressBar, Flag } from '../components/ui.jsx';
import { shortName } from '../data/flags.js';

const TR_MONTHS = { Oca: 1, Şub: 2, Mar: 3, Nis: 4, May: 5, Haz: 6, Tem: 7, Ağu: 8, Eyl: 9, Eki: 10, Kas: 11, Ara: 12 };
function dateKey(m) {
  const mt = (m.date || '').match(/^(\S+)\s+(\d+),\s*(\d+)$/);
  const mon = mt ? (TR_MONTHS[mt[1]] || 0) : 0;
  const day = mt ? +mt[2] : 0;
  const year = mt ? +mt[3] : 0;
  const [hh, mm] = (m.time || '00:00').split(':').map(Number);
  return ((year * 100 + mon) * 100 + day) * 10000 + (hh * 100 + mm);
}

// One match row (flags + score boxes), reused by both views.
function MatchRow({ m, pred, listId, setGroupMatch, showGroup }) {
  const p = pred.groupMatches[m.no] || {};
  return (
    <div className="px-4 py-3">
      <div className="mb-1.5 text-[11px] text-ink/45">
        {m.no}. maç · {m.date} · {m.time}{showGroup ? ` · ${m.group} Grubu` : ''}
      </div>
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
}

export default function GroupMatches({ listId }) {
  const { getPrediction, setGroupMatch } = useStore();
  const pred = getPrediction(listId);
  const [view, setView] = useState('group'); // 'group' | 'day'
  const [openGroup, setOpenGroup] = useState('A');
  const [openDay, setOpenDay] = useState(null);

  const byGroup = useMemo(() => {
    const m = {};
    for (const g of GROUP_NAMES) m[g] = GROUP_MATCHES.filter((x) => x.group === g);
    return m;
  }, []);

  const days = useMemo(() => {
    const map = new Map();
    for (const m of GROUP_MATCHES) { if (!map.has(m.date)) map.set(m.date, []); map.get(m.date).push(m); }
    const arr = [...map.entries()].map(([date, ms]) => ({
      date, ms: [...ms].sort((a, b) => dateKey(a) - dateKey(b)), key: dateKey(ms[0]),
    }));
    arr.sort((a, b) => a.key - b.key);
    return arr;
  }, []);

  const isFilled = (no) => {
    const p = pred.groupMatches[no];
    return p && p.home !== '' && p.home != null && p.away !== '' && p.away != null;
  };
  const filled = GROUP_MATCHES.filter((m) => isFilled(m.no)).length;
  const activeDay = openDay ?? days[0]?.date;

  return (
    <div className="space-y-3">
      <div className="card p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-ink">Skor tahminleri</span>
          <span className="text-ink/55">{filled}/{GROUP_MATCHES.length}</span>
        </div>
        <div className="mt-2"><ProgressBar value={filled} total={GROUP_MATCHES.length} /></div>
      </div>

      {/* view toggle */}
      <div className="flex rounded-xl bg-black/5 p-1">
        {[['group', 'Gruplara göre'], ['day', 'Güne göre']].map(([id, label]) => (
          <button key={id} onClick={() => setView(id)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${view === id ? 'bg-white shadow-sm text-ink' : 'text-ink/55'}`}>
            {label}
          </button>
        ))}
      </div>

      {view === 'group' ? (
        GROUP_NAMES.map((g) => {
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
                  {byGroup[g].map((m) => (
                    <MatchRow key={m.no} m={m} pred={pred} listId={listId} setGroupMatch={setGroupMatch} />
                  ))}
                </div>
              )}
            </div>
          );
        })
      ) : (
        days.map((d) => {
          const open = activeDay === d.date;
          const dayFilled = d.ms.filter((m) => isFilled(m.no)).length;
          return (
            <div key={d.date} className="card overflow-hidden">
              <button className="w-full flex items-center justify-between px-4 py-3" onClick={() => setOpenDay(open ? '' : d.date)}>
                <span className="font-display text-lg text-ink">{d.date}</span>
                <span className="flex items-center gap-2 text-sm text-ink/55">
                  {dayFilled}/{d.ms.length}
                  <span className={`transition ${open ? 'rotate-180' : ''}`}>▾</span>
                </span>
              </button>
              {open && (
                <div className="divide-y divide-black/5 border-t border-black/5">
                  {d.ms.map((m) => (
                    <MatchRow key={m.no} m={m} pred={pred} listId={listId} setGroupMatch={setGroupMatch} showGroup />
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}

      <p className="text-center text-xs text-ink/45 px-4">
        Tam skor = 5 puan · sadece doğru sonuç = 3 puan
      </p>
    </div>
  );
}
