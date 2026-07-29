<#
  Start public API tunnel for testers.

  1. Start API on http://localhost:3000/api
  2. Open Cloudflare quick tunnel (https://xxx.trycloudflare.com)
  3. Write the new URL into apps\mobile\eas.json preview env

  Usage: npm run public:api
  Stop: Ctrl+C in this window
#>

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$apiDir = Join-Path $root 'apps\api'
$toolsDir = Join-Path $root 'tools'
$cloudflared = Join-Path $toolsDir 'cloudflared.exe'
$errLog = Join-Path $toolsDir 'tunnel.err.log'
$outLog = Join-Path $toolsDir 'tunnel.out.log'
$easPath = Join-Path $root 'apps\mobile\eas.json'

New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null

if (-not (Test-Path $cloudflared)) {
  Write-Host 'Downloading cloudflared...' -ForegroundColor Yellow
  $ProgressPreference = 'SilentlyContinue'
  $url = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe'
  Invoke-WebRequest -Uri $url -OutFile $cloudflared
}

$listening = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($listening) {
  Write-Host 'API already running on port 3000' -ForegroundColor Green
}
else {
  Write-Host 'Starting API...' -ForegroundColor Cyan
  if (-not (Test-Path (Join-Path $apiDir 'dist\main.js'))) {
    Push-Location $apiDir
    npm run build
    Pop-Location
  }
  Start-Process -FilePath 'node' -ArgumentList 'dist/main.js' -WorkingDirectory $apiDir
  Start-Sleep -Seconds 6
}

Remove-Item $errLog, $outLog -ErrorAction SilentlyContinue
Write-Host 'Opening Cloudflare tunnel...' -ForegroundColor Cyan

$tunnelArgs = @('tunnel', '--url', 'http://localhost:3000', '--no-autoupdate')
$tunnel = Start-Process -FilePath $cloudflared -ArgumentList $tunnelArgs `
  -RedirectStandardError $errLog -RedirectStandardOutput $outLog `
  -NoNewWindow -PassThru

try {
  $publicUrl = $null
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 2
    $log = ''
    if (Test-Path $errLog) { $log += (Get-Content $errLog -Raw -ErrorAction SilentlyContinue) }
    if (Test-Path $outLog) { $log += (Get-Content $outLog -Raw -ErrorAction SilentlyContinue) }
    $match = [regex]::Match($log, 'https://[a-z0-9-]+\.trycloudflare\.com')
    if ($match.Success) {
      $publicUrl = $match.Value
      break
    }
  }

  if (-not $publicUrl) {
    throw "Could not get tunnel URL. See $errLog"
  }

  Write-Host ''
  Write-Host "Public URL: $publicUrl/api" -ForegroundColor Green

  $ok = $false
  for ($i = 0; $i -lt 10; $i++) {
    Start-Sleep -Seconds 3
    try {
      $res = Invoke-WebRequest -Uri "$publicUrl/api/livestream/latest" -TimeoutSec 20 -UseBasicParsing
      if ($res.StatusCode -lt 500) {
        $ok = $true
        break
      }
    }
    catch {
      # tunnel may need a moment
    }
  }
  if ($ok) {
    Write-Host 'External connectivity test passed.' -ForegroundColor Green
  }
  else {
    Write-Host 'Warning: external connectivity test failed.' -ForegroundColor Yellow
  }

  if (Test-Path $easPath) {
    $eas = Get-Content $easPath -Raw | ConvertFrom-Json
    $eas.build.preview.env.EXPO_PUBLIC_API_BASE = "$publicUrl/api"
    $json = $eas | ConvertTo-Json -Depth 20
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($easPath, $json, $utf8NoBom)
    Write-Host 'Updated eas.json preview EXPO_PUBLIC_API_BASE.' -ForegroundColor Green
  }

  Write-Host ''
  Write-Host 'Next (open another terminal):' -ForegroundColor Cyan
  Write-Host '  cd apps\mobile'
  Write-Host '  npm run apk'
  Write-Host ''
  Write-Host 'Or tell testers to paste this URL in App > More > Server settings:' -ForegroundColor Cyan
  Write-Host "  $publicUrl"
  Write-Host ''
  Write-Host 'Keep this window open. Ctrl+C stops the tunnel.' -ForegroundColor Yellow

  Wait-Process -Id $tunnel.Id
}
finally {
  if ($tunnel -and -not $tunnel.HasExited) {
    Stop-Process -Id $tunnel.Id -Force -ErrorAction SilentlyContinue
  }
  Write-Host 'Tunnel stopped.' -ForegroundColor Yellow
}