import { useMemo, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { scoreUser } from '../lib/scoring.js';
import { BrandHeader } from '../components/ui.jsx';
import { sharePerson } from '../lib/shareCard.js';

// ---------------------------------------------------------------------------
// Geri bildirim anketi (final öncesi). Kişi başı 1 cevap (surveys/{uid}),
// istediği zaman günceller. Kısa (≈2 dk), adım adım, çoğu soru dokunmatik.
// ---------------------------------------------------------------------------
const FEATURES = [
  'Maçlar (gün gezgini)', 'Son sonuçlar & Maç özeti', 'Puan Durumu', 'Sıralama',
  'Puan Detayı', 'Tahminler (kişi sayfası)', 'Kim yener? bahsi', 'Günlük Quiz',
  'Grafik (puan yarışı)', 'H2H / İstatistik', 'Rozetler',
];

function Stars({ value, onChange }) {
  return (
    <div className="flex justify-center gap-2 py-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => onChange(n)} aria-label={`${n} yıldız`}
          className={`text-4xl transition active:scale-90 ${value >= n ? '' : 'grayscale opacity-35'}`}>⭐</button>
      ))}
    </div>
  );
}
function Nps({ value, onChange }) {
  return (
    <div className="grid grid-cols-6 gap-1.5 py-2">
      {Array.from({ length: 11 }, (_, n) => (
        <button key={n} onClick={() => onChange(n)}
          className={`rounded-lg py-2 text-sm font-bold transition active:scale-95 ${value === n ? 'bg-pitch text-white' : 'bg-black/5 text-ink/70'}`}>{n}</button>
      ))}
    </div>
  );
}
function Chips({ options, value, onChange, multi }) {
  const sel = multi ? (value || []) : value;
  const toggle = (o) => {
    if (multi) onChange(sel.includes(o) ? sel.filter((x) => x !== o) : [...sel, o]);
    else onChange(sel === o ? '' : o);
  };
  return (
    <div className="flex flex-wrap gap-1.5 py-1">
      {options.map((o) => {
        const on = multi ? sel.includes(o) : sel === o;
        return (
          <button key={o} onClick={() => toggle(o)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${on ? 'bg-pitch text-white' : 'bg-black/5 text-ink/70'}`}>{o}</button>
        );
      })}
    </div>
  );
}
function Txt({ value, onChange, placeholder }) {
  return (
    <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3}
      className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-pitch resize-none" />
  );
}

export default function Survey({ goHome, forced, onExit }) {
  const { user, mySurvey, saveSurvey, lists, actual, getPrediction } = useStore();
  const [f, setF] = useState(() => ({
    q1: mySurvey?.q1 || 0, q2: mySurvey?.q2 || 0, q2why: mySurvey?.q2why || '',
    q3: mySurvey?.q3 || [], q4: mySurvey?.q4 || '', q5: mySurvey?.q5 || [], q5other: mySurvey?.q5other || '',
    q6: mySurvey?.q6 || '', q7: mySurvey?.q7 ?? null, q8: mySurvey?.q8 || '',
  }));
  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }));
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  const myList = useMemo(() => lists.find((l) => l.ownerUid === user?.uid) || null, [lists, user]);
  const myRes = useMemo(() => (myList ? scoreUser(getPrediction(myList.id), actual) : null), [myList, actual]);
  const myRank = useMemo(() => {
    if (!myList) return null;
    const rows = lists.map((l) => ({ id: l.id, total: scoreUser(getPrediction(l.id), actual).total })).sort((a, b) => b.total - a.total);
    const i = rows.findIndex((r) => r.id === myList.id);
    return i >= 0 ? i + 1 : null;
  }, [myList, lists, actual]);
  const shareCard = () => myList && myRes && sharePerson({
    list: myList, total: myRes.total, breakdown: myRes.breakdown,
    champion: myRes.bracket?.pred?.champion || '', topScorer: getPrediction(myList.id)?.topScorer || '',
  }, { rank: myRank });
  const bestCat = useMemo(() => {
    if (!myRes) return null;
    const m = { groupMatches: 'Grup maçları', groupTables: 'Grup sıralaması', thirds: "3.'ler", knockout: 'Eleme', finals: 'Finaller' };
    const [k] = Object.entries(myRes.breakdown).sort((a, b) => b[1] - a[1])[0];
    return `${m[k]} (${myRes.breakdown[k]}p)`;
  }, [myRes]);

  const steps = [
    { id: 'q1', title: 'Uygulamanın genel kullanım deneyimini nasıl değerlendirirsin?', need: () => f.q1 > 0,
      body: <Stars value={f.q1} onChange={set('q1')} /> },
    { id: 'q2', title: 'Puanlama sistemi adil ve anlaşılır mı?', need: () => f.q2 > 0,
      body: <><Stars value={f.q2} onChange={set('q2')} /><Txt value={f.q2why} onChange={set('q2why')} placeholder="İstersen kısaca neden? (opsiyonel)" /></> },
    { id: 'q3', title: 'En sık hangi bölümleri kullandın?', hint: 'Birden fazla seçebilirsin',
      body: <Chips options={FEATURES} value={f.q3} onChange={set('q3')} multi /> },
    { id: 'q4', title: 'En sevdiğin TEK özellik hangisi?',
      body: <Chips options={FEATURES} value={f.q4} onChange={set('q4')} /> },
    { id: 'q5', title: 'Kafa karıştıran, gereksiz bulduğun ya da değişmesi gereken bölüm var mı?', hint: 'Opsiyonel',
      body: <><Chips options={[...FEATURES, 'Hiçbiri']} value={f.q5} onChange={set('q5')} multi /><Txt value={f.q5other} onChange={set('q5other')} placeholder="Başka bir şey? (opsiyonel)" /></> },
    { id: 'q6', title: 'Eksik olduğunu düşündüğün veya eklenmesini istediğin özellikler neler?', hint: 'Opsiyonel',
      body: <Txt value={f.q6} onChange={set('q6')} placeholder="Ör. canlı maç bildirimi, özel ligler, ödül sistemi…" /> },
    { id: 'q7', title: '2030’da yine oynar mısın? Bir arkadaşına önerir misin?', hint: '0 = asla · 10 = kesinlikle', need: () => f.q7 != null,
      body: <Nps value={f.q7} onChange={set('q7')} /> },
    { id: 'q8', title: 'Eklemek istediğin yorum ve öneriler', hint: 'Opsiyonel',
      body: <Txt value={f.q8} onChange={set('q8')} placeholder="Aklındaki her şey…" /> },
  ];
  const cur = steps[step];
  const canNext = !cur?.need || cur.need();
  const finish = () => { saveSurvey(f); setDone(true); };

  if (!user) return <div className="p-4"><BrandHeader /><p className="mt-6 text-center text-sm text-ink/50">Anketi doldurmak için giriş yapmalısın.</p></div>;

  if (done) return (
    <div className="p-4 max-w-md mx-auto">
      <BrandHeader />
      <div className="card p-6 mt-4 text-center">
        <p className="text-4xl">🎉</p>
        <p className="font-display text-2xl mt-2">Teşekkürler!</p>
        <p className="text-sm text-ink/55 mt-1">Cevapların kaydedildi. İstediğin zaman dönüp güncelleyebilirsin.</p>
        {myRes && (
          <div className="mt-4 rounded-xl bg-pitch/5 border border-pitch/15 p-3 text-left">
            <p className="text-[11px] font-bold uppercase tracking-wide text-ink/45">Turnuva karnen</p>
            <p className="text-sm mt-1">Toplam <span className="font-display text-pitch-dark">{myRes.total}</span> puan{bestCat ? <> · en güçlü kategorin <span className="font-semibold">{bestCat}</span></> : null}</p>
          </div>
        )}
        {myRes && (
          <button onClick={shareCard} className="mt-3 w-full rounded-full bg-ink text-white py-2 text-sm font-bold active:scale-[.98]">📲 Karneni paylaş</button>
        )}
        <div className="mt-3 flex gap-2">
          <button className="btn btn-ghost flex-1" onClick={() => { setStep(0); setDone(false); }}>Cevapları düzenle</button>
          <button className="btn btn-primary flex-1" onClick={() => (onExit ? onExit() : goHome ? goHome() : window.scrollTo(0, 0))}>{forced ? 'Uygulamaya geç →' : 'Ana sayfa'}</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 max-w-md mx-auto">
      <BrandHeader />
      <div className="mt-3 flex items-center justify-between">
        {forced
          ? <span className="text-xs font-semibold text-ink/50">📝 Devam etmek için anketi doldur</span>
          : <button onClick={goHome} className="text-xs font-semibold text-ink/50">‹ Ana sayfa</button>}
        <span className="text-[11px] text-ink/40">≈2 dk · {step + 1}/{steps.length}</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
        <div className="h-full bg-pitch rounded-full transition-all duration-300" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
      </div>
      {mySurvey && step === 0 && <p className="mt-2 text-[11px] text-ink/45 text-center">Daha önce doldurmuştun — cevaplarını güncelliyorsun.</p>}
      <div className="card p-4 mt-3">
        <p className="font-display text-lg leading-snug">{cur.title}</p>
        {cur.hint && <p className="text-[11px] text-ink/45 mt-0.5">{cur.hint}</p>}
        <div className="mt-2">{cur.body}</div>
      </div>
      <div className="mt-3 flex gap-2">
        {step > 0 && <button className="btn btn-ghost flex-1" onClick={() => setStep(step - 1)}>Geri</button>}
        {step < steps.length - 1
          ? <button className="btn btn-primary flex-1 disabled:opacity-40" disabled={!canNext} onClick={() => setStep(step + 1)}>İleri</button>
          : <button className="btn btn-gold flex-1 disabled:opacity-40" disabled={!canNext} onClick={finish}>Gönder ✓</button>}
      </div>
    </div>
  );
}
