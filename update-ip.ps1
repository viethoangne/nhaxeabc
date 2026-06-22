# ============================================================
# update-ip.ps1 — Tự động cập nhật IP cho Mobile khi test Device thật
# Chạy: .\update-ip.ps1
# Khi dùng xong device thật, chạy: .\update-ip.ps1 -Emulator
# ============================================================

param(
    [switch]$Emulator  # Dùng -Emulator để reset về 10.0.2.2 (Android Emulator)
)

$mobileEnvPath = "$PSScriptRoot\mobile\.env"
$backendEnvPath = "$PSScriptRoot\backend\.env"

if ($Emulator) {
    # Reset về emulator mode
    $newApiUrl  = "http://10.0.2.2:3001/api"
    $newWebUrl  = "http://10.0.2.2:3000"
    
    $backendBaseUrl = "http://localhost:3001"
    $backendUrl     = "http://localhost:3001"
    $backendApiUrl  = "http://localhost:3001/api"

    Write-Host ""
    Write-Host "  [MODE] Android Emulator" -ForegroundColor Cyan
} else {
    # Lấy IP WiFi hiện tại
    $ip = (Get-NetIPAddress -AddressFamily IPv4 |
           Where-Object { $_.InterfaceAlias -like "*Wi-Fi*" -and $_.PrefixOrigin -ne "WellKnown" } |
           Select-Object -First 1).IPAddress

    if (-not $ip) {
        # Fallback: lấy IP non-loopback đầu tiên
        $ip = (Get-NetIPAddress -AddressFamily IPv4 |
               Where-Object { $_.IPAddress -notlike "127.*" -and $_.PrefixOrigin -ne "WellKnown" } |
               Select-Object -First 1).IPAddress
    }

    if (-not $ip) {
        Write-Host ""
        Write-Host "  [LOI] Khong tim thay IP WiFi. Kiem tra ket noi mang." -ForegroundColor Red
        exit 1
    }

    $newApiUrl = "http://${ip}:3001/api"
    $newWebUrl = "http://${ip}:3000"

    $backendBaseUrl = "http://${ip}:3001"
    $backendUrl     = "http://${ip}:3001"
    $backendApiUrl  = "http://${ip}:3001/api"

    Write-Host ""
    Write-Host "  [MODE] Device that / Expo Go" -ForegroundColor Yellow
    Write-Host "  [IP]   $ip" -ForegroundColor Yellow
}

# 1. Cập nhật file mobile/.env
if (Test-Path $mobileEnvPath) {
    $content = Get-Content $mobileEnvPath -Raw
    $content = $content -replace 'EXPO_PUBLIC_API_BASE_URL=.*', "EXPO_PUBLIC_API_BASE_URL=$newApiUrl"
    $content = $content -replace 'EXPO_PUBLIC_WEB_URL=.*',      "EXPO_PUBLIC_WEB_URL=$newWebUrl"
    Set-Content -Path $mobileEnvPath -Value $content -NoNewline
}

# 2. Cập nhật file backend/.env
if (Test-Path $backendEnvPath) {
    $backendContent = Get-Content $backendEnvPath -Raw
    $backendContent = $backendContent -replace 'BASE_URL=.*', "BASE_URL=$backendBaseUrl"
    $backendContent = $backendContent -replace 'BACKEND_URL=.*', "BACKEND_URL=$backendUrl"
    $backendContent = $backendContent -replace 'API_URL=.*', "API_URL=$backendApiUrl"
    Set-Content -Path $backendEnvPath -Value $backendContent -NoNewline
}

Write-Host ""
Write-Host "  ========================================" -ForegroundColor Green
Write-Host "  [OK] Da cap nhat mobile/.env & backend/.env" -ForegroundColor Green
Write-Host "  Mobile API:  $newApiUrl" -ForegroundColor Green
Write-Host "  Backend URL: $backendUrl" -ForegroundColor Green
Write-Host "  ========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Buoc tiep theo: Khoi dong lai Backend & Rebuild Mobile app de nhan IP moi." -ForegroundColor Gray
Write-Host ""
