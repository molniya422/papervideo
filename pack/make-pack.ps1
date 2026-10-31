# PaperVideo Skills Pack packaging script v2 (PowerShell)
# Produces TWO artifacts with separated responsibilities:
#   1) paper-explain-skills-pack.zip  - skills pack: skills/ + WORKFLOW.md + design-picker.html + manifest + INSTALL.md
#      (does NOT contain paperpipe; makes no executor claims)
#   2) papervideo-workspace-pack.zip  - workspace pack: paperpipe/ + skills/ + docs + baseline report
#      (verified by running `python -X utf8 -m paperpipe --help` and `validate` in a temp dir)
# Self-checks: local<->manifest bidirectional diff; SKILL.md present per skill;
# exclude __pycache__/*.pyc; re-read zip entries after compression.

$ErrorActionPreference = "Stop"
$Root = (Split-Path $PSScriptRoot -Parent)
$Staging = Join-Path $env:TEMP ("papervideo-pack-" + [guid]::NewGuid().ToString("N").Substring(0,8))
$SkillsZip = Join-Path $Root "paper-explain-skills-pack.zip"
$WorkspaceZip = Join-Path $Root "papervideo-workspace-pack.zip"

if (Test-Path $Staging) { Remove-Item -Recurse -Force $Staging }
New-Item -ItemType Directory -Force -Path $Staging | Out-Null

$manifestPath = Join-Path $Root "pack\paper-explain-skills-pack.json"
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$skillDirs = $manifest.install.skillDirs
$skillsSrc = Join-Path $Root ".zcode\skills"

# -- Check 1: local <-> manifest bidirectional diff; SKILL.md present --
$local = Get-ChildItem $skillsSrc -Directory | Select-Object -ExpandProperty Name
$missingLocal = @($skillDirs | Where-Object { $local -notcontains $_ })
$missingManifest = @($local | Where-Object { $skillDirs -notcontains $_ })
$noSkillMd = @($skillDirs | Where-Object { -not (Test-Path (Join-Path $skillsSrc "$_\SKILL.md")) })
if ($missingLocal.Count -gt 0) { Write-Host "ABORT manifest-not-in-local: $($missingLocal -join ', ')"; exit 1 }
if ($missingManifest.Count -gt 0) { Write-Host "ABORT local-not-in-manifest: $($missingManifest -join ', ')"; exit 1 }
if ($noSkillMd.Count -gt 0) { Write-Host "ABORT missing SKILL.md: $($noSkillMd -join ', ')"; exit 1 }
if ($skillDirs.Count -ne $manifest.count) { Write-Host "ABORT manifest.count $($manifest.count) != skillDirs $($skillDirs.Count)"; exit 1 }
Write-Host "Check1 OK: bidirectional diff empty, skills=$($skillDirs.Count)"

