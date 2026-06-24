// Uygulama sürüm geçmişi (changelog).
export const CHANGELOG = [
  {
    v: '4.3', date: 'Haziran 2026', items: [
      'Kazanılan rozetler artık kalıcı: koşul sonradan bozulsa bile (ör. 1.’likten düşmek) rozet geri alınmaz.',
    ],
  },
  {
    v: '4.2', date: 'Haziran 2026', items: [
      'Gol krallığı listesinde, bir golcüyü “gol kralı” seçen katılımcıların adı parantez içinde altına yazılır.',
    ],
  },
  {
    v: '4.1', date: 'Haziran 2026', items: [
      'Sıralama grafiğinde geçişler yumuşatıldı; “İsimler” ile çizgi uçlarında isim göster/gizle.',
      'Başarım rozetleri çoğaltıldı: günlük quiz ve site aktifliği (kaç gün uğradın) rozetleri eklendi.',
      'Kişinin kazandığı en üst rozet artık isminin yanında görünüyor (sıralama ve kişi sayfası).',
    ],
  },
  {
    v: '4.0', date: 'Haziran 2026', items: [
      'Sıralama’ya “Grafik” sekmesi: kişilerin zaman içindeki sıra değişimini gösteren çizgi grafiği (bump chart).',
      'Altta ileri/geri kaydırıcı ve “Oynat” ile gün gün sıralama animasyonu; seçili anın puan tablosu ve sıra farkları.',
    ],
  },
  {
    v: '3.9', date: 'Haziran 2026', items: [
      'Günlük quiz süresi 2 dakikaya indirildi; ilerleme çubuğu ve sayaç artık sayfa kaysa da hep üstte sabit.',
      'Karşılaştır’a “Resmi olmayan (projeksiyon) sonuçları da göster” seçeneği eklendi.',
      'Kategori kategori karşılaştırması artık katlanır; açınca puanın hangi maçlardan geldiği iki kişi yan yana dökülür.',
    ],
  },
  {
    v: '3.8', date: 'Haziran 2026', items: [
      'Sürüm bilgisine basınca yalnızca en yeni sürüm görünür; “Daha fazla” ile tüm geçmiş ayrı sayfada.',
      'Ana sayfadaki “çevrimiçi” göstergesine basınca Sıralama’ya gidip online kişiler listelenir.',
      'Sıralamadan bir kişiye girince breadcrumb (Sıralama / kişi) ile geri dönüp kaldığın yerden gezebilirsin.',
    ],
  },
  {
    v: '3.7', date: 'Haziran 2026', items: [
      'Reklam kartındaki “reklam” etiketi köşeye düzgün yerleştirildi (kayma giderildi).',
      'Maç detayında tam skoru bilenler kalın + 🔮 ile gösteriliyor (beraberlik dahil her grupta).',
    ],
  },
  {
    v: '3.6', date: 'Haziran 2026', items: [
      'Yeni kullanıcılara tek seferlik tanıtım (onboarding) sihirbazı: reklam-quiz mantığı anlatılıyor.',
      '“Biten maçları içe aktar” üstteki tema düğmesinin altına ikon olarak taşındı (admin).',
      '“Reklamları kaldır” butonu daha canlı ve dikkat çekici hale getirildi.',
    ],
  },
  {
    v: '3.5', date: 'Haziran 2026', items: [
      'Günlük quiz: 300 soruluk genel kültür bankası, 5 dk süre, ilerleme çubuğu, kazanınca o gün reklamsız.',
      'Sonraki quiz için geri sayım ve "En çok quiz kazanan" liderlik tablosu.',
    ],
  },
  {
    v: '3.4', date: 'Haziran 2026', items: [
      'Reklamları kaldır: 10 soruluk Dünya Kupası bilgi yarışması (50 soruluk banka); 8/10 ile reklamlar kalkar, günde 1 deneme, sonra göster/gizle seçeneği.',
    ],
  },
  {
    v: '3.3', date: 'Haziran 2026', items: [
      'Ana sayfada admin kontrollü reklam alanı (Senin puanın ile Maçlar arasında).',
      'Ana sayfa altına admin için "Biten maçları içe aktar" kısayolu.',
    ],
  },
  {
    v: '3.2', date: 'Haziran 2026', items: [
      'Canlı skor takım eşleşmesi düzeltildi (Bosna Hersek, Yeşil Burun) ve canlı yenileme 30 sn’ye indirildi.',
    ],
  },
  {
    v: '3.1', date: 'Haziran 2026', items: [
      'Admin: "Biten maçları içe aktar" — API’den yalnızca FINISHED maçları önizleyip onayla, Sonuçlar’a yazar (canlı maçlar yazılmaz).',
    ],
  },
  {
    v: '3.0', date: 'Haziran 2026', items: [
      'Maç skorları canlı: ana sayfadaki maç listesi aynı API’den anlık skoru ve dakikayı gösterir (her dakika tazelenir).',
    ],
  },
  {
    v: '2.9', date: 'Haziran 2026', items: [
      'Gol krallığı kartı "Puanlama nasıl işler"in üstünde, katlanır (kapalıyken sadece 1. golcü).',
      'Eski elle gol kralı girişi (Ayarlar) kaldırıldı; veri tamamen canlı API’den.',
    ],
  },
  {
    v: '2.8', date: 'Haziran 2026', items: [
      'Gol krallığı artık ücretsiz canlı API’den çekiliyor (ilk 3 golcü); API yoksa admin girişi yedek.',
    ],
  },
  {
    v: '2.7', date: 'Haziran 2026', items: [
      'Ana sayfada Dünya Kupası gol kralı kartı (admin girer; n8n ile otomatik de beslenebilir).',
    ],
  },
  {
    v: '2.6', date: 'Haziran 2026', items: [
      'Başarımlar katlanır (varsayılan kapalı, meraklandıran başlık); rozete dokununca nasıl kazanıldığı yazar.',
    ],
  },
  {
    v: '2.5', date: 'Haziran 2026', items: [
      'Karşılaştır: detaylı istatistikler artık kategori kategori yan yana (H2H).',
      'Kişiye basınca zengin özet: öne çıkan sayılar, en güçlü kategori, başarımlar vitrini.',
      'Başarımlar (rozetler) sistemi: tam skor serileri, eleme ustalığı, +gün, lider vb.',
      'Üstteki marka başlığına basınca ana sayfaya dönüş.',
      'Turnuva durumunun altında çevrimiçi kişi sayısı (varsa).',
    ],
  },
  {
    v: '2.4', date: 'Haziran 2026', items: [
      'Enteresan istatistikler: geniş havuzdan her sayfa yenilemede rastgele 3 madde gösterilir.',
    ],
  },
  {
    v: '2.3', date: 'Haziran 2026', items: [
      'Enteresan istatistikler artık sürekli kendi kendine değişiyor (6 sn\'de bir döner, çok daha geniş bilgi havuzu).',
    ],
  },
  {
    v: '2.2', date: 'Haziran 2026', items: [
      'Tema (Sistem/Açık/Koyu) sağ üst köşede ikon olarak.',
      'Listeler/Tahminler/Sıralama sayfalarına küçük marka başlığı.',
      'Sıralama filtre/sırala çubuğu artık ikonla açılır (varsayılan kapalı).',
      'Yeni liste oluştur: sistem kilitliyse kapalı, açıksa açık (katlanır).',
      'Puanlama nasıl işler katlanır ve kapalı tercihi hatırlanır.',
      'Admin: grup seçici tek satır, Kişiler iki satırlık dar tasarım, Kayıtlar renk kodlu.',
    ],
  },
  {
    v: '2.1', date: 'Haziran 2026', items: [
      'Sıralamada kategoriye göre sıralama (Eleme/Grup/Tam skor/3.\'ler), online filtre ve isim arama.',
      'Enteresan istatistikler 3 madde ve her oturumda (giriş/çıkış) değişiyor.',
      'İlerleme sayacına dokununca yüzde ↔ kesir.',
    ],
  },
  {
    v: '2.0', date: 'Haziran 2026', items: [
      'Kişi sayfasından kendi puan kartını paylaşma (paylaş ikonu, 9:16 görsel).',
      'Yatay kaydırmalı tam eleme ağacı: tahmin + gerçek sonuç bir arada ("Ağaç" sekmesi).',
      'Maç ve podyum kartlarında takım bayrak rengiyle kimlik vurgusu.',
    ],
  },
  {
    v: '1.9', date: 'Haziran 2026', items: [
      'Avatarlar her zaman isim-soyisim baş harfi (foto kullanılmıyor).',
      'Sıralama bölümüne daha ferah boşluklar.',
    ],
  },
  {
    v: '1.8', date: 'Haziran 2026', items: [
      'Puanlar değişince yukarı sayan animasyon; sıra değişiminde satırların yumuşak kayması.',
      'Bugünün maçlarında "CANLI" rozeti ve maç öncesi geri sayım.',
      'Profil avatarları (baş harf/foto) listelerde, sıralamada ve podyumda.',
      'Tek dokunuşla paylaşılabilir sıralama görseli (story).',
      'Sekmelerde kayan vurgu + içerik geçiş animasyonu.',
      'Yükleme iskeletleri (skeleton) ve dokunsal geri bildirim.',
    ],
  },
  {
    v: '1.7', date: 'Haziran 2026', items: [
      'Maçlar kartında "Kendi skorum" anahtarı: her maçın altında senin tahminin.',
      'Karşılaştır (H2H) içinde kişi başına açılır detaylı istatistik.',
      '"X/72 sonuç" yerine toplam ilerleme oranı (% — grup + eleme).',
    ],
  },
  {
    v: '1.6', date: 'Haziran 2026', items: [
      'Geçici puanlar daha belirgin (büyük buton); grup/3.\'ler/eleme dökümünde kim nereden puan almış detayı.',
      'Tahmin detayında puan rozetleri artık takımları kaydırmıyor (ortada sabit).',
      '"Liste" sayısı "Katılımcı" oldu.',
      'Tahmin düzenlemede kişi seçimi kayan çubuk yerine açılır menü.',
      'Karşılaştır (H2H) artık detaylı istatistik karşılaştırması içeriyor.',
    ],
  },
  {
    v: '1.5', date: 'Haziran 2026', items: [
      'Sıralamada "Geçici puanlar" (projeksiyon): şu anki sonuçlara göre tahmini puanlar — resmî sıralamayı titretmeden, etiketli.',
      'Tahmin detayında her maçın getirdiği puan rozeti (+5/+3, eleme kazananı için ✓).',
    ],
  },
  {
    v: '1.4', date: 'Haziran 2026', items: [
      'Koyu mod (Sistem/Açık/Koyu) — ana sayfadan seçilir.',
      'Yeni puan: doğru eleme eşleşmesi başına puan (tüm turlar).',
      'Yönetim > Ayarlar: tüm puan değerleri düzenlenebilir.',
      'Sıralamada podyum (ilk 3 + avatar) ve "Karşılaştır" (H2H) sekmesi.',
      'Sıralama değişim oku (▲/▼) ve maç sonuçlarında kazanan yeşil / form rozetleri (G/B/M).',
    ],
  },
  {
    v: '1.3', date: 'Haziran 2026', items: [
      'Yönetim > Sıralamalar: "Kimin sıralaması" seçici — gerçek tablo veya herhangi bir kişinin tahmin sıralaması oklarla düzenlenebilir.',
    ],
  },
  {
    v: '1.2', date: 'Haziran 2026', items: [
      'Sıralamada görünüm seçenekleri: Detay / Liste / Tablo (hepsinde puan).',
      'Kategori dökümünde "Bildiğin maçlar" listesi (maç + skor + puan).',
      'Ana sayfada "Enteresan istatistikler" bölümü.',
      'Tahmin yüzdelerinde tüm isimler tam görünür.',
      'Yönetim > Sıralamalar: eşit puan/averajda elle sıralama (üste çıkarma).',
      'Admin modu anahtarı ana sayfada marka satırına taşındı.',
      '"1./2./3. Adım" başlıkları kaldırıldı.',
    ],
  },
  {
    v: '1.1', date: 'Haziran 2026', items: [
      'Ana sayfa: bugünün maçları, gün gezgini (dün/yarın), canlı tahmin yüzdeleri.',
      'Kendi puanın ana sayfada; turnuva günü ve finale kalan gün sayacı.',
      'Sıralamada şampiyon & gol kralı, "en çok puan" rozeti, tıklanır puan dökümü.',
      'Çevrimiçi (Online) göstergesi.',
      'Excel içe aktarım: excely.com şablonundan grup + tüm eleme turları.',
      'Yönetim > Kişiler: ad/e-posta düzenleme, atama, silme istekleri onayı.',
    ],
  },
];
