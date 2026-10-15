$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$destination = Join-Path $projectRoot 'dist'
New-Item -ItemType Directory -Path $destination -Force | Out-Null
foreach ($asset in @('index.html','host.html','lab.html','style.css','app.js','math.js','firebase-config.js')) {
    Copy-Item -LiteralPath (Join-Path $projectRoot $asset) -Destination (Join-Path $destination $asset) -Force
}
Write-Output 'Static app ready in dist'
