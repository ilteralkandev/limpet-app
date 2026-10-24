# App Store yayın kılavuzu

Yayından önce yapılacaklar ve App Store Connect'e yapıştırılacak metinler. Kodla ilgili kısımlar hazır; aşağıdaki **[ ]** maddeleri sizde.

## 1. Yayından önce doldurulacaklar

- [ ] `content/legal/*.html` içindeki `[GELİŞTİRİCİ ADI / ŞİRKET ADI]` ve `[İLETİŞİM E-POSTASI]` yer tutucularını doldurun (`npm run content:validate` doldurulana kadar uyarı verir). Sayfalar `main`'e push edilince Netlify'da yayınlanır:
  - Gizlilik Politikası: `https://limpet-app.netlify.app/legal/privacy.html`
  - Kullanım Koşulları: `https://limpet-app.netlify.app/legal/terms.html`
  - Destek: `https://limpet-app.netlify.app/legal/support.html`
- [ ] Apple Developer Program üyeliği (yıllık ücretli). Bundle ID: `com.limpetapp.app`; widget uzantısı `com.limpetapp.app.ExpoWidgetsTarget`; App Group `group.com.limpetapp.app`. EAS bunları ilk derlemede kendisi oluşturur.
- [ ] Ekran görüntüleri: 6.9" iPhone (1320×2868) zorunlu. Simülatörde "iPhone 18 Pro Max" ile alın (Bugün, Konular, Kilit ekranı kartı, Koleksiyon).
- [ ] `app.json` → `version`: her yeni mağaza sürümünde artırın; derleme numarasını EAS otomatik artırır (`eas.json` → `autoIncrement`).

## 2. Derleme ve gönderim

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios --profile production
```

- Üretim derlemesinde `EXPO_PUBLIC_CONTENT_BASE_URL` **tanımlı olmamalı** (yerel geliştirme içindir); içerik `app.json → extra.contentBaseUrl` adresinden iner.
- **Mutlaka gerçek telefonda TestFlight ile deneyin:** simülatör arka plan görevlerini ve gerçek bildirim teslimini göstermez. Kontrol listesi: bildirim izni ve ilk bildirim, kilit ekranı kartı, Dynamic Island anahtarları, ritim değişince plan, uygulama kapalıyken kartın ilerlemesi, çevrimdışı açılış.

## 3. App Store Connect alanları

| Alan | Değer |
|---|---|
| Ad (≤30) | Limpet: Kilit Ekranı Bilgi |
| Alt başlık (≤30) | Kayaya tutunan bilgiler |
| Kategori | Eğitim (ikincil: Referans) |
| Fiyat | Ücretsiz (abonelik eklenince Uygulama İçi Satın Alma + "Satın alımları geri yükle" düğmesi gerekir) |
| Destek URL | `https://limpet-app.netlify.app/legal/support.html` |
| Gizlilik Politikası URL | `https://limpet-app.netlify.app/legal/privacy.html` |
| Anahtar kelimeler (≤100) | `bilgi,genel kültür,kilit ekranı,tarih,bilim,uzay,felsefe,psikoloji,her gün,öğren,widget` |
| Telif | `© 2026 İlter Alkan` |
| Tanıtım metni (≤170) | Her gün kilit ekranına tutunan kısa, şaşırtıcı bilgiler. İlgi alanlarını seç, ritmini belirle; gerisini deniz kabuğu halletsin. |

**Açıklama (≤4000):**

> Limpet, ilgi alanlarından seçtiğin kısa ve şaşırtıcı bilgileri kilit ekranına sabitler. Telefonu her açtığında yeni bir şey öğrenirsin.
>
> • 18 konu: Yazılım, Finans, Felsefe, Bilim, Tarih, Uzay, Doğa, İnsan Vücudu, Psikoloji, Coğrafya, Matematik, Dil, Sanat, Müzik, Spor, Hukuk, Genel Kültür ve Tarihte Bugün
> • Ritmini seç: saatte bir, 3 saatte bir ya da 6 saatte bir yeni bilgi
> • Kilit ekranında kart, Dynamic Island'da küçük simge ve isteğe bağlı bildirimler
> • Beğendiklerini favorilere ekle, görsel olarak arkadaşlarınla paylaş
> • Merak ettiğin bilgiyi tek dokunuşla Google'da araştır
> • Hesap yok, reklam yok, izleme yok. Tercihlerin yalnızca cihazında kalır
>
> Not: Bilgiler genel kültür amaçlıdır; tıbbi, hukuki veya finansal tavsiye değildir. Bazı bilgiler Vikipedi'den (CC BY-SA 4.0) alınmıştır.

## 4. Gizlilik ("App Privacy") yanıtları

- Veri toplanıyor mu? **Hayır → "Data Not Collected"**. Hesap, analiz, reklam, izleme yok; tercihler yalnızca cihazda.
- Tracking: **Hayır** (`PrivacyInfo.xcprivacy` zaten `NSPrivacyTracking = false`).
- İhracat uyumu: yalnızca HTTPS kullanılıyor → `ITSAppUsesNonExemptEncryption = false` (`app.json`'da ayarlı).

## 5. Yaş derecelendirmesi

"Tarihte Bugün" ve "Tarih" savaş, katliam, terör ve ölüm içeren olaylardan kısa bahseder (görsel şiddet yok). Ankette şiddeti dürüstçe "seyrek/hafif" olarak işaretleyin; büyük olasılıkla **12+** çıkar. Kumar, alkol, cinsellik, kullanıcı içeriği, web erişimi (yalnızca Google araması bağlantısı) yok.

## 6. Gözden geçirme notları (App Review Information)

> Limpet'te giriş/hesap yoktur. Demo için ilk açılışta en az bir konu seçip "Devam" ve "Kilit ekranına sabitle"ye dokunmak yeterlidir.
>
> **Canlı Etkinlik (Live Activity):** Kullanıcının kendi seçtiği konulardan gelen kısa bir bilgi kartını kilit ekranında ve Dynamic Island'da gösterir; kullanıcının başlattığı, Ayarlar'dan her an kapatılabilen bir özelliktir (Ayarlar → "Kilit ekranında göster" / "Dynamic Island'da göster"). Reklam veya tanıtım içermez, push ile güncellenmez; kart uygulama içinden ve arka plan görevleriyle yerel olarak güncellenir.
>
> **Bildirimler:** Varsayılan kapalıdır; yalnızca kullanıcı Ayarlar'da açarsa izin istenir. Tüm bildirimler yerel olarak planlanır, sunucu yoktur.
>
> **İçerik:** Statik JSON paketleri HTTPS ile `limpet-app.netlify.app` adresinden indirilir. "Genel Kültür" ve "Tarihte Bugün" konuları Vikipedi'den alınmıştır (CC BY-SA 4.0), atıf Ayarlar'dadır.

**Dikkat (ret riski):** Apple, Canlı Etkinlikleri belirli süreli olaylar için tasarlar; sürekli dönen bilgi kartı "uygunsuz kullanım" sayılabilir. Ret gelirse bildirim ve widget yolu hazırdır; Canlı Etkinliği varsayılan kapalı ya da yalnızca Ayarlar'dan açılır yapmak ilk savunma hattıdır.

## 7. İleride (abonelik eklenirse)

Uygulama İçi Satın Alma + "Satın alımları geri yükle", abonelik koşulları (fiyat, süre, iptal) ekranı, Gizlilik/Kullanım Koşulları bağlantıları ve App Store Connect'te abonelik meta verisi gerekir; gizlilik politikasındaki "veri toplanmaz" ifadesi (satın alma/hesap verisi) buna göre güncellenmelidir.
