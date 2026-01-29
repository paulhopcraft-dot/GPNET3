# Find large folders
$folders = @(
    "$env:USERPROFILE\Downloads",
    "$env:USERPROFILE\Documents",
    "$env:USERPROFILE\.vscode",
    "$env:LOCALAPPDATA\Microsoft\VisualStudio",
    "$env:LOCALAPPDATA\Docker",
    "$env:APPDATA\npm-cache",
    "$env:APPDATA\Code",
    "C:\dev"
)

Write-Host "=== FOLDER SIZES ===" -ForegroundColor Yellow
foreach ($f in $folders) {
    if (Test-Path $f) {
        try {
            $size = (Get-ChildItem $f -Recurse -Force -ErrorAction SilentlyContinue |
                     Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
            $sizeGB = [math]::Round($size/1GB, 2)
            if ($sizeGB -gt 0.5) {
                Write-Host "$f : $sizeGB GB" -ForegroundColor $(if ($sizeGB -gt 5) { "Red" } elseif ($sizeGB -gt 1) { "Yellow" } else { "White" })
            }
        } catch {}
    }
}

Write-Host "`n=== TOP 10 LARGEST FILES ===" -ForegroundColor Yellow
Get-ChildItem C:\Users\Paul -Recurse -File -ErrorAction SilentlyContinue |
    Sort-Object Length -Descending |
    Select-Object -First 10 |
    ForEach-Object {
        Write-Host "$([math]::Round($_.Length/1MB))MB - $($_.FullName)"
    }
