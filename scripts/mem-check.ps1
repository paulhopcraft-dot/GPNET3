$os = Get-CimInstance Win32_OperatingSystem
$totalGB = [math]::Round($os.TotalVisibleMemorySize/1MB,1)
$freeGB = [math]::Round($os.FreePhysicalMemory/1MB,1)
$usedGB = [math]::Round(($os.TotalVisibleMemorySize - $os.FreePhysicalMemory)/1MB,1)
$pct = [math]::Round(($os.TotalVisibleMemorySize - $os.FreePhysicalMemory)/$os.TotalVisibleMemorySize*100,0)

Write-Host "=== RAM Usage ==="
Write-Host "Total: $totalGB GB"
Write-Host "Used:  $usedGB GB ($pct%)"
Write-Host "Free:  $freeGB GB"

Write-Host "`n=== Top Processes by Memory ==="
Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 15 | ForEach-Object {
    $mb = [math]::Round($_.WorkingSet64/1MB,0)
    Write-Host "$($_.Name) (PID $($_.Id)): $mb MB"
}

Write-Host "`n=== WSL Memory ==="
$vmmem = Get-Process -Name "vmmem" -ErrorAction SilentlyContinue
if ($vmmem) {
    Write-Host "vmmem (WSL): $([math]::Round($vmmem.WorkingSet64/1MB,0)) MB"
} else {
    Write-Host "vmmem not found"
}
