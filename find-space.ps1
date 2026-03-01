Write-Host "=== SCANNING FOR LARGE FOLDERS ===" -ForegroundColor Yellow
Write-Host "This may take a minute..." -ForegroundColor Gray

$folders = @(
    "C:\Users",
    "C:\dev",
    "C:\ProgramData",
    "C:\Windows\Installer",
    "C:\Windows\SoftwareDistribution"
)

foreach ($f in $folders) {
    if (Test-Path $f) {
        $size = (Get-ChildItem $f -Recurse -Force -ErrorAction SilentlyContinue |
                 Measure-Object Length -Sum -ErrorAction SilentlyContinue).Sum / 1GB
        $sizeRound = [math]::Round($size, 1)
        if ($sizeRound -gt 0.5) {
            $color = if ($sizeRound -gt 20) { "Red" } elseif ($sizeRound -gt 5) { "Yellow" } else { "White" }
            Write-Host "$sizeRound GB - $f" -ForegroundColor $color
        }
    }
}

Write-Host "`n=== LARGEST FILES ON DRIVE ===" -ForegroundColor Yellow
Get-ChildItem C:\ -Recurse -File -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.Length -gt 500MB } |
    Sort-Object Length -Descending |
    Select-Object -First 15 |
    ForEach-Object {
        $sizeMB = [math]::Round($_.Length / 1MB)
        Write-Host "$sizeMB MB - $($_.FullName)"
    }

Write-Host "`nDone!" -ForegroundColor Green
