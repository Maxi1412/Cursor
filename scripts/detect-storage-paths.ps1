# Detect Google Drive, Synology NAS, and mapped drives for APK deploy
param(
    [string]$GoogleFolder = "Application Projects\personal calendar",
    [string]$Account = "SCHEUERER85@gmail.com"
)

$paths = @()

# Google Drive Desktop common mount points
$driveCandidates = @(
    "$env:USERPROFILE\Google Drive",
    "$env:USERPROFILE\My Drive",
    "G:\My Drive",
    "G:\",
    "H:\My Drive"
)

foreach ($base in $driveCandidates) {
    if (Test-Path $base) {
        $target = Join-Path $base $GoogleFolder
        if (Test-Path (Split-Path $target -Parent)) {
            if (-not (Test-Path $target)) {
                New-Item -ItemType Directory -Path $target -Force | Out-Null
            }
            $paths += @{ Type = "GoogleDrive"; Path = $target; Source = $base }
        }
    }
}

# Synology / mapped network drives
Get-PSDrive -PSProvider FileSystem | ForEach-Object {
    $root = $_.Root
    if ($root -match '^[A-Z]:\\$') {
        $display = (Get-PSDrive $_.Name).DisplayRoot
        if ($display -match 'synology|\\\\') {
            $nasTarget = Join-Path $root "Application Projects\personal calendar"
            if (-not (Test-Path $nasTarget)) {
                New-Item -ItemType Directory -Path $nasTarget -Force -ErrorAction SilentlyContinue | Out-Null
            }
            if (Test-Path $nasTarget) {
                $paths += @{ Type = "Synology/NAS"; Path = $nasTarget; Source = $display }
            }
        }
    }
}

# UNC paths
@("\\synology", "\\NAS") | ForEach-Object {
    $unc = $_
    if (Test-Path $unc -ErrorAction SilentlyContinue) {
        $nasTarget = Join-Path $unc "Application Projects\personal calendar"
        if (-not (Test-Path $nasTarget)) {
            New-Item -ItemType Directory -Path $nasTarget -Force -ErrorAction SilentlyContinue | Out-Null
        }
        if (Test-Path $nasTarget) {
            $paths += @{ Type = "UNC/NAS"; Path = $nasTarget; Source = $unc }
        }
    }
}

return $paths
