# 教會 APP — 首次／重裝後完整建置
# 原因：把「裝套件 → 建資料庫 → 編譯 → 種子帳號」一次做完，之後只需 start-dev.ps1。
#
# 使用：在專案根目錄執行
#   powershell -ExecutionPolicy Bypass -File .\scripts\setup-all.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "=== 教會 APP 完整建置 ===" -ForegroundColor Cyan
Write-Host ""

# 1) API
Write-Host "[1/3] 後端 API — 安裝相依、資料庫、編譯" -ForegroundColor Green
Push-Location (Join-Path $Root "apps\api")
if (-not (Test-Path ".env")) { Copy-Item ".env.example" ".env" }
if (-not (Test-Path "node_modules")) {
  npm install --no-workspaces
}
& .\node_modules\.bin\prisma.cmd generate
& .\node_modules\.bin\prisma.cmd db push --skip-generate
& .\node_modules\.bin\ts-node.cmd prisma/seed.ts
& .\node_modules\.bin\nest.cmd build
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "API build 失敗" }
Pop-Location

# 2) Admin
Write-Host "[2/3] 管理後台 — 安裝相依" -ForegroundColor Green
Push-Location (Join-Path $Root "apps\admin-web")
if (-not (Test-Path ".env.local")) { Copy-Item ".env.example" ".env.local" }
if (-not (Test-Path "node_modules")) {
  npm install --no-workspaces
}
Pop-Location

# 3) Mobile
Write-Host "[3/3] 行動端 — 安裝相依" -ForegroundColor Green
Push-Location (Join-Path $Root "apps\mobile")
if (-not (Test-Path "node_modules")) {
  npm install --no-workspaces
}
Pop-Location

Write-Host ""
Write-Host "建置完成。接下來執行：" -ForegroundColor Cyan
Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1"
Write-Host ""
