Write-Host "=== C Drive Space ==="
$drive = Get-PSDrive C
Write-Host "Free: $([math]::Round($drive.Free/1GB,2)) GB"
Write-Host "Used: $([math]::Round($drive.Used/1GB,2)) GB"

Write-Host "`n=== Largest folders in C:\Users\Paul ==="
Get-ChildItem 'C:\Users\Paul' -Directory -ErrorAction SilentlyContinue | ForEach-Object {
    $size = (Get-ChildItem $_.FullName -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    [PSCustomObject]@{Folder=$_.Name; SizeGB=[math]::Round($size/1GB,2)}
} | Sort-Object SizeGB -Descending | Select-Object -First 10 | Format-Table -AutoSize

Write-Host "=== Largest in AppData\Local ==="
Get-ChildItem 'C:\Users\Paul\AppData\Local' -Directory -ErrorAction SilentlyContinue | ForEach-Object {
    $size = (Get-ChildItem $_.FullName -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    [PSCustomObject]@{Folder=$_.Name; SizeGB=[math]::Round($size/1GB,2)}
} | Sort-Object SizeGB -Descending | Select-Object -First 15 | Format-Table -AutoSize

Write-Host "=== Windows Temp ==="
$tempSize = (Get-ChildItem 'C:\Windows\Temp' -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
Write-Host "C:\Windows\Temp: $([math]::Round($tempSize/1GB,2)) GB"

Write-Host "=== Recycle Bin ==="
$shell = New-Object -ComObject Shell.Application
$bin = $shell.NameSpace(10)
Write-Host "Items in recycle bin: $($bin.Items().Count)"
