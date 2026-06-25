const BASE_TABS = [
  { id: 'home', label: 'Ana Sayfa', icon: '⌂' },
  { id: 'results', label: 'Sonuçlar', icon: '▦' },
  { id: 'lists', label: 'Listeler', icon: '☰' },
  { id: 'predict', label: 'Tahmin', icon: '✎' },
  { id: 'board', label: 'Sıralama', icon: '★' },
];
const ADMIN_TAB = { id: 'admin', label: 'Yönetim', icon: '⚙' };
const COLS = { 5: 'grid-cols-5', 6: 'grid-cols-6' };

export default function Nav({ page, setPage, isAdmin }) {
  const tabs = isAdmin ? [...BASE_TABS, ADMIN_TAB] : BASE_TABS;
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-black/10 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className={`mx-auto max-w-lg grid ${COLS[tabs.length] || 'grid-cols-5'}`}>
        {tabs.map((t) => {
          const active = page === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setPage(t.id)}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition ${
                active ? 'text-pitch' : 'text-ink/45'
              }`}
            >
              <span className={`text-lg leading-none ${active ? 'scale-110' : ''} transition`}>{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
