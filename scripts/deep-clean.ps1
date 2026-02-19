# Chrome cache cleanup
$chromeCache = "C:\Users\Paul\AppData\Local\Google\Chrome\User Data\Default\Cache"
$chromeCacheData = "C:\Users\Paul\AppData\Local\Google\Chrome\User Data\Default\Code Cache"
$chromeServiceWorker = "C:\Users\Paul\AppData\Local\Google\Chrome\User Data\Default\Service Worker\CacheStorage"

foreach ($path in @($chromeCache, $chromeCacheData, $chromeServiceWorker)) {
    if (Test-Path $path) {
        $size = (Get-ChildItem $path -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        Write-Host "Cleaning $path ($([math]::Round($size/1MB,0)) MB)..."
        Remove-Item "$path\*" -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# Claude session transcripts (old ones)
$claudeProjects = "C:\Users\Paul\.claude\projects"
if (Test-Path $claudeProjects) {
    $jsonlFiles = Get-ChildItem $claudeProjects -Filter "*.jsonl" -Recurse -ErrorAction SilentlyContinue
    $totalSize = ($jsonlFiles | Measure-Object -Property Length -Sum).Sum
    Write-Host "`nClaude session transcripts: $($jsonlFiles.Count) files, $([math]::Round($totalSize/1MB,0)) MB"
    # Keep only last 5 per project folder, delete older ones
    Get-ChildItem $claudeProjects -Directory -ErrorAction SilentlyContinue | ForEach-Object {
        $projectJsonls = Get-ChildItem $_.FullName -Filter "*.jsonl" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
        if ($projectJsonls.Count -gt 5) {
            $toDelete = $projectJsonls | Select-Object -Skip 5
            $delSize = ($toDelete | Measure-Object -Property Length -Sum).Sum
            Write-Host "  Removing $($toDelete.Count) old transcripts from $($_.Name) ($([math]::Round($delSize/1MB,0)) MB)"
            $toDelete | Remove-Item -Force -ErrorAction SilentlyContinue
        }
    }
}

# Playwright browsers (old versions)
$pwBrowsers = "C:\Users\Paul\AppData\Local\ms-playwright"
if (Test-Path $pwBrowsers) {
    $size = (Get-ChildItem $pwBrowsers -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    Write-Host "`nPlaywright browsers: $([math]::Round($size/1MB,0)) MB"
}

# Discord cache
$discordCache = "C:\Users\Paul\AppData\Local\Discord"
if (Test-Path "$discordCache\Cache") {
    $size = (Get-ChildItem "$discordCache\Cache" -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    Write-Host "`nDiscord cache: $([math]::Round($size/1MB,0)) MB - clearing..."
    Remove-Item "$discordCache\Cache\*" -Recurse -Force -ErrorAction SilentlyContinue
}

# Ollama models check
$ollama = "C:\Users\Paul\AppData\Local\Ollama"
if (Test-Path $ollama) {
    $size = (Get-ChildItem $ollama -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    Write-Host "`nOllama local models: $([math]::Round($size/1GB,2)) GB (delete with 'ollama rm <model>' if not needed)"
}

# Windows Update cleanup
Write-Host "`nRunning Windows disk cleanup for system files..."
Start-Process cleanmgr -ArgumentList "/d C /sagerun:1" -NoNewWindow -ErrorAction SilentlyContinue

# Final check
$drive = Get-PSDrive C
Write-Host "`n=== AFTER CLEANUP ==="
Write-Host "Free: $([math]::Round($drive.Free/1GB,2)) GB"
