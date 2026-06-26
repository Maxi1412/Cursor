# Check all dependencies for George Orchestra full deploy (Windows)
param(
    [string]$GeorgePath = "C:\Users\acer\Documents\Claude\Projects\Personal_caledar",
    [string]$CursorPath = $PSScriptRoot + "\.."
)

$ErrorActionPreference = "Continue"
$CursorPath = (Resolve-Path $CursorPath).Path
$errors = 0

function Test-Dep($name, $test, $fix = "") {
    if ($test) { Write-Host "  OK   $name" -ForegroundColor Green }
    else {
        Write-Host "  MISS $name" -ForegroundColor Red
        if ($fix) { Write-Host "       Fix: $fix" -ForegroundColor DarkYellow }
        $script:errors++
    }
}

Write-Host "`n=== George Orchestra — Dependency Check ===" -ForegroundColor Cyan

# Node
Test-Dep "Node.js" (Get-Command node -ErrorAction SilentlyContinue) "Install Node 18+ from nodejs.org"
if (Get-Command node -ErrorAction SilentlyContinue) {
    $v = node -v
    Test-Dep "Node 18+" ($v -match 'v(1[89]|[2-9]\d)') "Upgrade Node.js"
}

# npm + modules
Test-Dep "npm" (Get-Command npm -ErrorAction SilentlyContinue)
Test-Dep "node_modules (Cursor)" (Test-Path (Join-Path $CursorPath "node_modules")) "cd $CursorPath && npm install"

# .env
$envFile = Join-Path $CursorPath ".env"
Test-Dep ".env file" (Test-Path $envFile) "copy .env.example .env and fill in Firebase"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    Test-Dep "FIREBASE_PROJECT_ID" ($envContent -match 'FIREBASE_PROJECT_ID=\S+') "Set FIREBASE_PROJECT_ID in .env"
    Test-Dep "GOOGLE_APPLICATION_CREDENTIALS" ($envContent -match 'GOOGLE_APPLICATION_CREDENTIALS=\S+') "Set service account path"
}

# George project
Test-Dep "George project" (Test-Path $GeorgePath) "Ensure Personal_caledar exists at $GeorgePath"
if (Test-Path $GeorgePath) {
    Test-Dep "George package.json" (Test-Path (Join-Path $GeorgePath "package.json"))
    Test-Dep "George android/" (Test-Path (Join-Path $GeorgePath "android")) "React Native android folder required for APK"
    Test-Dep "google-services.json" (Test-Path (Join-Path $GeorgePath "android\app\google-services.json")) "Firebase Android config"
    Test-Dep "orchestra module" (Test-Path (Join-Path $GeorgePath "orchestra\george-bridge.ts")) "Run: npm run george:setup"
}

# Android build tools
Test-Dep "Java" (Get-Command java -ErrorAction SilentlyContinue) "Install JDK 17+"
Test-Dep "ANDROID_HOME" ($env:ANDROID_HOME -and (Test-Path $env:ANDROID_HOME)) "Set ANDROID_HOME to Android SDK path"

# Google Drive
$driveFound = $false
@("$env:USERPROFILE\Google Drive", "G:\My Drive", "G:\") | ForEach-Object {
    if (Test-Path $_) {
        $target = Join-Path $_ "Application Projects\personal calendar"
        if (Test-Path (Split-Path $target -Parent)) { $driveFound = $true }
    }
}
Test-Dep "Google Drive path" $driveFound "Install Google Drive Desktop and sync 'Application Projects' folder"

# Firebase CLI (optional)
if (Get-Command firebase -ErrorAction SilentlyContinue) {
    Write-Host "  OK   firebase CLI (optional)" -ForegroundColor Green
} else {
    Write-Host "  WARN firebase CLI not found (optional for rules deploy)" -ForegroundColor DarkYellow
}

Write-Host ""
if ($errors -gt 0) {
    Write-Host "FAILED: $errors dependency issue(s) — fix before full deploy" -ForegroundColor Red
    exit 1
}
Write-Host "All dependencies OK — ready for full deploy" -ForegroundColor Green
