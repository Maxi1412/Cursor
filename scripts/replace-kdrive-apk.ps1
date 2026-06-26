# Replace Personal Calendar APK — delete v2.18.0, install v2.19.0 on K: Google Drive
param(
    [string]$SourceApk = "",
    [string]$ConfigPath = $PSScriptRoot + "\..\george-orchestra.config.json"
)

$ErrorActionPreference = "Stop"
$config = Get-Content $ConfigPath -Raw | ConvertFrom-Json

$version = $config.app.version
$prevVersion = $config.app.previousVersion
$apkName = $config.deploy.apkFileName
$kDrivePath = $config.deploy.googleDrive.fullPath  # K:\Application Projects\personal calendar
$driveLetter = $config.deploy.googleDrive.driveLetter  # K:

Write-Host "`n=== K: Drive APK Replace (Google Drive: $($config.deploy.googleDrive.account)) ===" -ForegroundColor Cyan
Write-Host "Target: $kDrivePath"
Write-Host "New:    $apkName (v$version)"
Write-Host "Remove: v$prevVersion and older APKs"

# Resolve source APK
if (-not $SourceApk) {
    $localCandidates = @(
        (Join-Path $config.georgeProjectPath "builds\$apkName"),
        (Join-Path $config.georgeProjectPath "builds\Personal_Calendar_v$version.apk")
    )
    foreach ($c in $localCandidates) {
        if (Test-Path $c) { $SourceApk = $c; break }
    }
}

if (-not $SourceApk -or -not (Test-Path $SourceApk)) {
    Write-Host "ERROR: Source APK not found. Build first: npm run george:full-deploy" -ForegroundColor Red
    exit 1
}

# Verify K: drive (Google Drive for maxscheurer85@gmail.com)
if (-not (Test-Path $driveLetter)) {
    Write-Host "ERROR: $driveLetter drive not found. Open Google Drive Desktop for $($config.deploy.googleDrive.account)" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $kDrivePath)) {
    Write-Host "Creating: $kDrivePath" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $kDrivePath -Force | Out-Null
}

# Delete old versions
Write-Host "`n[1/3] Removing old APK files from K:..." -ForegroundColor Yellow
$deleted = @()
Get-ChildItem $kDrivePath -File -ErrorAction SilentlyContinue | ForEach-Object {
    $shouldDelete = $false
    foreach ($pattern in $config.deploy.deletePreviousPatterns) {
        if ($_.Name -like $pattern) { $shouldDelete = $true; break }
    }
    if ($_.Extension -eq ".apk" -and $_.Name -ne $apkName -and $_.Name -match "2\.18|Personal.?Calendar|George|personal.?calendar") {
        $shouldDelete = $true
    }
    if ($shouldDelete) {
        Write-Host "  DELETE: $($_.FullName)" -ForegroundColor Red
        Remove-Item $_.FullName -Force
        $deleted += $_.Name
    }
}

Write-Host "  Deleted: $($deleted.Count) file(s)" -ForegroundColor $(if ($deleted.Count -gt 0) { "Green" } else { "DarkYellow" })

# Copy new APK
Write-Host "`n[2/3] Copying Personal_Calendar_v$version.apk to K:..." -ForegroundColor Yellow
$destApk = Join-Path $kDrivePath $apkName
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

# Confirm
Write-Host "`n[3/3] Confirming K: drive contents..." -ForegroundColor Yellow
$final = Get-ChildItem $kDrivePath -File -Filter "*.apk"
$final | ForEach-Object {
    Write-Host "    $($_.Name)  ($([math]::Round($_.Length/1MB, 2)) MB)" -ForegroundColor Cyan
}

$hasNew = $final | Where-Object { $_.Name -eq $apkName }
$hasOld = $final | Where-Object { $_.Name -match "2\.18" }

if ($hasNew -and -not $hasOld) {
    Write-Host "`nCONFIRMED: K: drive updated to v$version" -ForegroundColor Green
    Write-Host "  $($config.deploy.googleDrive.account) -> $destApk" -ForegroundColor Green
} else {
    if (-not $hasNew) { Write-Host "ERROR: New APK missing after copy" -ForegroundColor Red; exit 1 }
    if ($hasOld) { Write-Host "WARNING: Old v2.18 still present" -ForegroundColor Yellow; exit 1 }
}

$logPath = Join-Path $kDrivePath "deploy-confirmation-v$version.json"
@{
    confirmedAt = (Get-Date -Format "o")
    version = $version
    previousVersion = $prevVersion
    apkFile = $apkName
    fullPath = $destApk
    driveLetter = $driveLetter
    account = $config.deploy.googleDrive.account
    sha256 = $hash
    sizeBytes = $destSize
    deletedFiles = $deleted
} | ConvertTo-Json -Depth 3 | Set-Content $logPath

Write-Host "  Log: $logPath" -ForegroundColor DarkGray
