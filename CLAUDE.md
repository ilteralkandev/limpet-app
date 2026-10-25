@AGENTS.md

# Limpet

Kullanıcının seçtiği ilgi alanlarından (yazılım, finans, felsefe…) 1-2 cümlelik bilgileri iOS kilit ekranında bir **Live Activity** kartı olarak sabitleyen ve seçilen aralıkta yenileyen Expo uygulaması. Yalnızca iOS 16.2+ hedeflenir; Android/web derlenir ama kilit ekranı katmanı no-op'tur.

## Mimari ve veri akışı

```
content/ (statik host: Netlify; repodaki content/ klasörü her push'ta yayınlanır)
   └─ index.json (katalog) + topics/<id>.json (paketler)
        │ fetch: Ayarlar'da "Kaydet", açılışta/öne gelince (6 saatte bir) ve elle "Paketleri güncelle"
        ▼
src/lib/content/cache.ts  → AsyncStorage'a paket önbelleği (çevrimdışı çalışır)
        ▼
src/lib/engine.ts  rotate()  ← UI (30 sn'de bir + uygulama öne gelince) ve arka plan görevi
        │ src/lib/rotation.ts (saf mantık: deck, isDue, advance)
        ▼
src/live-activity/index.ios.ts → FactActivity.ios.tsx (expo-widgets createLiveActivity)
```

- `engine.ts` tek giriş noktasıdır: kartı ilerletme ve kilit ekranını senkronlama hep `rotate()` üzerinden geçer. `rotate()` ağa çıkmaz; ağ yalnızca `applyPreferences()` içindedir.
- Rotasyon durumu indeks değil `factId` ile saklanır; konu eklenip çıkarıldığında kart kaybolursa deste başa sarar.

## Kritik kurallar ve tuzaklar

- **Live Activity kütüphanesi `expo-widgets`'tır.** `expo-live-activity` Haziran 2026'da arşivlendi; geri eklemeyin.
- **`'widget'` direktifli fonksiyonlar** (`FactActivity.ios.tsx`) ayrı bir runtime'da çalışır: yalnızca `@expo/ui/swift-ui` bileşenleri ve modifier'ları, props ve `environment` kullanılır. Hook, uygulama state'i, async iş ve fonksiyon dışında tanımlanmış yardımcı/sabit kullanılamaz. Kart içeriğini değiştirmek = props tipini (`FactActivityProps`) ve `index.ios.ts`'deki eşlemeyi birlikte değiştirmek.
- **Platform ayrımı dosya uzantısıyla yapılır:** `live-activity/index.ios.ts` gerçek uygulama, `index.ts` no-op. `createLiveActivity` modül yüklenirken yerel modülü oluşturduğu için iOS dışı koddan `FactActivity.ios.tsx` import edilmez.
- **Arka plan güncellemesi garantisiz:** `expo-background-task` en az 15 dk, zamanlamayı iOS belirler, simülatörde çalışmaz, uygulama kullanıcı tarafından kapatılırsa durur. Live Activity arka planda *güncellenebilir* ama *başlatılamaz*; iOS etkinliği ~8 saat sonra bitirir. Uygulama açılınca `rotate()` etkinliği yeniden başlatır. Güvenilir zamanlama gerekirse yol APNs push'tur (`enablePushNotifications` + sunucu) — henüz yok.
- `src/tasks/rotate-task.ts` `defineTask`'ı modül seviyesinde çağırır ve kök `_layout.tsx` onu import eder; bu import kaldırılırsa arka plan görevi sessizce çalışmaz.
- Native klasörler (`ios/`, `android/`) CNG ile üretilir ve gitignore'dadır. Native ayar = `app.json` plugin seçenekleri.

## Kilit ekranı / Dynamic Island ayrımı

- iOS'ta tek bir Live Activity hem kilit ekranı kartını hem Dynamic Island'ı çizer; yüzeyler API'de ayrı açılıp kapatılamaz. Bu yüzden `FactActivity` props'u `lockScreen`/`island` bayrakları taşır: `island=false` → ada bölümleri `undefined` (boş), `lockScreen=false` → kart yerine tek satırlık sessiz şerit (iOS çalışan etkinlik için kartı her zaman çizer ve minimum boyut uygular; tamamen gizlenemez). İkisi de kapalıysa etkinlik sonlandırılır (`isLiveActive`, `surfaces` — `preferences.ts`).
- Ada anahtarı yalnızca Dynamic Island'lı telefonlarda görünür: `app-state.tsx` üst güvenli alan ≥ 55pt ise `islandCapable`'ı bir kez tercihlere yazar (arka plan görevinin güvenli alan bilgisi yoktur).
- Ada görünümünü simülatörde ekran görüntüsüyle doğrulayamadık (simülatör adayı ana ekranda çizmiyor); kilit ekranı tarafı doğrulandı.
- `axe tap` ile `Switch` açmak için `--tap-style physical` gerekir; varsayılan dokunuş anahtarı çevirmez.

