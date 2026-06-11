import { useStore } from '../lib/store.jsx';

export default function SignIn() {
  const { signIn } = useStore();
  return (
    <div className="min-h-full flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="relative overflow-hidden rounded-3xl bg-ink text-white p-7">
          <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-pitch/30 blur-2xl" />
          <div className="absolute right-5 bottom-3 text-7xl opacity-10 font-display">26</div>
          <p className="label text-white/60">FIFA Dünya Kupası 2026</p>
          <h1 className="font-display text-5xl leading-none mt-1">Tahmin<br />Oyunu</h1>
          <p className="mt-3 text-sm text-white/70">
            Google ile giriş yap, kendi listeni oluştur ve arkadaşlarınla yarış.
          </p>
        </div>

        <button
          onClick={signIn}
          className="mt-5 w-full btn bg-white border border-black/10 text-ink hover:bg-black/5 py-3"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.3 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 3.5 29.5 1.5 24 1.5 11.6 1.5 1.5 11.6 1.5 24S11.6 46.5 24 46.5 46.5 36.4 46.5 24c0-1.2-.1-2.4-.4-3.5z"/>
            <path fill="#FF3D00" d="M3.9 13.7l6.6 4.8C12.3 14.9 17.7 11 24 11c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 3.5 29.5 1.5 24 1.5 15.5 1.5 8.2 6.3 3.9 13.7z"/>
            <path fill="#4CAF50" d="M24 46.5c5.2 0 10-1.9 13.6-5.1l-6.3-5.3C29.2 37.6 26.7 38.5 24 38.5c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 41.6 16.2 46.5 24 46.5z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.6l6.3 5.3C40.9 36.3 46.5 31 46.5 24c0-1.2-.1-2.4-.4-3.5z"/>
          </svg>
          Google ile giriş yap
        </button>

        <p className="mt-4 text-center text-xs text-ink/45">
          Giriş yaparak listeni oluşturabilir ve tahminlerini kaydedebilirsin.
        </p>
      </div>
    </div>
  );
}
