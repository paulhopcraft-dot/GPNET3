# Kill any process on port 5000
$connections = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
foreach ($conn in $connections) {
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 2
Write-Host "Cleared port 5000"

# Start the server
$env:NODE_ENV = "development"
Set-Location "C:\dev\gpnet3"
$proc = Start-Process -FilePath "node" -ArgumentList "--import", "tsx/esm", "server/index.ts" -PassThru -NoNewWindow
Write-Host "Started server PID: $($proc.Id)"

# Wait for server
Start-Sleep -Seconds 10

# Check ports
$p5000 = Test-NetConnection -ComputerName localhost -Port 5000 -WarningAction SilentlyContinue
$p5173 = Test-NetConnection -ComputerName localhost -Port 5173 -WarningAction SilentlyContinue
Write-Host "Port 5000: $($p5000.TcpTestSucceeded)"
Write-Host "Port 5173: $($p5173.TcpTestSucceeded)"

# Open browser
if ($p5173.TcpTestSucceeded) {
    Start-Process "http://localhost:5173/admin/roles"
    Write-Host "Browser opened!"
} else {
    Write-Host "Server not ready on 5173"
}