## Yayın hazırlığı

- Mağaza yayın kılavuzu, metinler ve ret riskleri: `docs/app-store.md`. Yasal sayfalar `content/legal/*.html` (Netlify'da `/legal/...`), uygulamada Ayarlar altbilgisinden açılır; içlerindeki `[GELİŞTİRİCİ ADI…]`/`[İLETİŞİM E-POSTASI]` yer tutucuları doldurulmadan yayınlanmamalı (`content:validate` uyarır). `eas.json` EAS derleme/gönderim profillerini içerir. `assets/icon.png` alfa kanalsız olmalı (App Store reddeder); yeniden üretilirse `flatten` edilmeli.

## Performans notları

- `rotate()` her 30 sn çalışır; bu yüzden ayrıştırılmış paketler bellekte tutulur (`content/cache.ts` `memory`), deste yalnızca girdileri değişince yeniden kurulur (`engine.ts` `deckFor`) ve `app-state.tsx` `sync` yalnızca değişen state'i günceller (sessiz bir dakikada ekranlar yeniden çizilmez). Paket yazan her yeni kod `memory`'yi de güncellemeli.
- `TideBar` 15 sn'de bir güncellenir (saniyelik JS tick'i gereksizdi). Gölgeli görünümler opak arka plana sahip olmalı ya da gölge kullanılmamalı (`overflow: 'hidden'` gölgeyi zaten keser; Metro'daki "shadow set but cannot calculate shadow efficiently" uyarısı bunu işaret eder).
- Açılış `checkContent` (ağ) beklemez; ilk kart hazır olunca uygulama görünür. `TopicGrid` kutuları `memo`; `onToggle` kararlı (`useCallback`) olmalı.

## Zaman çizelgesi, bildirimler ve görsel paylaşım

- Deste bir **zaman çizelgesidir**: aralık başına bir kart, uygulama kapalı olsa da. `rotate()` kaç aralık geçtiyse (`dueSteps`) o kadar ilerler ve `shownAt`'ı çizelgeye hizalı tutar (`shownAt + adım × aralık`); "Sonraki" düğmesi (force) çizelgeyi şimdiden yeniden başlatır.
- Yerel bildirimler (`lib/notifications.ts`, `expo-notifications`, sunucu yok) **tek tek** gelir: aynı anda en fazla 1 bekleyen bildirim vardır (sonraki aralık sınırı, `nextNotification`; gece 23:00–08:00 slotları atlanır ama kartlar yine geçer, böylece bildirim her zaman uygulamanın o an göstereceği kartı gösterir: `cardAtTime`). Bir bildirim ateşlendikten sonra yenisi yalnızca önceki Bildirim Merkezi'nden kalktıysa (kaydırıldı/dokunuldu: `getPresentedNotificationsAsync`) ya da uygulama açıldıysa planlanır; yanıtsız bildirimler üst üste birikmez. Kontrol her `rotate()` çağrısında (uygulama açılışı, 30 sn'lik yoklama, arka plan görevi) çalışır: kullanıcı bildirimi sildikten sonra sonrakinin gelmesi iOS'un arka plan görevini çalıştırmasına bağlıdır; uygulama açılınca hemen planlanır. iOS bildirim kaydırmasında uygulamayı uyandırmayı garanti etmez (Expo `UNNotificationDismissActionIdentifier`'ı da desteklemiyor), bu yüzden dismiss eylemine güvenilmez. Bildirimde "Favorilere ekle" düğmesi vardır (kategori `fact`; arka planda çalışır, uygulama kapalıysa dokunuş sonraki açılışta işlenir: `subscribeFavoriteActions`). Uygulama öne gelince Bildirim Merkezi'ndeki kalıntılar temizlenir. Tercih varsayılan kapalıdır, izin Ayarlar'daki anahtarla istenir (`setNotificationsEnabled`). `app.json`'a `expo-notifications` eklentisi eklenmedi: yerel bildirimler için push yetkisi gerekmez.
- Paylaşım artık görseldir: `components/ShareImage.tsx` ekran dışında 360×450'lik kartı çizer, `react-native-view-shot` ile 1080×1350 PNG yapar ve `Share.share({url})` açar; başarısız olursa düz metne düşer (`lib/share.ts`). `ShareImageProvider` kök `_layout.tsx`'tedir, `useShareImage()` ile kullanılır.
- İki yeni yerel modül (`expo-notifications`, `react-native-view-shot`) eklendi: `npx expo prebuild --platform ios` + yeniden derleme gerekir.

