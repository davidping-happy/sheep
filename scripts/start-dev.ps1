# 教會 APP — 開發環境一鍵啟動
# 原因：重開機後 localhost 程序會消失；此腳本重新拉起 API + 管理後台。
#
# 使用：在專案根目錄執行
#   powershell -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$ApiDir = Join-Path $Root "apps\api"
$AdminDir = Join-Path $Root "apps\admin-web"

Write-Host ""
Write-Host "=== 教會 APP 開發環境啟動 ===" -ForegroundColor Cyan
Write-Host "專案根目錄: $Root"
Write-Host ""

# ── 檢查 Node ──
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "錯誤：找不到 Node.js。請先安裝 https://nodejs.org （建議 LTS / v20+）" -ForegroundColor Red
  exit 1
}

# ── 檢查 API 建置產物 ──
if (-not (Test-Path (Join-Path $ApiDir "dist\main.js"))) {
  Write-Host "[API] 尚未建置，正在 build..." -ForegroundColor Yellow
  Push-Location $ApiDir
  & .\node_modules\.bin\nest.cmd build
  if ($LASTEXITCODE -ne 0) { Pop-Location; exit 1 }
  Pop-Location
}

# ── 檢查 .env ──
if (-not (Test-Path (Join-Path $ApiDir ".env"))) {
  Write-Host "[API] 複製 .env.example → .env" -ForegroundColor Yellow
  Copy-Item (Join-Path $ApiDir ".env.example") (Join-Path $ApiDir ".env")
}

if (-not (Test-Path (Join-Path $AdminDir ".env.local"))) {
  Write-Host "[Admin] 複製 .env.example → .env.local" -ForegroundColor Yellow
  Copy-Item (Join-Path $AdminDir ".env.example") (Join-Path $AdminDir ".env.local")
}

# ── 若 port 已被占用則略過啟動 ──
function Test-Port($port) {
  return [bool](Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue)
}

if (Test-Port 3000) {
  Write-Host "[API] port 3000 已在使用，略過啟動（可能已在跑）" -ForegroundColor Yellow
} else {
  Write-Host "[API] 啟動於 http://localhost:3000/api ..." -ForegroundColor Green
  Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "Set-Location '$ApiDir'; Write-Host 'API 伺服器 (Ctrl+C 停止)'; node dist/main.js"
  )
}

if (Test-Port 3001) {
  Write-Host "[Admin] port 3001 已在使用，略過啟動（可能已在跑）" -ForegroundColor Yellow
} else {
  Write-Host "[Admin] 啟動於 http://localhost:3001 ..." -ForegroundColor Green
  Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "Set-Location '$AdminDir'; Write-Host '管理後台 (Ctrl+C 停止)'; npm run dev"
  )
}

Write-Host ""
Write-Host "就緒後請開啟：" -ForegroundColor Cyan
Write-Host "  後台審核頁  http://localhost:3001/prayer"
Write-Host "  API 文件     http://localhost:3000/docs"
Write-Host "  登入帳號     admin@church.local（密碼：cd apps\api; npm run set-password）"
Write-Host ""
Write-Host "行動端（另開終端）：cd apps\mobile; npm start"
Write-Host "驗證腳本：cd apps\api; node demo\demo.mjs; node demo\demo-events.mjs"
Write-Host ""
