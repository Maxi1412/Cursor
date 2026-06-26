# George Orchestra — one-command integration
# Copies orchestra module, patches speech handler, wires Firebase
param(
    [string]$GeorgePath = "C:\Users\acer\Documents\Claude\Projects\Personal_caledar",
    [string]$CursorPath = $PSScriptRoot + "\..",
    [switch]$SkipPatch,
    [switch]$Build,
    [switch]$Deploy
)

$ErrorActionPreference = "Stop"
$CursorPath = (Resolve-Path $CursorPath).Path
$ConfigPath = Join-Path $CursorPath "george-orchestra.config.json"

Write-Host "`n=== George Orchestra Integration ===" -ForegroundColor Cyan
Write-Host "George project: $GeorgePath"
Write-Host "Cursor repo:    $CursorPath"

if (-not (Test-Path $GeorgePath)) {
    Write-Host "ERROR: George project not found at $GeorgePath" -ForegroundColor Red
    exit 1
}

# 1. Prepare RN-compatible orchestra module
Write-Host "`n[1/5] Preparing orchestra module for React Native..." -ForegroundColor Yellow
$staging = Join-Path $CursorPath ".george-orchestra-staging"
node (Join-Path $CursorPath "scripts\prepare-george-orchestra.mjs") $staging

# 2. Copy to George project
Write-Host "[2/5] Copying orchestra module to George..." -ForegroundColor Yellow
$orchestraDest = Join-Path $GeorgePath "orchestra"
if (Test-Path $orchestraDest) { Remove-Item $orchestraDest -Recurse -Force }
New-Item -ItemType Directory -Path $orchestraDest -Force | Out-Null

Copy-Item -Path (Join-Path $staging "*") -Destination $orchestraDest -Recurse -Force
Write-Host "  -> $orchestraDest"

# 3. Patch speech handler
if (-not $SkipPatch) {
    Write-Host "[3/6] Patching George speech handler..." -ForegroundColor Yellow
    node (Join-Path $CursorPath "scripts\patch-george-speech.mjs") $GeorgePath $ConfigPath
    Write-Host "[3b/6] Patching George version to 2.19.0..." -ForegroundColor Yellow
    node (Join-Path $CursorPath "scripts\patch-george-version.mjs") $GeorgePath
} else {
    Write-Host "[3/5] Skipping speech patch (--SkipPatch)" -ForegroundColor DarkYellow
}

# 4. Merge Firestore rules
Write-Host "[4/5] Updating Firestore rules..." -ForegroundColor Yellow
$rulesExample = Join-Path $CursorPath "orchestra\firestore.rules.example"
$georgeRules = Join-Path $GeorgePath "firestore.rules"
if (Test-Path $georgeRules) {
    $existing = Get-Content $georgeRules -Raw
    $orchestraRules = Get-Content $rulesExample -Raw
    if ($existing -notmatch "orchestra_commands") {
        $merged = $existing -replace '(\}\s*)$', ($orchestraRules -replace 'rules_version.*?match /databases', 'match /databases')
        # Simpler: append orchestra rules inside existing match block
        $orchestraBlock = @"

    // George Orchestra Mode (auto-added)
    match /orchestra_desktops/{desktopId} { allow read, write: if request.auth != null; }
    match /orchestra_commands/{commandId} { allow read, write: if request.auth != null; }
    match /orchestra_responses/{responseId} { allow read, write: if request.auth != null; }
    match /orchestra_projects/{projectId} { allow read, write: if request.auth != null; }
    match /orchestra_tasks/{taskId} { allow read, write: if request.auth != null; }
    match /orchestra_sessions/{sessionId} { allow read, write: if request.auth != null; }
"@
        if ($existing -match 'match /databases') {
            $merged = $existing -replace '(\n\s*\}\s*\n\s*\})', "$orchestraBlock`n  }`n}"
            Set-Content $georgeRules $merged -NoNewline
            Write-Host "  Merged orchestra rules into firestore.rules"
        }
    }
} else {
    Copy-Item $rulesExample $georgeRules
    Write-Host "  Created firestore.rules from template"
}

# 5. Write integration manifest
Write-Host "[5/5] Writing integration manifest..." -ForegroundColor Yellow
$manifest = @{
    integratedAt = (Get-Date -Format "o")
    cursorRepo = $CursorPath
    georgeProject = $GeorgePath
    version = "2.19.0"
} | ConvertTo-Json
Set-Content (Join-Path $orchestraDest "integration-manifest.json") $manifest

Write-Host "`nIntegration complete!" -ForegroundColor Green

if ($Build -or $Deploy) {
    & (Join-Path $CursorPath "scripts\build-deploy-george.ps1") -GeorgePath $GeorgePath -CursorPath $CursorPath
}

Write-Host @"

Next steps:
  1. Desktop:  cd $CursorPath && npm run orchestra:start
  2. Firebase: firebase deploy --only firestore:rules  (from George project)
  3. Phone:    Say "Activate Project Management mode"

"@
