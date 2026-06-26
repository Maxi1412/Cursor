# Verify Firebase wiring between George (phone) and desktop coordinator
param(
    [string]$CursorPath = $PSScriptRoot + "\..",
    [string]$GeorgePath = "C:\Users\acer\Documents\Claude\Projects\Personal_caledar"
)

$ErrorActionPreference = "Stop"
$envFile = Join-Path $CursorPath ".env"

Write-Host "`n=== Firebase Orchestra Verification ===" -ForegroundColor Cyan

if (-not (Test-Path $envFile)) {
    Write-Host "WARNING: .env not found. Copy .env.example to .env and set FIREBASE_PROJECT_ID" -ForegroundColor Yellow
}

# Load .env
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), 'Process')
        }
    }
}

$projectId = $env:FIREBASE_PROJECT_ID
if (-not $projectId) {
    Write-Host "ERROR: FIREBASE_PROJECT_ID not set in .env" -ForegroundColor Red
    exit 1
}

Write-Host "Firebase project: $projectId"

# Check George google-services.json
$googleServices = Join-Path $GeorgePath "android\app\google-services.json"
if (Test-Path $googleServices) {
    $gs = Get-Content $googleServices -Raw | ConvertFrom-Json
    $georgeProject = $gs.project_info.project_id
    Write-Host "George google-services.json project: $georgeProject"
    if ($georgeProject -ne $projectId) {
        Write-Host "WARNING: Project ID mismatch! Desktop .env=$projectId, George=$georgeProject" -ForegroundColor Yellow
    } else {
        Write-Host "  Project IDs match." -ForegroundColor Green
    }
} else {
    Write-Host "WARNING: google-services.json not found at $googleServices" -ForegroundColor Yellow
}

# Check service account
$creds = $env:GOOGLE_APPLICATION_CREDENTIALS
if ($creds -and (Test-Path $creds)) {
    Write-Host "Service account: $creds [OK]" -ForegroundColor Green
} else {
    Write-Host "WARNING: GOOGLE_APPLICATION_CREDENTIALS not set or file missing" -ForegroundColor Yellow
}

# Check orchestra module in George
$orchestraBridge = Join-Path $GeorgePath "orchestra\george-bridge.ts"
if (Test-Path $orchestraBridge) {
    Write-Host "George orchestra bridge: [OK]" -ForegroundColor Green
} else {
    Write-Host "George orchestra bridge: NOT FOUND — run integrate-george.ps1 first" -ForegroundColor Red
}

# Run desktop health check
Write-Host "`nDesktop tool health:" -ForegroundColor Yellow
Push-Location $CursorPath
npm run orchestra:health 2>&1
Pop-Location

Write-Host @"

Firebase collections (must exist after first use):
  orchestra_desktops/{desktopId}   <- desktop heartbeat
  orchestra_commands/{commandId}   <- phone -> desktop
  orchestra_responses/{commandId}  <- desktop -> phone

To test end-to-end:
  1. npm run orchestra:start   (in Cursor repo)
  2. Check Firestore for orchestra_desktops document updating
  3. On phone: "Activate Project Management mode"

"@ -ForegroundColor Cyan
