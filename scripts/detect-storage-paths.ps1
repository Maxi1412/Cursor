# Detect Google Drive on G: (and K: if mapped), Synology NAS, mapped drives
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

# PRIMARY: G:\Application Projects\personal calendar (user's exact path)
$primaryG = "G:\Application Projects\personal calendar"
if (Test-Path "G:\") {
    Ensure-Folder (Split-Path $primaryG -Parent)
    Ensure-Folder $primaryG
    Add-DeployPath "G-Drive-Primary" $primaryG "G:\"
}

# K: drive (user mentioned "K for Kilo" — may be alternate Google Drive letter)
if (Test-Path "K:\") {
    $kTarget = "K:\Application Projects\personal calendar"
    Ensure-Folder (Split-Path $kTarget -Parent)
    Ensure-Folder $kTarget
    Add-DeployPath "K-Drive" $kTarget "K:\"
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
