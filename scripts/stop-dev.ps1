# 停止本機 API (3000) 與管理後台 (3001) 程序
# 使用：powershell -ExecutionPolicy Bypass -File .\scripts\stop-dev.ps1

foreach ($port in 3000, 3001) {
  $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
  foreach ($c in $conns) {
    $procId = $c.OwningProcess
    if ($procId -and $procId -ne 0) {
      try {
        $p = Get-Process -Id $procId -ErrorAction Stop
        Write-Host "停止 port $port → PID $procId ($($p.ProcessName))"
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
      } catch {
        Write-Host "port $port PID $procId 已不存在"
      }
    }
  }
}
Write-Host "完成。資料庫檔案仍保留（apps/api/prisma/dev.db）。"
