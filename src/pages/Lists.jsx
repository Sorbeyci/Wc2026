import { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { SectionTitle, Dot, Empty, Avatar, BrandHeader, ScrollTopFab } from '../components/ui.jsx';
import ListDetail from './ListDetail.jsx';

export default function Lists({ viewListId, setViewListId, clearList, onEdit, goHome, listOrigin, goBoard }) {
  const { lists, myLists, isAdmin, user, canCreateList, createList, deleteList, canDeleteList, isMyList, isOnline, requestDeleteList, locked } = useStore();
  const [name, setName] = useState('');
  const [requested, setRequested] = useState(() => new Set());
  const [createOpen, setCreateOpen] = useState(!locked);

  if (viewListId) {
    const fromBoard = listOrigin === 'board';
    const back = fromBoard ? goBoard : (clearList || (() => setViewListId(null)));
    const crumbs = [
      { label: fromBoard ? 'Sıralama' : 'Listeler', onClick: back },
    ];
    return <ListDetail listId={viewListId} onBack={back} crumbs={crumbs} onEdit={onEdit}
      initialSub={fromBoard ? 'picks' : 'standings'} autoRound={fromBoard} />;
  }

  const submit = async () => {
    if (!canCreateList) return;
    await createList(name);
    setName('');
  };

  return (
    <div className="space-y-4">
      <BrandHeader onClick={goHome} />
      <SectionTitle title="Listeler" />

      <div className="card overflow-hidden">
        <button onClick={() => setCreateOpen((v) => !v)} className="w-full flex items-center justify-between gap-2 px-4 py-3">
          <span className="label">Yeni liste oluştur{locked ? ' (kilitli)' : ''}</span>
          <span className={`text-ink/40 transition ${createOpen ? 'rotate-180' : ''}`}>▾</span>
        </button>
        {createOpen && (
          <div className="px-4 pb-4 fade-in">
            <div className="flex gap-2">
              <input className="field" placeholder={isAdmin ? 'Liste adı (örn. Mahmut)' : 'Listenin adı'}
                value={name} disabled={!canCreateList}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()} />
              <button className="btn-primary shrink-0" onClick={submit} disabled={!canCreateList}>Oluştur</button>
            </div>
            {locked && !isAdmin ? (
              <p className="mt-2 text-xs text-ink/50">Sistem kilitli — yeni liste oluşturulamaz.</p>
            ) : isAdmin ? (
              <p className="mt-2 text-xs text-pitch-dark">Yönetici olarak birden fazla liste oluşturabilirsin.</p>
            ) : myLists.length >= 1 ? (
              <p className="mt-2 text-xs text-ink/50">Her oyuncu 1 liste oluşturabilir. Zaten bir listen var.</p>
            ) : (
              <p className="mt-2 text-xs text-ink/50">İlk maç başlamadan önce tahminlerini gir.</p>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-ink/45 px-1">Herhangi bir listeye dokunarak tahminlerini ve puan durumunu görebilirsin.</p>

      {lists.length === 0 ? (
        <Empty title="Henüz liste yok">Başlamak için bir liste oluştur.</Empty>
      ) : (
        <div className="card divide-y divide-black/5">
          {lists.map((l, i) => {
            const mine = isMyList(l);
            const canDelete = canDeleteList(l);
            return (
              <div key={l.id} className="flex items-center gap-3 px-4 py-3">
                <button className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={() => setViewListId(l.id)}>
                  <span className="font-display text-lg text-ink/30 w-6">{i + 1}</span>
                  <Avatar name={l.ownerName || l.name} color={l.color} src={l.ownerPhoto} size={34} />
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-ink truncate">
                      {l.name}
                      {isOnline(l) && <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-bold text-pitch align-middle"><span className="inline-block h-2 w-2 rounded-full bg-pitch" />Online</span>}
                    </span>
                    <span className="block text-xs text-ink/45 truncate">{l.ownerName}{mine ? ' · sen' : ''}</span>
                  </span>
                  <span className="text-ink/25">›</span>
                </button>
                {canDelete && (
                  requested.has(l.id) ? (
                    <span className="text-xs font-semibold text-pitch-dark pl-1 whitespace-nowrap">İstek gönderildi</span>
                  ) : (
                    <button className="text-sm font-semibold text-red-500/80 hover:text-red-600 pl-1"
                      onClick={() => {
                        if (isAdmin) {
                          if (window.confirm(`"${l.name}" listesi ve tahminleri silinsin mi?`) && window.confirm('Emin misin? Bu işlem geri alınamaz.'))
                            deleteList(l.id);
                        } else if (window.confirm(`"${l.name}" listenin silinmesi için yöneticiye istek gönderilsin mi?`)) {
                          requestDeleteList(l);
                          setRequested((s) => new Set(s).add(l.id));
                        }
                      }}>
                      Sil
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
      <ScrollTopFab />
    </div>
  );
}
