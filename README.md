# LAN Sync

Aynı ağdaki iki Windows PC arasında SMB/Windows paylaşımı kullanmadan çalışan iki yönlü dosya senkronizasyon uygulaması.

## Nasıl çalışır

Her PC'de aynı Node.js uygulaması çalışır. Kullanıcı tarayıcıdan web arayüzüne girer, klasörünü seçer, karşı PC'yi ekler ve senkronizasyon başlar.

- Port: **37821** (TCP, güvenlik duvarında açık olması gerekir)
- Kimlik doğrulama yok — aynı ağdaki herkes erişebilir
- Silme senkronu yok — dosya silmeleri karşı tarafa yansıtılmaz
- Çakışma yönetimi: aynı dosya iki tarafta farklı değişmişse, gelen dosya `(conflict YYYY-MM-DD HHmm from PCNAME)` sonekiyle kaydedilir

## Özellikler

- ⚡ **Otomatik Eşitleme (Oto-Eşitleme):** Cihaz listesindeki ⚡ butonunu açınca, klasörde bir dosya değiştiğinde karşı PC otomatik olarak eşitleme başlatır
- 🔄 **Çift Yönlü:** Her iki PC de eşitlemeyi tetikleyebilir; her iki tarafta da Oto-Eşitleme açıksa tam otomatik çalışır
- 💾 **Kalıcı Cihaz Listesi:** Eklenen cihazlar uygulama kapansa da silinmez

## Gereksinimler

- **Node.js 20 veya üzeri** → https://nodejs.org

## 🚀 Hızlı Kurulum (İki PC için)

### Her iki PC'de aynı adımları uygulayın:

**1. Node.js'i kurun** (zaten kuruluysa atlayın):
```
https://nodejs.org → LTS sürümünü indirin ve kurun
```

**2. Projeyi kopyalayın:**

Klasörü USB, yerel ağ veya başka bir yolla karşı PC'ye aktarın.

**3. Başlatın:**

Klasördeki **`baslat.bat`** dosyasına çift tıklayın. Bu betik:
- Gerekli paketleri otomatik yükler (`npm install`)
- Uygulamayı otomatik derler (`npm run build`)
- Güvenlik duvarı iznini otomatik ekler (port 37821 TCP)
- Uygulamayı başlatır ve ağda erişilebilecek IP adresini ekranda gösterir.

**4. Tarayıcıda açın:**

Ekranda gösterilen adresi tarayıcınızda açın (örn. `http://localhost:37821` veya karşı bilgisayardan erişiyorsanız `http://192.168.1.X:37821`).

## Kullanım

1. Her iki PC'de uygulamayı başlatın
2. **"BU CİHAZ"** bölümünden izlenecek klasörü seçin (örn. `C:\Users\Ad\Desktop`)
3. **"DİĞER CİHAZLAR"** bölümünden karşı PC'nin IP adresini ekleyin veya **"Ağı Tara"** butonunu kullanın
4. Cihaz satırındaki ⚡ simgesine tıklayarak **Oto-Eşitleme**'yi açın
5. Artık klasöre bir dosya attığınızda karşı PC otomatik olarak çekecek!

## Geliştirme ortamında çalıştırma

```bash
npm run dev
```

Hem sunucuyu (port 37821) hem de Vite geliştirme sunucusunu (port 5173) başlatır. Tarayıcıda `http://localhost:5173` adresini açın.

## Testler

```bash
npm test
```

18 unit test: path traversal koruması, conflict dosya adlandırma, index karşılaştırma.

## Lisans

MIT
