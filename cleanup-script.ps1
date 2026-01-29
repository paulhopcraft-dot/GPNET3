# Disk Cleanup Script
Write-Host "=== DISK SPACE ANALYSIS ===" -ForegroundColor Yellow

# Check temp folders
$temps = @(
    "$env:TEMP",
    "$env:LOCALAPPDATA\Temp",
    "C:\Windows\Temp"
)

foreach ($t in $temps) {
    if (Test-Path $t) {
        $size = (Get-ChildItem $t -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1GB
        Write-Host "$t : $([math]::Round($size,2)) GB"
    }
}

# Check npm cache
$npmCache = "$env:APPDATA\npm-cache"
if (Test-Path $npmCache) {
    $size = (Get-ChildItem $npmCache -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1GB
    Write-Host "npm-cache: $([math]::Round($size,2)) GB"
}

# Check node_modules in common locations
Write-Host "`n=== NODE_MODULES ===" -ForegroundColor Yellow
$devFolders = Get-ChildItem "C:\dev" -Directory -ErrorAction SilentlyContinue
foreach ($folder in $devFolders) {
    $nm = Join-Path $folder.FullName "node_modules"
    if (Test-Path $nm) {
        $size = (Get-ChildItem $nm -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1GB
        Write-Host "$($folder.Name)/node_modules: $([math]::Round($size,2)) GB"
    }
}

# Check Downloads
$downloads = "$env:USERPROFILE\Downloads"
if (Test-Path $downloads) {
    $size = (Get-ChildItem $downloads -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1GB
    Write-Host "`nDownloads: $([math]::Round($size,2)) GB"
}

# Check Recycle Bin
Write-Host "`n=== RECYCLE BIN ===" -ForegroundColor Yellow
$shell = New-Object -ComObject Shell.Application
$rb = $shell.Namespace(10)
$rbSize = ($rb.Items() | Measure-Object -Property Size -Sum).Sum / 1GB
Write-Host "Recycle Bin: $([math]::Round($rbSize,2)) GB"
