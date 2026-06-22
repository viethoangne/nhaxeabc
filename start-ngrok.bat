@echo off
echo ============================================
echo   Khoi dong ngrok voi Static Domain
echo   URL co dinh - khong bao gio thay doi!
echo ============================================
echo.

REM Thay "your-domain" bang domain tinh cua ban tu https://dashboard.ngrok.com/domains
set NGROK_DOMAIN=your-domain.ngrok-free.app

echo Dang bat ngrok...
echo URL cong khai: https://%NGROK_DOMAIN%
echo.
echo - Web:    https://%NGROK_DOMAIN%
echo - API:    https://%NGROK_DOMAIN%/api
echo.
echo Giu cua so nay mo de duy tri tunnel.
echo Nhan Ctrl+C de tat.
echo.

ngrok http --domain=%NGROK_DOMAIN% 3000