function Copy-Skills($dest) {
  foreach ($name in $skillDirs) {
    $src = Join-Path $skillsSrc $name
    $dst = Join-Path $dest $name
    New-Item -ItemType Directory -Force -Path $dst | Out-Null
    Get-ChildItem -Path $src -Recurse -File |
      Where-Object { $_.FullName -notmatch '\\(__pycache__|node_modules)\\' -and $_.Extension -notin '.mp4','.pdf','.wav','.pyc' } |
      ForEach-Object {
        $rel = $_.FullName.Substring($src.Length).TrimStart('\')
        $target = Join-Path $dst $rel
        $dir = Split-Path $target -Parent
        if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
        Copy-Item $_.FullName $target -Force
      }
  }
}

# -- Artifact 1: skills pack --
$s1 = Join-Path $Staging "skills-pack"
New-Item -ItemType Directory -Force -Path (Join-Path $s1 "skills") | Out-Null
Copy-Skills (Join-Path $s1 "skills")
Copy-Item (Join-Path $Root "WORKFLOW.md") $s1
Copy-Item (Join-Path $Root "design-picker.html") $s1
Copy-Item $manifestPath $s1
Copy-Item (Join-Path $Root "pack\README.md") (Join-Path $s1 "INSTALL.md")
if (Test-Path $SkillsZip) { Remove-Item $SkillsZip }
Compress-Archive -Path (Join-Path $s1 "*") -DestinationPath $SkillsZip -CompressionLevel Optimal

# -- Artifact 2: workspace pack (includes paperpipe) --
$s2 = Join-Path $Staging "workspace-pack"
New-Item -ItemType Directory -Force -Path (Join-Path $s2 "skills") | Out-Null
Copy-Skills (Join-Path $s2 "skills")
# robocopy silently fails in some PS hosts (rc=16) - use Copy-Item then prune, deterministically
Copy-Item (Join-Path $Root "paperpipe") (Join-Path $s2 "paperpipe") -Recurse -Force
Get-ChildItem (Join-Path $s2 "paperpipe") -Recurse -Directory -Filter "__pycache__" |
  ForEach-Object { Remove-Item $_.FullName -Recurse -Force }
Get-ChildItem (Join-Path $s2 "paperpipe") -Recurse -File -Include "*.pyc" |
  ForEach-Object { Remove-Item $_.FullName -Force }
foreach ($f in @("WORKFLOW.md","WORKFLOW-MAP.md","AGENTS.md","README.md","design-picker.html")) {
  Copy-Item (Join-Path $Root $f) $s2
}
New-Item -ItemType Directory -Force -Path (Join-Path $s2 "docs") | Out-Null
Get-ChildItem (Join-Path $Root "docs") -Filter *.md | ForEach-Object { Copy-Item $_.FullName (Join-Path $s2 "docs") }
Copy-Item $manifestPath $s2
Copy-Item (Join-Path $Root "pack\README.md") (Join-Path $s2 "PACK-README.md")
if (Test-Path $WorkspaceZip) { Remove-Item $WorkspaceZip }
Compress-Archive -Path (Join-Path $s2 "*") -DestinationPath $WorkspaceZip -CompressionLevel Optimal

# -- Check 2: re-read zips --
Add-Type -AssemblyName System.IO.Compression.FileSystem
function Verify-Zip($zipPath, $expect) {
  $z = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
  try {
    # Compress-Archive may store '\' separators depending on version; normalize to '/'
    $names = @($z.Entries | Select-Object -ExpandProperty FullName | ForEach-Object { $_ -replace '\\','/' })
    foreach ($e in $expect) {
      if (-not ($names | Where-Object { $_ -like $e })) { Write-Host "ABORT $zipPath missing $e"; exit 1 }
    }
    $skillTop = @($names | Where-Object { $_ -match '^skills/[^/]+/' } | ForEach-Object { ($_ -split '/')[1] } | Sort-Object -Unique)
    if ($skillTop.Count -ne $skillDirs.Count) { Write-Host "ABORT $zipPath skills $($skillTop.Count) != $($skillDirs.Count)"; exit 1 }
    $bad = @($names | Where-Object { $_ -match '__pycache__|\.pyc$' })
    if ($bad.Count -gt 0) { Write-Host "ABORT $zipPath contains excluded: $($bad[0])"; exit 1 }
  } finally { $z.Dispose() }
}
Verify-Zip $SkillsZip @("skills/anatomy/SKILL.md", "skills/paper-explain/SKILL.md", "WORKFLOW.md")
Verify-Zip $WorkspaceZip @("paperpipe/__init__.py", "paperpipe/registry/contracts.yaml", "WORKFLOW-MAP.md", "docs/baseline-2026-10-31.md")
Write-Host "Check2 OK: zip re-read complete"

# -- Check 3: workspace pack runs in a temp dir (-X utf8 avoids GBK console issues) --
$tmpRun = Join-Path $env:TEMP ("papervideo-verify-" + [guid]::NewGuid().ToString("N").Substring(0,8))
New-Item -ItemType Directory -Force -Path $tmpRun | Out-Null
$failed = $false
try {
  Expand-Archive -Path $WorkspaceZip -DestinationPath $tmpRun -Force
  Push-Location $tmpRun
  python -X utf8 -m paperpipe --help | Out-Null
  if ($LASTEXITCODE -ne 0) { Write-Host "ABORT: --help failed"; $failed = $true }
  if (-not $failed) {
    python -X utf8 -m paperpipe validate --target md | Out-Null   # md target does not require remotion-studio
    if ($LASTEXITCODE -ne 0) { Write-Host "ABORT: validate failed"; $failed = $true }
  }
  Pop-Location
  if (-not $failed) { Write-Host "Check3 OK: temp-dir --help / validate both OK" }
} finally {
  if ((Get-Location).Path -eq $tmpRun) { Pop-Location }
  Remove-Item -Recurse -Force $tmpRun -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force $Staging -ErrorAction SilentlyContinue
}
if ($failed) { exit 1 }

Write-Host ""
Write-Host "Packaging done:"
foreach ($z in @($SkillsZip, $WorkspaceZip)) {
  $size = (Get-Item $z).Length / 1MB
  Write-Host ("  {0}  ({1:N1} MB)" -f $z, $size)
}
