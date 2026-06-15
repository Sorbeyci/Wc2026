import { useState } from 'react';
import { useStore } from './lib/store.jsx';
import { firebaseReady } from './lib/firebase.js';
import Nav from './components/Nav.jsx';
import SignIn from './pages/SignIn.jsx';
import Home from './pages/Home.jsx';
import Lists from './pages/Lists.jsx';
import Predict from './pages/Predict.jsx';
import Board from './pages/Board.jsx';
import Admin from './pages/Admin.jsx';
import { Skeleton } from './components/ui.jsx';

export default function App() {
  const { user, authLoading, isAdmin } = useStore();
  const [page, setPage] = useState('home');
  const [viewListId, setViewListId] = useState(null); // open in Lists detail
  const [editListId, setEditListId] = useState(null); // preselect in Predict

  if (!firebaseReady) return <ConfigNotice />;
  if (authLoading) return <Splash />;
  if (!user) return <div className="min-h-full"><SignIn /></div>;

  const safePage = page === 'admin' && !isAdmin ? 'home' : page;

  const openList = (id) => { setViewListId(id); setPage('lists'); };
  const editList = (id) => { setEditListId(id); setViewListId(null); setPage('predict'); };
  const go = (p) => { setViewListId(null); setPage(p); };

  return (
    <div className="min-h-full text-ink">
      <main className="mx-auto max-w-lg px-4 pt-6 pb-24">
        {safePage === 'home' && <Home setPage={go} />}
        {safePage === 'lists' && (
          <Lists viewListId={viewListId} setViewListId={setViewListId} onEdit={editList} />
        )}
        {safePage === 'predict' && (
          <Predict initialListId={editListId} goLists={() => go('lists')} />
        )}
        {safePage === 'board' && <Board onOpenList={openList} />}
        {safePage === 'admin' && isAdmin && <Admin />}
      </main>
      <Nav page={safePage} setPage={go} isAdmin={isAdmin} />
    </div>
  );
}

function Splash() {
  return (
    <div className="min-h-full">
      <main className="mx-auto max-w-lg px-4 pt-6 pb-24 space-y-4">
        <Skeleton className="h-44 rounded-2xl" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" />
        </div>
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
        <div className="text-center text-xs text-ink/30 pt-2">Yükleniyor…</div>
      </main>
    </div>
  );
}

function ConfigNotice() {
  return (
    <div className="min-h-full flex items-center justify-center px-6">
      <div className="card p-6 max-w-sm text-center">
        <p className="font-display text-2xl">Firebase ayarı gerekli</p>
        <p className="mt-2 text-sm text-ink/60">
          Proje köküne <code className="px-1 bg-black/5 rounded">.env</code> dosyası ekleyip Firebase
          bilgilerini gir. Ayrıntılar <code className="px-1 bg-black/5 rounded">README.md</code> içinde.
        </p>
      </div>
    </div>
  );
}
