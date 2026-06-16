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
      <ThemeToggle />
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

function ThemeToggle() {
  const { theme, setTheme } = useStore();
  const I = {
    system: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>,
    light: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>,
    dark: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>,
  };
  const opts = [['system', 'Sistem'], ['light', 'Açık'], ['dark', 'Koyu']];
  return (
    <div className="fixed top-2 right-2 z-50 flex rounded-full bg-ink/85 backdrop-blur p-0.5 shadow-lg border border-white/10">
      {opts.map(([id, label]) => (
        <button key={id} onClick={() => setTheme(id)} title={label} aria-label={label}
          className={`h-8 w-8 grid place-items-center rounded-full transition ${theme === id ? 'bg-white text-ink' : 'text-white/65'}`}>
          {I[id]}
        </button>
      ))}
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