## Bilgiyi araştır (?)

- Kartın sağ üstündeki "?" düğmesi (`FactCard.onExplain` → `lib/explain.ts`) bilgi metniyle Google araması açar; Google çoğu sorguda üstte Gemini destekli "AI Bakışı" gösterir. AI Modu derin bağlantısı (`udm=50`) belgelenmediği için kullanılmaz. Kart `accessible` olduğundan düğme VoiceOver'da "Google'da araştır" eylemi olarak da sunulur; `axe` ile düğmeye etiketle değil koordinatla dokunun.

## Simülatörde Live Activity testi

- iOS 27 simülatöründe Ayarlar → Uygulamalar → Limpet → **Canlı Etkinlikler varsayılan olarak kapalı** gelir; kapalıyken `start` "Live Activities are not supported on this device" hatası verir. Anahtar otomasyonla (AXe) değiştirilemiyor, elle açılmalı.
- UI otomasyonu için `axe` (Homebrew) kurulu: `axe describe-ui`, `axe tap --label`, `axe swipe`. `axe button lock` ekranı kilitlemez; kartı görmek için ana ekrandayken üstten aşağı kaydır (`axe swipe --start-y 2 --end-y 600`).
- Kart çizilmiyor gibi görünürse önce etkinliğin kayıtlı olduğunu doğrula: `xcrun simctl spawn <udid> log show --last 2m --predicate 'process == "Limpet" AND eventMessage CONTAINS "Activities changed"'`.

## Tasarım

- Uygulama yalnızca koyu temadır (`userInterfaceStyle: dark`). Renkler tek yerde: `src/theme.ts`. Marka paleti `palette` (abyss/slate/clay/coral), türetilmiş tonlar `colors`; bileşenlerde sabit renk yazılmaz. Metin beyazdır, vurgular coral.
- Arka plan `src/components/Ocean.tsx` (dalgalar, parçacıklar) kök `_layout.tsx`'te bir kez çizilir; navigator'lar bu yüzden şeffaf tema (`ThemeProvider` + `contentStyle`/`sceneStyle: transparent`) kullanır. Bir ekrana opak arka plan verilirse okyanus kapanır.
- Maskot deniz kabuğudur: uygulamada `Shell.tsx` (SVG), kilit ekranında `assets/mascot/shell.png`. Kaynak `assets/mascot/shell.svg`; PNG/ikon/splash dosyaları bu SVG'den `sharp` ile üretildi (repoda yalnızca çıktılar var). SVG değişirse hepsi yeniden üretilmeli.
- Kilit ekranı kartında **sayaç/ilerleme çubuğu yoktur**; geri sayım yalnızca uygulama içinde (`TideBar`). Widget tarafına zaman bilgisi geçirilmez.
- Widget süreci uygulama paketini göremez: kabuk PNG'si `widgetsDirectory`'ye bir kez kopyalanır (`live-activity/mascot.ios.ts`) ve `file://` adresi props ile `Image uiImage`'a verilir. Dosya adındaki `-v1` görseli değiştirince artırılır, yoksa eski kopya kalır.

## Geliştirme sunucusu

- Metro'yu **`CI=1` olmadan** başlat (`npx expo start --dev-client`). `CI=1` izleme modunu kapatır: yeni/değişen dosyalar uygulamaya ulaşmaz, "Unable to resolve module" ve eski ekranlar görülür.
- Yeni native modül (ör. `expo-file-system`) eklenince `npx expo prebuild --platform ios --clean` ve yeniden derleme gerekir; Metro yenilemesi yetmez.

## İçerik (veri setleri)

