# Detect K: Google Drive (maxscheurer85@gmail.com), G: and other mapped drives
param(
    [string]$Account = "maxscheurer85@gmail.com"
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

# PRIMARY: K: = Google Drive for maxscheurer85@gmail.com (per user screenshot)
$primaryK = "K:\Application Projects\personal calendar"
if (Test-Path "K:\") {
    Ensure-Folder (Split-Path $primaryK -Parent)
    Ensure-Folder $primaryK
    Add-DeployPath "K-Drive-GoogleDrive" $primaryK "K: ($Account)"
}

# Secondary: other Google Drive letters (G:, H:, J: from screenshot)
@("G", "H", "J") | ForEach-Object {
    $letter = "${_}:\"
    if (Test-Path $letter) {
        $target = Join-Path $letter "Application Projects\personal calendar"
        Ensure-Folder (Split-Path $target -Parent)
        Ensure-Folder $target
        Add-DeployPath "${_}-Drive" $target $letter
    }
}

# User profile Google Drive paths
@(
    "$env:USERPROFILE\Google Drive\My Drive",
    "$env:USERPROFILE\Google Drive"
) | ForEach-Object {
    if (Test-Path $_) {
        $target = Join-Path $_ "Application Projects\personal calendar"
        Ensure-Folder (Split-Path $target -Parent)
        Ensure-Folder $target
        Add-DeployPath "GoogleDrive-Profile" $target $_
    }
}

# Synology / NAS mapped drives
Get-PSDrive -PSProvider FileSystem -ErrorAction SilentlyContinue | ForEach-Object {
    $root = $_.Root
    if ($root -match '^[A-Z]:\\$' -and $root -notin @('K:\', 'C:\')) {
        $display = (Get-PSDrive $_.Name -ErrorAction SilentlyContinue).DisplayRoot
        if ($display -match 'synology|\\\\|192\.168') {
            $nasTarget = Join-Path $root "Application Projects\personal calendar"
            Ensure-Folder (Split-Path $nasTarget -Parent)
            Ensure-Folder $nasTarget
            Add-DeployPath "NAS" $nasTarget $display
        }
    }
}

if ($paths.Count -eq 0) {
    Write-Host "WARNING: No K: or Google Drive paths detected." -ForegroundColor Yellow
}

return $paths
