# Full George Orchestra deploy: integrate → test → build APK → copy to local + G Drive + NAS
param(
    [string]$GeorgePath = "C:\Users\acer\Documents\Claude\Projects\Personal_caledar",
    [string]$CursorPath = $PSScriptRoot + "\..",
    [ValidateSet("debug", "release")]
    [string]$Variant = "release",
    [switch]$SkipIntegrate,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$CursorPath = (Resolve-Path $CursorPath).Path

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  George Orchestra — FULL DEPLOY" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Dependencies
Write-Host "[1/6] Checking dependencies..." -ForegroundColor Yellow
& (Join-Path $CursorPath "scripts\check-deps.ps1") -GeorgePath $GeorgePath -CursorPath $CursorPath
if ($LASTEXITCODE -ne 0) { exit 1 }

# 2. Install coordinator deps
Write-Host "`n[2/6] Installing coordinator dependencies..." -ForegroundColor Yellow
Push-Location $CursorPath
npm install --silent
Pop-Location

# 3. Integrate orchestra into George
if (-not $SkipIntegrate) {
    Write-Host "`n[3/6] Integrating orchestra into George..." -ForegroundColor Yellow
    & (Join-Path $CursorPath "scripts\integrate-george.ps1") -GeorgePath $GeorgePath -CursorPath $CursorPath
} else {
    Write-Host "`n[3/6] Skipping integration (--SkipIntegrate)" -ForegroundColor DarkYellow
}

# 4. Backend tests
Write-Host "`n[4/6] Running backend tests..." -ForegroundColor Yellow
Push-Location $CursorPath
npm test
if ($LASTEXITCODE -ne 0) {
    Write-Host "Backend tests FAILED" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "  Backend tests passed" -ForegroundColor Green

# 5. Verify Firebase wiring
Write-Host "`n[5/6] Verifying Firebase configuration..." -ForegroundColor Yellow
& (Join-Path $CursorPath "scripts\verify-firebase.ps1") -GeorgePath $GeorgePath -CursorPath $CursorPath

# 6. Build APK + deploy
if (-not $SkipBuild) {
    Write-Host "`n[6/6] Building APK and deploying..." -ForegroundColor Yellow
    & (Join-Path $CursorPath "scripts\build-deploy-george.ps1") -GeorgePath $GeorgePath -CursorPath $CursorPath -Variant $Variant
    if ($LASTEXITCODE -ne 0) { exit 1 }
} else {
    Write-Host "`n[6/6] Skipping APK build (--SkipBuild)" -ForegroundColor DarkYellow
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  FULL DEPLOY COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host @"

APK locations:
  - $GeorgePath\builds\
  - Google Drive\Application Projects\personal calendar\
  - Synology/NAS (if detected)

Next:
  1. npm run orchestra:start     (desktop coordinator)
  2. Install APK on phone
  3. Say: "Activate Project Management mode"

"@ -ForegroundColor Cyan
