# Kill all node processes
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
Write-Host "Killed all node processes"

# Start backend
Set-Location "C:\dev\gpnet3"
$env:NODE_ENV = "development"
Start-Process -FilePath "node.exe" -ArgumentList "--import", "tsx/esm", "server/index.ts" -NoNewWindow
Write-Host "Started backend"
Start-Sleep -Seconds 5

# Start frontend
Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev:client" -NoNewWindow
Write-Host "Started frontend"
Start-Sleep -Seconds 8

# Open browser
Start-Process "http://localhost:5173/admin/roles"
Write-Host "Browser opened to http://localhost:5173/admin/roles"
