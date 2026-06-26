# Build George APK and deploy to local builds/, Google Drive, and Synology/NAS
param(
    [string]$GeorgePath = "C:\Users\acer\Documents\Claude\Projects\Personal_caledar",
    [string]$CursorPath = $PSScriptRoot + "\..",
    [ValidateSet("debug", "release")]
    [string]$Variant = "release"
)

$ErrorActionPreference = "Stop"
$GeorgePath = (Resolve-Path $GeorgePath -ErrorAction SilentlyContinue)?.Path ?? $GeorgePath
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$localBuildDir = Join-Path $GeorgePath "builds"
New-Item -ItemType Directory -Path $localBuildDir -Force | Out-Null

Write-Host "`n=== George Build & Deploy ===" -ForegroundColor Cyan
Write-Host "Project: $GeorgePath"
Write-Host "Variant: $Variant"

# Build APK
Write-Host "`n[1/3] Building APK..." -ForegroundColor Yellow
Push-Location $GeorgePath

$androidDir = Join-Path $GeorgePath "android"
if (-not (Test-Path $androidDir)) {
    Write-Host "ERROR: android/ folder not found. Is this a React Native project?" -ForegroundColor Red
    Pop-Location
    exit 1
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
    Pop-Location
    exit 1
}

$apkName = "George-orchestra-$Variant-$timestamp.apk"
$localApk = Join-Path $localBuildDir $apkName
Copy-Item $apkFull $localApk -Force
Write-Host "  Local APK: $localApk" -ForegroundColor Green

# Copy orchestra config + manifest alongside APK
$orchestraDir = Join-Path $GeorgePath "orchestra"
if (Test-Path $orchestraDir) {
    $bundleDir = Join-Path $localBuildDir "orchestra-$timestamp"
    Copy-Item $orchestraDir $bundleDir -Recurse -Force
    Write-Host "  Orchestra bundle: $bundleDir"
}

Pop-Location

# Deploy to cloud/NAS paths
Write-Host "`n[2/3] Detecting Google Drive / Synology / NAS paths..." -ForegroundColor Yellow
$storagePaths = & (Join-Path $PSScriptRoot "detect-storage-paths.ps1")

Write-Host "`n[3/3] Deploying APK..." -ForegroundColor Yellow
$deployed = @($localApk)

foreach ($target in $storagePaths) {
    try {
        $destApk = Join-Path $target.Path $apkName
        Copy-Item $localApk $destApk -Force
        Write-Host "  -> $($target.Type): $destApk" -ForegroundColor Green
        $deployed += $destApk

        if (Test-Path $orchestraDir) {
            $destOrchestra = Join-Path $target.Path "orchestra-latest"
            if (Test-Path $destOrchestra) { Remove-Item $destOrchestra -Recurse -Force }
            Copy-Item $orchestraDir $destOrchestra -Recurse -Force
        }
    } catch {
        Write-Host "  SKIP $($target.Type): $($_.Exception.Message)" -ForegroundColor DarkYellow
    }
}

# Write deploy log
$logPath = Join-Path $localBuildDir "deploy-$timestamp.json"
@{
    timestamp = $timestamp
    variant = $Variant
    localApk = $localApk
    deployedTo = $deployed
    storageTargets = $storagePaths
} | ConvertTo-Json -Depth 5 | Set-Content $logPath

Write-Host "`nDeploy complete. Log: $logPath" -ForegroundColor Green
Write-Host "APK saved to:" -ForegroundColor Cyan
$deployed | ForEach-Object { Write-Host "  $_" }
