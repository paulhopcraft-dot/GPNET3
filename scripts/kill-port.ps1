$conns = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($conns) {
    $pid = $conns[0].OwningProcess
    Write-Host "Killing PID $pid on port 5000"
    Stop-Process -Id $pid -Force
} else {
    Write-Host "No process on port 5000"
}
