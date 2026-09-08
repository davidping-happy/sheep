# 成二牧區：測試 Neon DATABASE_URL，並提示貼到 Render
# 用法：powershell -ExecutionPolicy Bypass -File .\scripts\fix-churchsheep-db.ps1

$ErrorActionPreference = 'Stop'
Write-Host ''
Write-Host '=== 成二資料庫修復助手 ===' -ForegroundColor Cyan
Write-Host '會開啟 Neon 與 Render 網頁；你貼上 Neon 連線字串後，本機先測試。'
Write-Host ''

Start-Process 'https://console.neon.tech'
Start-Process 'https://dashboard.render.com'

Write-Host 'Neon 步驟：登入 -> New Project（名稱建議 churchsheep）-> Connection string -> 複製 URI'
Write-Host 'Render 步驟：churchsheep-api -> Environment -> 稍後貼 DATABASE_URL'
Write-Host ''
$url = Read-Host '請貼上 Neon DATABASE_URL'

if ([string]::IsNullOrWhiteSpace($url)) {
  Write-Host '未輸入，已取消。' -ForegroundColor Yellow
  exit 1
}
if ($url -notmatch '^postgres') {
  Write-Host '格式不對：應以 postgresql:// 開頭' -ForegroundColor Red
  exit 1
}
if ($url -notmatch 'sslmode=require') {
  if ($url.Contains('?')) { $url = "$url&sslmode=require" } else { $url = "$url?sslmode=require" }
  Write-Host '已自動補上 sslmode=require'
}

$env:DATABASE_URL = $url
Set-Location (Join-Path $PSScriptRoot '..\apps\api')

Write-Host ''
Write-Host '測試連線並同步資料表…' -ForegroundColor Cyan
npx prisma generate
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npx prisma db push --skip-generate
if ($LASTEXITCODE -ne 0) {
  Write-Host '失敗：請確認 Neon URL 正確、專案為 Active。' -ForegroundColor Red
  exit 1
}

Write-Host ''
Write-Host '本機測試成功。' -ForegroundColor Green
Write-Host ''
Write-Host '【必做】Render -> churchsheep-api -> Environment：' -ForegroundColor Yellow
Write-Host '  1. DATABASE_URL = 你剛貼的 Neon 字串 -> Save Changes'
Write-Host '  2. Manual Deploy / Restart'
Write-Host '  3. 開 https://churchsheep-api.onrender.com/api/health 看 db 是否為 up'
Write-Host '  4. App 重新註冊帳號（新資料庫是空的）'
Write-Host ''