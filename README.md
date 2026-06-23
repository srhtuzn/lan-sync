# LAN Sync

Aynı ağdaki iki Windows PC arasında SMB/Windows paylaşımı kullanmadan çalışan iki yönlü dosya senkronizasyon uygulaması.

## Nasıl çalışır

Her PC'de aynı Node.js uygulaması çalışır. Kullanıcı tarayıcıdan web arayüzüne girer, klasörünü seçer, karşı PC'yi ekler ve senkronizasyon başlar.

- Port: **37821** (TCP, güvenlik duvarında açık olması gerekir)
- Kimlik doğrulama yok — aynı ağdaki herkes erişebilir
- Silme senkronu yok — dosya silmeleri karşı tarafa yansıtılmaz
- Çakışma yönetimi: aynı dosya iki tarafta farklı değişmişse, gelen dosya `(conflict YYYY-MM-DD HHmm from PCNAME)` sonekiyle kaydedilir

## Gereksinimler

- Node.js 20 veya üzeri

## Kurulum

```bash
git clone <repo-url>
cd lan-sync
npm install
```

## Çalıştırma (geliştirme)

```bash
npm run dev
```

Bu komut hem sunucuyu (port 37821) hem de Vite geliştirme sunucusunu (port 5173) eş zamanlı başlatır. Tarayıcıda `http://localhost:5173` adresini açın.

## Production build

```bash
npm run build
```

Bu komut React arayüzünü derler ve `server/public/` dizinine kopyalar. Ardından yalnızca sunucu çalıştırılır:

```bash
node server/dist/index.js
```

Tarayıcıda `http://localhost:37821` adresini açın.

## Diğer PC'den erişim

Diğer PC'de de `npm run dev` veya `node server/dist/index.js` çalıştırın. Arayüzde **Scan LAN** butonu ile veya karşı PC'nin IP adresini manuel girerek eşleştirin.

## Testler

```bash
npm test
```

18 unit test: path traversal koruması, conflict dosya adlandırma, index karşılaştırma.

## Lisans

MIT
