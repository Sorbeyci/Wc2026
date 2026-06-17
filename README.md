# Dünya Kupası 2026 — Tahmin Oyunu ⚽

Arkadaşlarınla oynayabileceğin, mobil öncelikli bir Dünya Kupası 2026 tahmin uygulaması.
Oyuncular Google ile giriş yapar, kendi **listesini** oluşturur; her grup maçını, grup
sıralamalarını, tüm eleme bracket'ını, podyumu ve gol kralını tahmin eder. Puanlar
otomatik hesaplanır ve canlı sıralama tablosunda gösterilir.

**React + Vite + Tailwind CSS** ile yazıldı. Veriler **Firebase** (Google ile giriş +
Firestore) üzerinde tutulur ve cihazlar arasında gerçek zamanlı senkronize olur.

Turnuva fikstürü (48 takım, A–L 12 grup, 72 grup maçı) `WORLD CUP 2026.xlsx` dosyandan
üretildi ve `src/data/tournament.js` içinde durur. Takım adları sayfadaki gibi Türkçe...

---

## Kurulum

[Node.js](https://nodejs.org) 18+ gerekir.

```bash
npm install
```

### 1) Firebase projesi

1. [Firebase Console](https://console.firebase.google.com) → yeni proje oluştur.
2. **Build → Authentication → Sign-in method → Google**'ı etkinleştir.
3. **Build → Firestore Database → Create database** (production modda başlayabilirsin).
4. **Project settings → General → Your apps → Web** uygulaması ekle; SDK config'i kopyala.

### 2) `.env` dosyası

Proje köküne `.env.example`'ı kopyalayıp `.env` yap ve doldur:

```bash
cp .env.example .env
```

```
VITE_FB_API_KEY=...
VITE_FB_AUTH_DOMAIN=...
VITE_FB_PROJECT_ID=...
VITE_FB_STORAGE_BUCKET=...
VITE_FB_SENDER_ID=...
VITE_FB_APP_ID=...
VITE_ADMIN_EMAILS=senin@gmail.com
```

`VITE_ADMIN_EMAILS` içine yönetici Google e-postanı yaz (virgülle birden fazla olabilir).
Yöneticiler birden fazla liste oluşturabilir ve gerçek sonuçları girebilir.

### 3) Firestore güvenlik kuralları

`firestore.rules` dosyasını Firebase Console → **Firestore → Rules** içine yapıştır.
İçindeki `isAdmin()` e-posta listesini `.env`'deki `VITE_ADMIN_EMAILS` ile aynı yap.

### 4) Çalıştır

```bash
npm run dev      # http://localhost:5173
npm run build    # dağıtım için dist/
```

Vercel/Netlify'a dağıtırken: framework **Vite**, build `npm run build`, çıktı `dist`.
Ortam değişkenlerini (VITE_*) eklemeyi ve Authentication → Settings →
**Authorized domains** içine dağıtım alan adını eklemeyi unutma.

---

## Nasıl oynanır

1. **Google ile giriş yap.**
2. **Listeler** — kendi listeni oluştur. (Normal oyuncu 1, yönetici sınırsız.)
3. **Tahmin** — aktif listeyi seç ve doldur:
   - **Maçlar** — 72 grup maçının skoru.
   - **Gruplar** — her grubu bitiş sırasına diz (ilk 2 üst tura çıkar).
   - **Eleme** — kim kiminle eşleşir, skor, tur atlayan; ayrıca şampiyon, ikinci,
     üçüncü, dördüncü ve gol kralı.
4. **Yönetim** (sadece admin) — maçlar oynandıkça gerçek sonuçları gir. Puanlar
   anında yeniden hesaplanır.
5. **Sıralama** — canlı **Sıralama** ve **İstatistik**.

Tahminler ve sonuçlar Firestore'da tutulduğu için herkes kendi cihazından girer,
sıralama herkeste aynı anda güncellenir.

---

## Puanlama

| Ne | Puan |
|---|---|
| Tam grup maçı skoru | 5 |
| Sadece doğru sonuç (G/B/M) | 3 |
| Üst tura çıkan takım (her takım, ilk 2) | 10 |
| Doğru grup sırası (her takım) | 5 |
| Eleme eşleşmesi doğru | 10 |
| Eleme tam skoru | 5 (doğru sonuç için 3) |
| Tur atlayan — Son 32 / Son 16 | 20 |
| Tur atlayan — Çeyrek Final | 40 |
| Tur atlayan — Yarı Final | 60 |
| Şampiyon | 80 |
| İkinci | 50 |
| Üçüncü | 30 |
| Dördüncü | 20 |
| Üçüncülük maçında yer alan takım (her takım) | 20 |
| Gol kralı | 50 |

Tam skor ve doğru sonuç toplanmaz — tam skor 5 puandır, o kadar.

Tüm puan değerleri tek yerde: `src/lib/scoring.js` içindeki `SCORING`. Son 16 için
orijinal istekte ayrı bir sayı verilmediğinden Son 32 ile aynı (20) ayarlandı;
`SCORING.knockout.advance.R16` ile değiştirebilirsin....

---

## Proje yapısı

```
src/
├─ main.jsx                # giriş
├─ App.jsx                 # kabuk + giriş kontrolü + sekme yönlendirme
├─ index.css               # Tailwind + bileşen sınıfları
├─ data/
│  ├─ tournament.js        # takımlar, gruplar, 72 maç, eleme turları
│  └─ flags.js             # takım → bayrak (flagcdn) eşlemesi
├─ lib/
│  ├─ firebase.js          # Firebase init, Google provider, admin tespiti
│  ├─ store.jsx            # auth + Firestore state + aksiyonlar (debounce yazma)
│  └─ scoring.js           # tüm puanlama fonksiyonları + SCORING ayarı
├─ components/             # Nav, ListPicker, KoMatch, ui (Flag, ScoreBox…)
└─ pages/
   ├─ SignIn.jsx           # Google ile giriş
   ├─ Home.jsx, Lists.jsx, Predict.jsx
   ├─ GroupMatches.jsx, GroupRankings.jsx, Knockout.jsx
   ├─ Board.jsx            # sıralama + istatistik
   └─ Admin.jsx            # gerçek sonuç girişi (sadece admin)
```

### Firestore veri modeli

```
/config/actual            → gerçek sonuçlar (admin yazar)
/lists/{listId}           → { ownerUid, ownerName, name, color, createdAt, prediction }
```

`prediction.groupMatches[maçNo] = { home, away }`, `groupTables[grup] = [1.,2.,3.,4.]`,
`knockout[turId] = [{ home, away, hs, as, advancer }]`,
`finals = { champion, runnerUp, third, fourth, topScorer }`.

## Bayraklar

Bayraklar [flagcdn.com](https://flagcdn.com) üzerinden görsel yüklenir; açılır listelerde
emoji bayrak kullanılır. Eşleme `src/data/flags.js` içinde.

## Fikstürü güncelleme

`src/data/tournament.js` içindeki `GROUPS` ve `GROUP_MATCHES` dizilerini düzenle; geri
kalan her şey bunlardan türer.
