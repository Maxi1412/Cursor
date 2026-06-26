# Detect Google Drive (G:), Synology NAS, and mapped drives for APK deploy
param(
    [string]$GoogleFolder = "Application Projects\personal calendar",
    [string]$Account = "SCHEUERER85@gmail.com"
)

$paths = @()

function Add-DeployPath($type, $path, $source) {
    if (Test-Path $path -ErrorAction SilentlyContinue) {
        $script:paths += @{ Type = $type; Path = $path; Source = $source }
    }
}

function Ensure-Folder($path) {
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
    }
}

# Google Drive Desktop — all common mount points including G: drive
$driveCandidates = @(
    "G:\My Drive",
    "G:\",
    "$env:USERPROFILE\Google Drive\My Drive",
    "$env:USERPROFILE\Google Drive",
    "$env:USERPROFILE\My Drive",
    "H:\My Drive",
    "H:\Google Drive"
)

foreach ($base in $driveCandidates) {
    if (Test-Path $base -ErrorAction SilentlyContinue) {
        $appProjects = Join-Path $base "Application Projects"
        Ensure-Folder $appProjects
        $target = Join-Path $appProjects "personal calendar"
        Ensure-Folder $target
        Add-DeployPath "GoogleDrive" $target $base
    }
}

# Also check G: drive root directly (user mentioned "G drive")
if (Test-Path "G:\" -ErrorAction SilentlyContinue) {
    $gTarget = "G:\Application Projects\personal calendar"
    Ensure-Folder (Split-Path $gTarget -Parent)
    Ensure-Folder $gTarget
    Add-DeployPath "G-Drive" $gTarget "G:\"
}

# Synology / mapped network drives
Get-PSDrive -PSProvider FileSystem -ErrorAction SilentlyContinue | ForEach-Object {
    $root = $_.Root
    if ($root -match '^[A-Z]:\\$' -and $root -ne 'G:\') {
        $display = (Get-PSDrive $_.Name -ErrorAction SilentlyContinue).DisplayRoot
        if ($display -match 'synology|\\\\|NAS') {
            $nasTarget = Join-Path $root "Application Projects\personal calendar"
            Ensure-Folder (Split-Path $nasTarget -Parent)
            Ensure-Folder $nasTarget
            Add-DeployPath "Synology/NAS" $nasTarget $display
        }
    }
}

# UNC paths
@("\\synology", "\\NAS", "\\DISKSTATION") | ForEach-Object {
    if (Test-Path $_ -ErrorAction SilentlyContinue) {
        $nasTarget = Join-Path $_ "Application Projects\personal calendar"
        Ensure-Folder (Split-Path $nasTarget -Parent)
        Ensure-Folder $nasTarget
        Add-DeployPath "UNC/NAS" $nasTarget $_
    }
}

if ($paths.Count -eq 0) {
    Write-Host "WARNING: No Google Drive or NAS paths detected. APK will only save locally." -ForegroundColor Yellow
}

return $paths
