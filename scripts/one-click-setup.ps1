param(
    [string]$GeorgePath = "C:\Users\acer\Documents\Claude\Projects\Personal_caledar",
    [string]$CursorPath = $PSScriptRoot + "\.."
)

$ErrorActionPreference = "Stop"
$CursorPath = (Resolve-Path $CursorPath).Path

Write-Host "`n=== George Orchestra — One-Click Setup ===" -ForegroundColor Cyan

# Step 1: Integrate
& (Join-Path $CursorPath "scripts\integrate-george.ps1") -GeorgePath $GeorgePath -CursorPath $CursorPath

# Step 2: Verify Firebase
& (Join-Path $CursorPath "scripts\verify-firebase.ps1") -CursorPath $CursorPath -GeorgePath $GeorgePath

Write-Host "`nSetup done. Run these to finish:" -ForegroundColor Green
Write-Host "  npm run orchestra:start          # desktop coordinator"
Write-Host "  npm run george:build-deploy      # build APK + copy to Drive/NAS"
