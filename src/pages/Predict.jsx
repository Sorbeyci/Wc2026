import { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import ListPicker from '../components/ListPicker.jsx';
import ThirdsPicker from '../components/ThirdsPicker.jsx';
import Standings from '../components/Standings.jsx';
import { SectionTitle } from '../components/ui.jsx';
import GroupMatches from './GroupMatches.jsx';
import GroupRankings from './GroupRankings.jsx';
import Knockout from './Knockout.jsx';
import { Picks } from './ListDetail.jsx';

const SUB = [
  { id: 'matches', label: 'Maçlar' },
  { id: 'tables', label: 'Gruplar' },
  { id: 'thirds', label: "3.'ler" },
  { id: 'knockout', label: 'Eleme' },
];

export default function Predict({ goLists, initialListId }) {
  const { lists, isAdmin, user, locked, getPrediction, toggleThird } = useStore();
  const [sub, setSub] = useState('matches');

  const editable = lists.filter((l) => l.ownerUid === user?.uid || isAdmin);
  const [listId, setListId] = useState(initialListId || editable[0]?.id || null);
  const activeId = editable.find((l) => l.id === listId) ? listId : editable[0]?.id || null;
  const readOnly = locked && !isAdmin;

  return (
    <div className="space-y-4">
      <SectionTitle eyebrow="2. Adım" title="Tahminler" />

      {locked && (
        <div className={`rounded-xl px-3 py-2 text-sm ${readOnly ? 'bg-amber-100 text-amber-800' : 'bg-pitch/10 text-pitch-dark'}`}>
          {readOnly
            ? '🔒 Tahminler kilitlendi. Artık değişiklik yapamazsın.'
            : '🔒 Tahminler kilitli (yönetici olarak hâlâ düzenleyebilirsin).'}
        </div>
      )}

      {editable.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="font-display text-xl">Önce bir liste oluştur</p>
          <p className="mt-1 text-sm text-ink/60">Tahmin girmek için en az bir listen olmalı.</p>
          <button className="btn-primary mt-3" onClick={goLists}>Listelere git</button>
        </div>
      ) : (
        <>
          <ListPicker lists={editable} value={activeId} onChange={setListId} />

          {readOnly ? (
            <ReadOnly listId={activeId} getPrediction={getPrediction} />
          ) : (
            <>
              <div className="flex rounded-xl bg-black/5 p-1">
                {SUB.map((s) => (
                  <button key={s.id} onClick={() => setSub(s.id)}
                    className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${sub === s.id ? 'bg-white shadow-sm text-ink' : 'text-ink/55'}`}>
                    {s.label}
                  </button>
                ))}
              </div>

              {activeId && sub === 'matches' && <GroupMatches listId={activeId} />}
              {activeId && sub === 'tables' && <GroupRankings listId={activeId} />}
              {activeId && sub === 'thirds' && (
                <ThirdsPicker
                  source={getPrediction(activeId)}
                  selected={getPrediction(activeId).thirds || []}
                  onToggle={(t) => toggleThird(activeId, t)}
                />
              )}
              {activeId && sub === 'knockout' && <Knockout listId={activeId} />}
            </>
          )}
        </>
      )}
    </div>
  );
}

function ReadOnly({ listId, getPrediction }) {
  const pred = getPrediction(listId);
  return (
    <div className="space-y-4">
      <Standings scores={pred.groupMatches} />
      <Picks pred={pred} />
    </div>
  );
}
