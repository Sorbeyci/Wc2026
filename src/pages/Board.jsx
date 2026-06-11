import { useMemo, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { scoreUser } from '../lib/scoring.js';
import { SectionTitle, Dot, Empty } from '../components/ui.jsx';
import FullStats from '../components/FullStats.jsx';

const SUB = [
  { id: 'board', label: 'Sıralama' },
  { id: 'stats', label: 'İstatistik' },
];

export default function Board({ onOpenList }) {
  const { lists, actual, getPrediction } = useStore();
  const [sub, setSub] = useState('board');

  const rows = useMemo(() => (
    lists
      .map((l) => ({ list: l, ...scoreUser(getPrediction(l.id), actual) }))
      .sort((a, b) => b.total - a.total)
  ), [lists, actual]);

  return (
    <div className="space-y-4">
      <SectionTitle eyebrow="3. Adım" title="Sıralama" />

      <div className="flex rounded-xl bg-black/5 p-1">
        {SUB.map((s) => (
          <button key={s.id} onClick={() => setSub(s.id)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${sub === s.id ? 'bg-white shadow-sm text-ink' : 'text-ink/55'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {lists.length === 0 ? (
        <Empty title="Henüz liste yok">Tabloyu görmek için liste ve tahmin ekle.</Empty>
      ) : sub === 'board' ? (
        <Leaderboard rows={rows} onOpenList={onOpenList} />
      ) : (
        <Stats rows={rows} />
      )}
    </div>
  );
}

function Leaderboard({ rows, onOpenList }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-ink/45 px-1">Bir oyuncuya dokunarak tahminlerini ve detaylı istatistiklerini gör.</p>
      {rows.map((r, i) => {
        const leader = i === 0 && r.total > 0;
        return (
          <button key={r.list.id} onClick={() => onOpenList(r.list.id)}
            className={`card p-4 w-full text-left active:scale-[.99] transition ${leader ? 'ring-2 ring-gold' : ''}`}>
            <div className="flex items-center gap-3">
              <span className={`font-display text-2xl w-7 ${leader ? 'text-gold-dark' : 'text-ink/30'}`}>{i + 1}</span>
              <Dot color={r.list.color} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink truncate">
                  {r.list.name}{leader && <span className="ml-2 chip bg-gold/20 text-gold-dark">Lider</span>}
                </p>
                <p className="text-xs text-ink/45 truncate">{r.list.ownerName}</p>
              </div>
              <span className="font-display text-2xl text-ink">{r.total}</span>
              <span className="text-ink/25">›</span>
            </div>
            <div className="mt-2 grid grid-cols-5 gap-1.5 text-center">
              <Mini label="Maçlar" value={r.breakdown.groupMatches} />
              <Mini label="Gruplar" value={r.breakdown.groupTables} />
              <Mini label="3.'ler" value={r.breakdown.thirds} />
              <Mini label="Eleme" value={r.breakdown.knockout} />
              <Mini label="Final" value={r.breakdown.finals} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function Mini({ label, value }) {
  return (
    <div className="rounded-lg bg-black/[0.03] py-1.5">
      <div className="font-display text-lg text-ink leading-none">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-ink/45 mt-0.5">{label}</div>
    </div>
  );
}

function Stats({ rows }) {
  const [openId, setOpenId] = useState(rows[0]?.list.id || null);
  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const open = openId === r.list.id;
        return (
          <div key={r.list.id} className="card overflow-hidden">
            <button className="w-full flex items-center gap-3 px-4 py-3" onClick={() => setOpenId(open ? null : r.list.id)}>
              <Dot color={r.list.color} />
              <span className="flex-1 text-left font-semibold truncate">{r.list.name}</span>
              <span className="font-display text-xl">{r.total}</span>
              <span className={`transition ${open ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {open && (
              <div className="border-t border-black/5 p-3 bg-black/[0.015]">
                <FullStats result={r} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