- Şema: `src/lib/content/types.ts`. Paket `id`/`title`/`symbol`/`version` katalogla birebir aynı olmalı; `symbol` bir SF Symbol adıdır.
- Bir paketi değiştirince hem `topics/<id>.json` hem `index.json`'daki `version` artırılır; cihazlar yalnızca daha yüksek sürümü indirir. Bilgi metni en fazla 160 karakter (kilit ekranında 3 satır).
- Şu an 18 konu: 16 elle derlenmiş konu × 100 bilgi + "Genel Kültür" (≈325) + "Tarihte Bugün" (≈1.100, takvimdeki gün başına en fazla 3 olay, metin "24 Ekim 1929: …" biçiminde). Cihaz yalnızca seçili konuların paketini indirir ve yalnızca `version`'ı yükselenleri çeker; en büyük paket `today` (≈210 KB ham, ≈45–60 KB sıkıştırılmış).
- **Vikipedi kaynaklı konular:** "Genel Kültür" Türkçe Vikipedi'nin "Biliyor muydunuz?" arşivinden (günlük sayfalar `Vikipedi:Biliyor muydunuz?/YYYY-AA-GG` + `Arşiv/*`), "Tarihte Bugün" `api/rest_v1/feed/onthisday/events/AA/GG` uç noktasından çekildi (lisans CC BY-SA 4.0; Ayarlar altbilgisinde atıf var, kaldırılmamalı). Sınırlar: arşivde yalnızca ~650 benzersiz günlük + ~480 arşiv satırı var, 160 karakteri geçenler ve tekrarlar elendi → ≈325 bilgi; konu eşlemesi (kategori anahtar kelimeleri) gürültülü olduğu için hepsi tek konuya konuldu. Yeni bilgi isterseniz aynı kaynaklar yeniden çekilip yalnızca **dosya sonuna** eklenmeli (id'ler satır sırasına bağlı).
- Arayüzde konu başına bilgi sayısı **gösterilmez** (bilinçli; ilk sürümlerde veri sınırlı). Ritim seçenekleri yalnızca 1/3/6 saat (`INTERVAL_OPTIONS`); eski kayıtlı 15/30 dk tercihi `loadPreferences` ile 1 saate çekilir.
- Deste sırası: `buildDeck(packs, seed)` her turda her konudan bir bilgi alır ama **tur içindeki konu sırası da tohuma göre karışıktır** (görünür bir desen yok); konu içi sıra `deck:seed` (kurulum başına bir kez üretilir) + fact id hash'ine göre karışık; paket büyüyünce eski bilgilerin göreli sırası bozulmaz. Seed 0 = yazılı sıra (testler).
- `content:validate` tüm konular arasında birebir aynı metni de reddeder.
- Yeni konu: `topics/<id>.json` ekle + `index.json`'a girdi ekle → `npm run content:validate`.
- Üretim adresi `app.json → extra.contentBaseUrl` = `https://limpet-app.netlify.app` (Netlify, `main`'e bağlı); yerelde `EXPO_PUBLIC_CONTENT_BASE_URL=http://localhost:4000` ile `npm run content:serve` kullanılır.
- **Cihazdaki paketler sürümle güncellenir:** `updateContentNow()` (`engine.ts`) her seferinde kataloğu yeniden indirir ve yalnızca `version`'ı yükselen paketleri çeker; `updateContentIfStale()` bunu açılışta/öne gelince en fazla 6 saatte bir sessizce yapar. Güncelleme kararı hiçbir zaman ekranda tutulan eski katalogla verilmez.
- İçerik adresleri sürümlüdür (`topics/x.json?v=<version>`, `lib/content/validate.ts`): iOS, sunucunun `max-age`'i boyunca yanıtı önbellekte tutar ve istek başlığıyla (`no-cache`) bunu aşmak çalışmaz. Eski sürüm gelirse paket reddedilir. Bu yüzden içeriği değiştirince `version` artırmak zorunludur; artırılmazsa cihazlar değişikliği hiç görmez.
- Yayın `netlify.toml` ile yönetilir: `content/` yayınlanır, önce `content:validate` çalışır (bozuk paket yayına çıkmaz), yalnızca `content/`, doğrulama script'i veya `netlify.toml` değişince yeniden yayınlanır. Önbellek 5 dk; yeni sürüm cihazlara birkaç dakikada ulaşır.
- İçeriği yayınlamak = `main`'e push. Paketin ve `index.json`'daki girdinin `version`'ı birlikte artırılır (`content:validate` eşitliği denetler).

## Bitti sayılmadan önce

`npm run typecheck`, `npm run lint`, `npm test` ve içerik değiştiyse `npm run content:validate` temiz geçmeli. Native davranış (Live Activity, plugin ayarları) değiştiyse `npx expo prebuild --platform ios --clean` ardından simülatör derlemesi alınır. Saf mantık `src/lib/rotation.ts`'te kalır ve `node --test` ile test edilir; React Native import etmez.
