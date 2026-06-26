# Build George APK v2.19.0 and deploy — local builds/ + G:\Application Projects\personal calendar
param(
    [string]$GeorgePath = "C:\Users\acer\Documents\Claude\Projects\Personal_caledar",
    [string]$CursorPath = $PSScriptRoot + "\..",
    [ValidateSet("debug", "release")]
    [string]$Variant = "release"
)

$ErrorActionPreference = "Stop"
$CursorPath = (Resolve-Path $CursorPath).Path
$configPath = Join-Path $CursorPath "george-orchestra.config.json"
$config = Get-Content $configPath -Raw | ConvertFrom-Json

$GeorgePath = (Resolve-Path $GeorgePath -ErrorAction SilentlyContinue)?.Path ?? $GeorgePath
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$localBuildDir = Join-Path $GeorgePath $config.deploy.localBuildDir
$version = $config.app.version
$apkName = $config.deploy.apkFileName  # Personal_Calendar_v2.19.0.apk

New-Item -ItemType Directory -Path $localBuildDir -Force | Out-Null

Write-Host "`n=== George Build & Deploy v$version ===" -ForegroundColor Cyan
Write-Host "Project:  $GeorgePath"
Write-Host "APK name: $apkName"
Write-Host "Variant:  $Variant"

# Patch version in George android/app/build.gradle
Write-Host "`n[1/5] Patching version $version..." -ForegroundColor Yellow
node (Join-Path $CursorPath "scripts\patch-george-version.mjs") $GeorgePath

# Build APK
Write-Host "`n[2/5] Building APK..." -ForegroundColor Yellow
Push-Location $GeorgePath

$androidDir = Join-Path $GeorgePath "android"
if (-not (Test-Path $androidDir)) {
    Write-Host "ERROR: android/ folder not found at $GeorgePath" -ForegroundColor Red
    Pop-Location; exit 1
}

Push-Location $androidDir
if ($Variant -eq "release") {
    & .\gradlew.bat assembleRelease
    $apkSource = "app\build\outputs\apk\release\app-release.apk"
} else {
    & .\gradlew.bat assembleDebug
    $apkSource = "app\build\outputs\apk\debug\app-debug.apk"
}
Pop-Location

$apkFull = Join-Path $androidDir $apkSource
if (-not (Test-Path $apkFull)) {
    Write-Host "ERROR: APK not found at $apkFull" -ForegroundColor Red
    Pop-Location; exit 1
}

# Save with exact versioned name
$localApk = Join-Path $localBuildDir $apkName
Copy-Item $apkFull $localApk -Force

$apkSize = (Get-Item $localApk).Length
$apkHash = (Get-FileHash $localApk -Algorithm SHA256).Hash
Write-Host "  Built: $localApk ($([math]::Round($apkSize/1MB, 2)) MB)" -ForegroundColor Green
Write-Host "  SHA256: $apkHash" -ForegroundColor DarkGray

# Copy orchestra bundle
$orchestraDir = Join-Path $GeorgePath "orchestra"
if (Test-Path $orchestraDir) {
    $bundleDir = Join-Path $localBuildDir "orchestra-v$version"
    if (Test-Path $bundleDir) { Remove-Item $bundleDir -Recurse -Force }
    Copy-Item $orchestraDir $bundleDir -Recurse -Force
}

Pop-Location

# Remove old local builds (v2.18.0 etc.)
Write-Host "`n[3/5] Cleaning old local APKs..." -ForegroundColor Yellow
Get-ChildItem $localBuildDir -File | Where-Object {
    $_.Name -like "*2.18*" -or ($_.Extension -eq ".apk" -and $_.Name -ne $apkName)
} | ForEach-Object {
    Write-Host "  DELETE local: $($_.Name)" -ForegroundColor Red
    Remove-Item $_.FullName -Force
}

# Deploy to G: drive — delete v2.18.0, copy v2.19.0
Write-Host "`n[4/5] Replacing APK on G: Google Drive..." -ForegroundColor Yellow
& (Join-Path $CursorPath "scripts\replace-gdrive-apk.ps1") -SourceApk $localApk -ConfigPath $configPath
if ($LASTEXITCODE -ne 0) {
    Write-Host "G: drive deploy failed — trying alternate paths..." -ForegroundColor Yellow
    $storagePaths = & (Join-Path $PSScriptRoot "detect-storage-paths.ps1")
    foreach ($target in $storagePaths) {
        if ($target.Path -eq $config.deploy.googleDrive.fullPath) { continue }
        try {
            Get-ChildItem $target.Path -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*2.18*" } | Remove-Item -Force
            Copy-Item $localApk (Join-Path $target.Path $apkName) -Force
            Write-Host "  -> $($target.Type): $(Join-Path $target.Path $apkName)" -ForegroundColor Green
        } catch {
            Write-Host "  SKIP $($target.Type)" -ForegroundColor DarkYellow
        }
    }
}

# Write deploy log
Write-Host "`n[5/5] Writing deploy log..." -ForegroundColor Yellow
$logPath = Join-Path $localBuildDir "deploy-v$version-$timestamp.json"
@{
    timestamp = $timestamp
    version = $version
    previousVersion = $config.app.previousVersion
    variant = $Variant
    apkFileName = $apkName
    localApk = $localApk
    sha256 = $apkHash
    sizeBytes = $apkSize
    gDrivePath = $config.deploy.googleDrive.fullPath
    account = $config.deploy.googleDrive.account
} | ConvertTo-Json -Depth 5 | Set-Content $logPath

Write-Host "`n=== DEPLOY COMPLETE v$version ===" -ForegroundColor Green
Write-Host "  Local:  $localApk"
Write-Host "  G:     $($config.deploy.googleDrive.fullPath)\$apkName"
Write-Host "  Log:   $logPath"
