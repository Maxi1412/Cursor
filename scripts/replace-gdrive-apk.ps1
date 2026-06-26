# Replace Personal Calendar APK on G: Google Drive — delete v2.18.0, install v2.19.0
param(
    [string]$SourceApk = "",
    [string]$ConfigPath = $PSScriptRoot + "\..\george-orchestra.config.json"
)

$ErrorActionPreference = "Stop"
$config = Get-Content $ConfigPath -Raw | ConvertFrom-Json

$version = $config.app.version          # 2.19.0
$prevVersion = $config.app.previousVersion  # 2.18.0
$apkName = $config.deploy.apkFileName   # Personal_Calendar_v2.19.0.apk
$gDrivePath = $config.deploy.googleDrive.fullPath  # G:\Application Projects\personal calendar

Write-Host "`n=== G: Drive APK Replace ===" -ForegroundColor Cyan
Write-Host "Target folder: $gDrivePath"
Write-Host "New version:   $version ($apkName)"
Write-Host "Remove old:    $prevVersion"

# Resolve source APK
if (-not $SourceApk) {
    $localCandidates = @(
        (Join-Path $config.georgeProjectPath "builds\$apkName"),
        (Join-Path $config.georgeProjectPath "builds\Personal_Calendar_v$version.apk"),
        (Join-Path $config.georgeProjectPath "builds\George-orchestra-latest.apk")
    )
    foreach ($c in $localCandidates) {
        if (Test-Path $c) { $SourceApk = $c; break }
    }
}

if (-not $SourceApk -or -not (Test-Path $SourceApk)) {
    Write-Host "ERROR: Source APK not found. Build first: npm run george:full-deploy" -ForegroundColor Red
    exit 1
}

# Verify G: drive
if (-not (Test-Path "G:\")) {
    Write-Host "ERROR: G: drive not found. Is Google Drive Desktop running?" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $gDrivePath)) {
    Write-Host "Creating folder: $gDrivePath" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $gDrivePath -Force | Out-Null
}

# List and delete old versions
Write-Host "`n[1/3] Removing old APK files..." -ForegroundColor Yellow
$deleted = @()
$existing = Get-ChildItem $gDrivePath -File -ErrorAction SilentlyContinue

foreach ($file in $existing) {
    $shouldDelete = $false
    foreach ($pattern in $config.deploy.deletePreviousPatterns) {
        if ($file.Name -like $pattern) { $shouldDelete = $true; break }
    }
    # Also delete any APK that is NOT the new version file
    if ($file.Extension -eq ".apk" -and $file.Name -ne $apkName -and $file.Name -match "2\.18|Personal.?Calendar|George|personal.?calendar") {
        $shouldDelete = $true
    }
    if ($shouldDelete) {
        Write-Host "  DELETE: $($file.FullName)" -ForegroundColor Red
        Remove-Item $file.FullName -Force
        $deleted += $file.Name
    }
}

if ($deleted.Count -eq 0) {
    Write-Host "  No old files matched delete patterns (folder may already be clean)" -ForegroundColor DarkYellow
} else {
    Write-Host "  Deleted $($deleted.Count) old file(s)" -ForegroundColor Green
}

# Copy new APK
Write-Host "`n[2/3] Copying new APK v$version..." -ForegroundColor Yellow
$destApk = Join-Path $gDrivePath $apkName
Copy-Item $SourceApk $destApk -Force

$srcSize = (Get-Item $SourceApk).Length
$destSize = (Get-Item $destApk).Length
$hash = (Get-FileHash $destApk -Algorithm SHA256).Hash

if ($srcSize -ne $destSize) {
    Write-Host "ERROR: Copy size mismatch!" -ForegroundColor Red
    exit 1
}

Write-Host "  COPIED: $destApk" -ForegroundColor Green
Write-Host "  Size:   $([math]::Round($destSize/1MB, 2)) MB" -ForegroundColor Green
Write-Host "  SHA256: $hash" -ForegroundColor DarkGray

# Confirm final state
Write-Host "`n[3/3] Confirming G: drive contents..." -ForegroundColor Yellow
$final = Get-ChildItem $gDrivePath -File -Filter "*.apk" | Select-Object Name, Length, LastWriteTime
Write-Host "  APK files in $gDrivePath :" -ForegroundColor Cyan
$final | ForEach-Object {
    Write-Host "    $($_.Name)  ($([math]::Round($_.Length/1MB, 2)) MB, $($_.LastWriteTime))"
}

$hasNew = $final | Where-Object { $_.Name -eq $apkName }
$hasOld = $final | Where-Object { $_.Name -match "2\.18" }

if ($hasNew -and -not $hasOld) {
    Write-Host "`nCONFIRMED: G: drive updated to v$version" -ForegroundColor Green
    Write-Host "  Old v$prevVersion removed" -ForegroundColor Green
    Write-Host "  New file: $destApk" -ForegroundColor Green
} else {
    if (-not $hasNew) { Write-Host "ERROR: New APK not found after copy" -ForegroundColor Red }
    if ($hasOld) { Write-Host "WARNING: Old v2.18 file(s) still present" -ForegroundColor Yellow }
    exit 1
}

# Write confirmation log
$logPath = Join-Path $gDrivePath "deploy-confirmation-v$version.json"
@{
    confirmedAt = (Get-Date -Format "o")
    version = $version
    previousVersion = $prevVersion
    apkFile = $apkName
    fullPath = $destApk
    sha256 = $hash
    sizeBytes = $destSize
    deletedFiles = $deleted
    account = $config.deploy.googleDrive.account
} | ConvertTo-Json -Depth 3 | Set-Content $logPath

Write-Host "  Log: $logPath" -ForegroundColor DarkGray
