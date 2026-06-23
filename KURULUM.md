# LAN Sync — Karşı Bilgisayar Kurulum Kılavuzu

Bu kılavuz, uygulamanın yerel ağdaki (LAN) diğer bir Windows bilgisayarda hızlıca kurulabilmesi için hazırlanmıştır. Bu notları karşı bilgisayardaki yapay zeka ajanına veya kullanıcıya doğrudan vererek kurulumu tamamlatabilirsiniz.

---

## 📋 Gereksinimler

- **Node.js**: Sürüm **v20** veya üzeri (Yüklü değilse: [nodejs.org](https://nodejs.org) adresinden LTS sürümünü kurun).
- **Yönetici Yetkisi**: Güvenlik duvarı (Firewall) iznini eklemek için gereklidir.

---

## 🛠️ Kurulum Adımları

### 1. Dosyaların Kopyalanması
Uygulama klasörünü (`lan-sync`) karşı bilgisayara USB, yerel ağ paylaşımı veya e-posta yoluyla aktarın ve uygun bir klasöre (örneğin Masaüstü) çıkarın.

### 2. Otomatik Kurulum ve Başlatma (Tavsiye Edilen)
Projenin kök dizininde bulunan **`baslat.bat`** dosyasına çift tıklayarak çalıştırın. Bu dosya:
1. Gerekli tüm paketleri yükler (`npm install`).
2. Uygulamayı derler (`npm run build`).
3. Güvenlik duvarında **37821** portunu açmak için yönetici izni ister.
4. Sunucuyu otomatik başlatır.

---

## 💻 Manuel Kurulum Adımları (Ajanlar için Terminal Komutları)

Eğer komutları terminalden adım adım çalıştırmak isterseniz:

#### A. Bağımlılıkları Yükleme ve Derleme
Proje kök dizininde bir terminal (PowerShell veya CMD) açıp şu komutları sırasıyla çalıştırın:
```powershell
# 1. Paketleri yükleyin
npm install

# 2. Tüm çalışma alanlarını derleyin
npm run build
```

#### B. Güvenlik Duvarı İzni Tanımlama
Diğer bilgisayarların bu sunucuya bağlanabilmesi için **37821** portuna izin verilmelidir. **Yönetici yetkisiyle açılmış** bir PowerShell terminalinde şu komutu çalıştırın:
```powershell
netsh advfirewall firewall add rule name="LAN Sync" dir=in action=allow protocol=TCP localport=37821 profile=private,domain description="LAN Sync dosya esitleme - port 37821"
```

#### C. Sunucuyu Başlatma
Derleme ve firewall ayarları tamamlandıktan sonra, uygulamayı başlatmak için proje kök dizininde şu komutu çalıştırın:
```powershell
npm start
```

Uygulama başladıktan sonra terminalde şu şekilde bir çıktı görüntülenecektir:
```text
===================================================
LAN Sync yerel ağda başarıyla başlatıldı!
- Bu bilgisayardan erişim: http://localhost:37821
- Diğer bilgisayarlardan erişim: http://<YEREL-IP-ADRESI>:37821
===================================================
```

---

## 🔍 Doğrulama ve Kullanım

1. Tarayıcınızda `http://localhost:37821` adresine gidin. Arayüzün Türkçe olarak açıldığını doğrulayın.
2. Ana bilgisayardaki tarayıcıyı açın, **"DİĞER CİHAZLAR"** listesine karşı bilgisayarın IP adresini ekleyin (örn: `192.168.1.X:37821`).
3. Her iki bilgisayarda da ilgili cihazların yanındaki ⚡ (**Oto-Eşitleme**) butonunu aktif hale getirin.
4. Seçtiğiniz klasöre dosya ekleyerek otomatik çift yönlü senkronizasyonu test edin.
