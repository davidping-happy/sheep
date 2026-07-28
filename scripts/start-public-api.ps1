<#
  開通對外可連的 API（給測試者用）
  1. 啟動 API（http://localhost:3000/api）
  2. 開 Cloudflare 通道，取得 https://xxx.trycloudflare.com 公開網址

  用法： powershell -ExecutionPolicy Bypass -File scripts\start-public-api.ps1
  結束： 關掉這個視窗（通道與 API 會一起停止）
#>

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$apiDir = Join-Path $root 'apps\api'
$cloudflared = Join-Path $root 'tools\cloudflared.exe'

if (-not (Test-Path $cloudflared)) {
  Write-Host '下載 cloudflared…' -ForegroundColor Yellow
  New-Item -ItemType Directory -Force -Path (Join-Path $root 'tools') | Out-Null
  $ProgressPreference = 'SilentlyContinue'
  Invoke-WebRequest `
    -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' `
    -OutFile $cloudflared
}

$listening = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if (-not $listening) {
  Write-Host '啟動 API…' -ForegroundColor Cyan
  if (-not (Test-Path (Join-Path $apiDir 'dist\main.js'))) {
    Push-Location $apiDir; npm run build; Pop-Location
  }
  Start-Process -FilePath 'node' -ArgumentList 'dist/main.js' -WorkingDirectory $apiDir
  Start-Sleep -Seconds 5
} else {
  Write-Host 'API 已在執行中（port 3000）' -ForegroundColor Green
}

Write-Host ''
Write-Host '開通 Cloudflare 通道…下面會出現 https://xxx.trycloudflare.com 網址' -ForegroundColor Cyan
Write-Host '請把該網址加上 /api 後，貼到 App 的「更多 → 伺服器連線設定」' -ForegroundColor Cyan
Write-Host ''

& $cloudflared tunnel --url http://localhost:3000 --no-autoupdate
