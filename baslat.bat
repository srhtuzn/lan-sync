@echo off
for /d %%D in ("%~dp0.tools\node-v22.*-win-x64") do (
    set "PATH=%%~fD;%PATH%"
)
chcp 65001 > nul
title LAN Sync Başlatıcı

echo ===================================================
echo             LAN Sync Yerel Ağ Eşitleme
echo ===================================================
echo.

:: 1. Node.js Kontrolü
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [HATA] Node.js sisteminizde kurulu bulunamadı!
    echo Lütfen https://nodejs.org/ adresinden Node.js indirip kurun.
    echo.
    pause
    exit /b
)

:: 2. Bağımlılıklerin Kontrolü
if not exist node_modules (
    echo [INFO] Paketler ilk defa yükleniyor. Bu işlem biraz sürebilir...
    call npm install
    if %errorlevel% neq 0 (
        echo [HATA] Paketler yüklenirken bir hata oluştu!
        pause
        exit /b
    )
)

:: 3. Derleme Kontrolü
if not exist server\dist (
    echo [INFO] Uygulama derleniyor (build)...
    call npm run build
    if %errorlevel% neq 0 (
        echo [HATA] Derleme sırasında bir hata oluştu!
        pause
        exit /b
    )
)

:: 4. Güvenlik Duvarı İzni Kontrolü
echo [INFO] Güvenlik duvarı izni kontrol ediliyor...
netsh advfirewall firewall show rule name="LAN Sync" >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] Güvenlik duvarı izni ekleniyor (Yönetici onayı istenebilir)...
    powershell -Command "Start-Process cmd -ArgumentList '/c netsh advfirewall firewall add rule name=\"LAN Sync\" dir=in action=allow protocol=TCP localport=37821 profile=private,domain description=\"LAN Sync dosya esitleme - port 37821\"' -Verb RunAs -Wait" 2>nul
    
    :: Tekrar kontrol et
    netsh advfirewall firewall show rule name="LAN Sync" >nul 2>nul
    if %errorlevel% neq 0 (
        echo [UYARI] Güvenlik duvarı izni eklenemedi! 
        echo Diğer bilgisayarlar bu cihaza erişemeyebilir.
        echo Sorun yaşarsanız uygulamayı "Yönetici Olarak Çalıştır" seçeneğiyle tekrar başlatmayı deneyin.
    ) else (
        echo [OK] Güvenlik duvarı izni başarıyla eklendi.
    )
    echo.
)

:: 5. Uygulamayı Başlat
echo [INFO] Uygulama başlatılıyor...
echo.
call npm start
pause
