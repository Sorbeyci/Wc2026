import { useState } from 'react';
import { CHANGELOG } from '../data/changelog.js';
import { SectionTitle, BrandHeader } from '../components/ui.jsx';

export default function Changelog({ goHome }) {
  const [openV, setOpenV] = useState(CHANGELOG[0]?.v || null);
  return (
    <div className="space-y-4">
      <BrandHeader onClick={goHome} />
      <button className="text-sm font-semibold text-pitch" onClick={goHome}>← Ana sayfa</button>
      <SectionTitle title="Sürüm geçmişi" />
      <p className="text-xs text-ink/45 px-1">Tüm güncellemeler. Bir sürüme dokunarak ayrıntılarını aç.</p>
      <div className="space-y-2">
        {CHANGELOG.map((c, idx) => {
          const exp = openV === c.v;
          return (
            <div key={c.v} className="card overflow-hidden">
              <button className="w-full flex items-center gap-2 px-4 py-2.5" onClick={() => setOpenV(exp ? null : c.v)}>
                <span className="font-display text-lg">Sürüm {c.v}</span>
                <span className="text-xs text-ink/45">{c.date}</span>
                {idx === 0 && <span className="chip bg-pitch/15 text-pitch-dark">en yeni</span>}
                <span className={`ml-auto text-ink/40 transition ${exp ? 'rotate-180' : ''}`}>▾</span>
              </button>
              {exp && (
                <ul className="border-t border-black/5 px-4 py-3 space-y-1.5 text-sm text-ink/70">
                  {c.items.map((it, i) => (
                    <li key={i} className="flex gap-2"><span className="text-pitch">•</span><span>{it}</span></li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
