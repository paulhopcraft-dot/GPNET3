New-Item -ItemType Directory -Path 'D:\dev\gpnet3\certificates' -Force | Out-Null

$srcDir = 'D:\dev\gpnet3\test cases'
Get-ChildItem -Path $srcDir -Filter '*.zip' | ForEach-Object {
    Write-Host "Extracting: $($_.Name)"
    Expand-Archive -LiteralPath $_.FullName -DestinationPath 'D:\dev\gpnet3\certificates' -Force
}

Write-Host "`nExtracted files:"
Get-ChildItem 'D:\dev\gpnet3\certificates' -Recurse -File | ForEach-Object {
    Write-Host "  $($_.FullName)"
}
