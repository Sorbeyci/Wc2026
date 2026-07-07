// Uygulama sürüm geçmişi (changelog).
export const CHANGELOG = [
  {
    v: '6.14', date: 'Temmuz 2026', items: [
      'Eleme dökümü artık tam detaylı ve puanlamayla birebir tutarlı: “Tam skor” ve “Doğru sonuç” listeleri düzeldi (eskiden boş/yanlış görünüyordu) — her maçta tur, takımlar, senin skorun ve gerçek sonuç görünür.',
      '“Son 32/16/Çeyrek/Yarı doğru” dökümü artık tur atlatan doğru TAKIMLARI (bayraklı) gösteriyor — eşleşme (+10) yerine tur atlatma (+20/+40/+60) puanının kaynağı net.',
    ],
  },
  {
    v: '6.13', date: 'Temmuz 2026', items: [
      'Eleme skor puanı (tam skor +5 / doğru sonuç +3) düzeltildi: artık EŞLEŞME bazlı — o iki takımın maçını doğru sk/sonuçla bildiysen, bracketinde farklı bir slotta tahmin etmiş olsan bile puanı alırsın. Örn. Portekiz 3-1 Hırvatistan diyip gerçek Portekiz 2-1 olunca +3.',
      'Böylece elemede üç puan türü de artık eşleşmeden/slottan bağımsız: tur atlatma (takım bazlı), eşleşme (+10) ve skor (+5/+3).',
    ],
  },
  {
    v: '6.12', date: 'Temmuz 2026', items: [
      'Eleme tur atlatma puanı düzeltildi: bir turda tur atlatan seçtiğin takım gerçekten tur atladıysa, EŞLEŞMEYİ tutturmasan da takım başına puanı alırsın (Son 32→Son 16 için +20). Örn. Paraguay’ı tur atlatan seçen herkes, hangi eşleşmede seçtiğine bakılmaksızın +20 alır.',
    ],
  },
  {
    v: '6.11', date: 'Haziran 2026', items: [
      '“Kim yener?” bahsi daha minimalist ve kompakt; oy yüzdeleri animasyonlu doluyor ve oyun anında işleniyor.',
      'Ana Sayfa veya Sıralama’ya (alt menü) basınca sayfa en baştan açılır.',
      'Sıralama’da bir kişiye girip geri dönünce liste kaldığın yerden devam eder (yalnızca geri dönüşte; alt menüden girişte baştan).',
      'Çevrimiçi göstergesi artık avatarın köşesinde küçük nokta — güncellenince sayfa kaymıyor.',
      'Paylaş butonu üste, “çevrimiçi” satırının yanına taşındı; sabit yükseklikli başlık ile kayma yok.',
      'Geçici puanlar (canlı projeksiyon) tercihi artık hatırlanıyor (sayfa yenilense de açık kalır).',
      'Enteresan istatistikler artık rastgele (sırayla değil) geliyor; bir bilgi, diğerlerinin tamamı gösterilene kadar tekrar gelmiyor.',
    ],
  },
  {
    v: '6.10', date: 'Haziran 2026', items: [
      '“Kim yener?” bahsinde verdiğin oy artık anında işleniyor — sonucu görmek için sayfayı yenilemeye gerek yok.',
      'Enteresan istatistikler her yenilemede sıradakini gösteriyor: bir bilgi, sistemdeki tüm bilgiler dolaşılana (tam bir tur) kadar sana tekrar gelmiyor.',
      'Bahis kutucuklarındaki bayraklar kaldırıldı (üstte zaten var) — göz yormasın.',
    ],
  },
  {
    v: '6.9', date: 'Haziran 2026', items: [
      'Sıralama’dan bir kişiye girince doğrudan “Tahminler” sekmesi açılır ve o an oynanan eleme turuna (Son 32 / Son 16 …) kaydırır.',
      'Tahminler üst gezinme çubuğu artık iki satıra sığıyor (yatay kaymıyor), daha canlı ve aktif tur vurgulu.',
      'Sıralama’da bir kişiye girip geri dönünce liste kaldığın yerden devam eder — en başa atmaz.',
      'Kişi sayfasında “Excel olarak dışa aktar” artık paylaş butonunun yanında ikon olarak.',
      'Enteresan istatistikler artık eleme turlarını da kapsıyor (eşleşme, tur atlatan, sürpriz vb.).',
      'Puan Durumu’nda gruplar ve “En iyi 3.’ler” katlanır oldu (varsayılan kapalı); eleme ağacı açık gelir ve sayfa açılınca doğrudan oraya kaydırır.',
      'Yeni: puana etkisiz “Kim yener?” bahsi — Maçlar’da her eleme maçı için. Maç başlamadan 1 saat önce kapanır, oy yüzdesini (% dilim) gösterir.',
    ],
  },
  {
    v: '6.8', date: 'Haziran 2026', items: [
      'Sıralama’da bir kişiye girince sayfa en baştan (yukarıdan) açılıyor.',
      '“Yukarı çık” butonu daha fazla sayfada: kişi detayı, Listeler, Tahmin formu (Ana sayfa, Sıralama ve Puan Durumu’nda zaten vardı).',
      'Tahminler sekmesinde gruplar artık katlanır — varsayılan kapalı; tek tek aç/kapat veya “Tümünü aç/kapat”. Üstte hızlı gezinme linkleri (Gruplar · Son 32 · Son 16 · Çeyrek · Yarı · Final) ile bölümlere kayar; açılışta Son 32 turu açık gelir.',
      'Sıralama kategori satırına Eleme ile Final arasına “Son 32” eklendi: kişinin Son 32’ye soktuğu takım sayısını gösterir; dokununca o takımlar (doğru çıkanlar + çıkaramadıkları) listelenir.',
    ],
  },
  {
    v: '6.7', date: 'Haziran 2026', items: [
      'Eleme dağılımında “Bir takımı tutturan” artık takıma göre gruplanıp bayraklı gösteriliyor (ör. 🇩🇪 Almanya başlığı altında o takımı tutanlar) — okumak daha kolay.',
      'Henüz belli olmayan eleme tarafı “75. galibi” yerine o eşleşmenin iki takımını bayraklı gösteriyor (ör. 🇳🇱 Hollanda / 🇲🇦 Fas).',
      'Eleme maçı kapalıyken: bu eşleşmede stake’in varsa küçük yıldız — ★ (altın) eşleşmeyi tuttun, ★ (gri) bir takımı tuttun.',
    ],
  },
  {
    v: '6.6', date: 'Haziran 2026', items: [
      'Maç özetleri (TRT Spor) artık eleme maçlarını da kapsıyor: Son 32/16/Çeyrek/Yarı/Final için de özet aranır ve bulunur (round etiketiyle eşleştirme). Tarama, manuel seçim ve sayaç grup + eleme maçlarını birlikte sayar.',
      '“Son sonuçlar” kartında eleme maçları (Son 32, Son 16, …) da görünür — skoru ve maç özeti linkiyle.',
      'Eleme dağılımında (Maçlar > maça dokun): “Bir takımı tutturan” artık hangi takımı tutturduğunu, “Eşleşmeyi tutturan” ise kişinin tahmin skorunu gösterir.',
    ],
  },
  {
    v: '6.5', date: 'Haziran 2026', items: [
      'Eleme maçı puan rozetleri düzeltildi (liste inceleme): +5 (tam skor) / +3 (doğru galip) artık yalnızca doğru eşleşmeyi (iki takımı) tutturana gösterilir. Yanlış eşleşmede (ör. tahmin G. Kore, gerçek G. Afrika) sadece ✓20 (doğru tur atlatan) kalır; skor gerçek ev/deplasmana göre hizalanır.',
    ],
  },
  {
    v: '6.4', date: 'Haziran 2026', items: [
      'Eleme skorları da otomatik içe aktarılır (Aktar): Son 32’den itibaren biten eleme maçları gerçek brackete göre eşleştirilip Sonuçlar’a yazılır — skor + kazanan (penaltı galibi dahil).',
      '“Maçlar” takviminde eleme maçları artık tıklanınca açılıyor; o eşleşmeyi tutturan, skoru/galibi bilen ve bir takımı tutturan kişiler listeleniyor.',
      'Eleme puanlaması düzeltildi: +5 (tam skor) ve +3 (doğru galip) artık yalnızca doğru eşleşmeyi (iki takımı) tutturana verilir; skor, ev/deplasman sırasından bağımsız takımlara göre hizalanır.',
      'Ana sayfada eleme maçının gerçek skoru gösteriliyor (ör. 0-1); önceden yalnızca ✓ görünüyordu.',
    ],
  },
  {
    v: '6.3', date: 'Haziran 2026', items: [
      '“Maçlar” takvimine eleme turu fikstürleri eklendi (Son 32, Son 16, Çeyrek, Yarı, Üçüncülük, Final) — tarih ve saatleriyle. Takımlar netleştikçe yazılır; belli değilse “1A / 2B / 74. galibi” gibi kaynak gösterilir.',
    ],
  },
  {
    v: '6.2', date: 'Haziran 2026', items: [
      'Banner butonları mobilde tek satıra sığacak şekilde küçültüldü.',
      'Banner durum yazısı 10 saniyede bir iki metin arasında fade ile değişiyor (faz/oynanan maç ↔ gün/finale sayacı).',
      'Puan Durumu grup tablolarında form rozetleri (G/M/B) ve puan sütunu hizalandı (artık kaymıyor).',
      '“Kendi puan durumunla karşılaştır” butonu dikkat çekici hale getirildi (renkli arka plan + yanıp sönen nokta).',
    ],
  },
  {
    v: '6.1', date: 'Haziran 2026', items: [
      'Banner düzenlendi: “Puan Durumu” butonu sarı yapıldı, üç buton biraz küçültüldü.',
      'Banner başlığı: “kupayikimalir.com / FIFA Dünya Kupası 2026” üstte bitişik; “Tahmin Oyunu” tek satır.',
      'Turnuva durumu satırı yenilendi: gün sayacı yerine faz + oynanan maç sayısı (ör. “⚽ Grup aşaması · 32/104 maç oynandı”).',
    ],
  },
  {
    v: '6.0', date: 'Haziran 2026', items: [
      'Ana Sayfa ve Sıralama sayfalarına “yukarı çık” butonu eklendi.',
      'Banner’a “Puan Durumu” butonu (Tahmin yap ile Sıralama arasına) eklendi.',
      'Ana Sayfa’da hızlı aşağı-kaydır bağlantıları: Maçlar, Son sonuçlar, Liderler, Gol krallığı.',
      'Sıralama grafiğinde “İsimler” varsayılan açık; oynatırken grafik sağa kayarken isimler ekranda takip eder.',
      '“Sıralamayı paylaş (story)” küçük bir ikon oldu (sayfayı aşağı büyütmüyor).',
      'Ana Sayfa’da “kişi çevrimiçi” göstergesi kaybolunca oluşan kayma düzeltildi.',
    ],
  },
  {
    v: '5.9', date: 'Haziran 2026', items: [
      'Admin · Maç özetleri: tek maç seçip API’de tek tek aratma ve bulunmayanlara elle YouTube linki ekleme/kaldırma eklendi.',
      'Arka planda otomatik özet arama için aç/kapa anahtarı; kapalıyken kullanıcılar siteyi açınca otomatik YouTube araması yapılmaz.',
    ],
  },
  {
    v: '5.8', date: 'Haziran 2026', items: [
      'Maç özeti seçimi güçlendirildi: “özet/Petrol Ofisi” daha yüksek puan alır; maç sonu, yorumlar, tanıtım, röportaj, kamp gibi özet olmayan videolar elenir. Doğru özet listede kaçıncı sırada olursa olsun seçilir.',
    ],
  },
  {
    v: '5.7', date: 'Haziran 2026', items: [
      'Maç özeti aramaları artık Türkiye bölgesiyle (regionCode=TR) yapılıyor; TRT’nin Türkiye’ye kısıtlı (yayın hakkı) özet videoları yurt dışı sunucudan da bulunabiliyor.',
    ],
  },
  {
    v: '5.6', date: 'Haziran 2026', items: [
      'Maç özeti bulma iyileştirildi: arama 25 sonuç + tarihe göre sıralanıyor; gerçek özet (maç sonrası, en yeni) artık önizleme/kamp videolarının önüne geçip yakalanıyor.',
    ],
  },
  {
    v: '5.5', date: 'Haziran 2026', items: [
      'Maç özeti: arama sorgusu yenilendi (bayat boş önbelleği kırar), maç önü/canlı/röportaj gibi videolar elenir, boş sonuçlar artık uzun süre önbelleğe alınmaz; Admin’e “Teşhis” butonu eklendi.',
    ],
  },
  {
    v: '5.4', date: 'Haziran 2026', items: [
      'Maç özeti çekme düzeltildi: 304 önbellek yanıtı yüzünden özetler boş dönüyordu; istek artık no-store ile yapılıyor. Katı tarih elemesi kaldırıldı (yanlış elemeleri önler).',
    ],
  },
  {
    v: '5.3', date: 'Haziran 2026', items: [
      'Maç özeti eşleştirmesi sıkılaştırıldı: yalnız “2026 Dünya Kupası + grup” başlıkları kabul edilir; Kadınlar/gençlik/eleme/hazırlık videoları ve maçtan önce yüklenenler elenir (yanlış videoların önüne geçer).',
      'Admin’e “Tümünü yeniden tara (yanlışları düzelt)” eklendi; hatalı linkleri düzeltir/kaldırır.',
    ],
  },
  {
    v: '5.2', date: 'Haziran 2026', items: [
      'Maç özeti tanılama: YouTube hata sebebi artık görünür + Admin’de “Bağlantıyı test et” butonu (403/anahtar sorunlarını anında gösterir).',
    ],
  },
  {
    v: '5.1', date: 'Haziran 2026', items: [
      '“Son sonuçlar” kartına gün gün ‹ › gezinme eklendi; en sondaki sayfa en yeni biten maçlardır.',
      'Maç özeti: biten maçlar için TRT Spor kanalından YouTube özet videosu bulunup “▶ Maç özeti” linki konur. Admin · Ayarlar’dan geriye dönük tarama yapılır.',
    ],
  },
  {
    v: '5.0', date: 'Haziran 2026', items: [
      'Gerçek Puan Durumu’na görsel eleme ağacı eklendi: takımlar gruplar bittikçe netleşir, boş kutular grup kökenini (1A, 2B, 3.) gösterir.',
      '“Kendi puan durumunla karşılaştır” aç/kapa: gruplarda senin tahmin sıranı işaretler (✓ tam, sarı = senin sıran).',
      'Aşağı kayınca “↑ yukarı” butonu çıkar; sayfa başına döndürür.',
      '“En iyi 3.’ler Puan tablosuna git” ve “Eleme ağacını gör” kısayolları.',
    ],
  },
  {
    v: '4.9', date: 'Haziran 2026', items: [
      'Gerçek Puan Durumu sayfasına grup kısayolları (A B C …) eklendi; basınca o gruba kaydırır.',
      'Alt menüdeki “Sonuçlar” sekmesi “Puan Durumu” olarak adlandırıldı.',
    ],
  },
  {
    v: '4.8', date: 'Haziran 2026', items: [
      'Tahminler kilitliyken alt menüde Listeler/Tahmin gizlenir; ana sayfadaki “Tahmin yap” butonu bulanıklaşır.',
      'Gerçek Sonuçlar sayfasında üstte “En iyi 3.’ler tablosuna git” kısayolu.',
      'Sıralama sayfasındaki ara sıra olan anlık yukarı kayma düzeltildi.',
    ],
  },
  {
    v: '4.7', date: 'Haziran 2026', items: [
      'Gerçek Sonuçlar sayfası düzeltildi: puanlar artık doğru görünüyor + G/M/B form rozetleri eklendi.',
      'Gerçek Sonuçlar’a “En iyi 3.’ler” tablosu eklendi (ilk 8 üst tura çıkar).',
      'Quiz bitince doğru cevaplar 15 saniye gösteriliyor; nerede doğru/yanlış yaptığın işaretli.',
    ],
  },
  {
    v: '4.6', date: 'Haziran 2026', items: [
      'Yeni “Sonuçlar” sekmesi: girilen skorlara göre güncel grup puan durumunu grup grup gösterir.',
      'Eleme “Doğru eşleşme” detayı projeksiyonda da doğru açılıyor (Son 32 eşleşmeleri artık listede görünüyor).',
    ],
  },
  {
    v: '4.5', date: 'Haziran 2026', items: [
      'Sıralama döküm satırlarına dokununca detay açılıyor: ör. “Doğru eşleşme” → hangi eşleşmeleri bildiğin; tam skor/sonuç → bildiğin maçlar; final → senin tahminin vs gerçek.',
    ],
  },
  {
    v: '4.4', date: 'Haziran 2026', items: [
      'Puanlama: üst tura çıkacağını doğru tahmin ettiğin her takım +10 — takımın 1., 2. ya da 3. olarak çıkması fark etmez.',
    ],
  },
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
