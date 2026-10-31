# PaperVideo Skills Pack 打包脚本（PowerShell）
# 生成 paper-explain-skills-pack.zip，含 63 个技能 + WORKFLOW.md + design-picker.html
# 剔除 node_modules 与大型演示资产，保持包体轻量

$ErrorActionPreference = "Stop"
$Root = (Split-Path $PSScriptRoot -Parent)
$Staging = Join-Path $env:TEMP ("paper-explain-skills-pack-" + [guid]::NewGuid().ToString("N").Substring(0,8))
$Zip = Join-Path $Root "paper-explain-skills-pack.zip"

if (Test-Path $Staging) { Remove-Item -Recurse -Force $Staging }
New-Item -ItemType Directory -Force -Path $Staging | Out-Null
$skillsDest = Join-Path $Staging "skills"
New-Item -ItemType Directory -Force -Path $skillsDest | Out-Null

$manifest = Get-Content (Join-Path $Root "pack\paper-explain-skills-pack.json") -Raw | ConvertFrom-Json
$skillDirs = $manifest.install.skillDirs

$copied = 0
$skipped = @()
foreach ($name in $skillDirs) {
  $src = Join-Path $Root ".zcode\skills\$name"
  if (-not (Test-Path $src)) { $skipped += $name; continue }
  $dst = Join-Path $skillsDest $name
  New-Item -ItemType Directory -Force -Path $dst | Out-Null
  # 用 Copy-Item 递归拷贝，跳过 node_modules
  Get-ChildItem -Path $src -Recurse -File |
    Where-Object { $_.FullName -notmatch '\\node_modules\\' -and $_.Extension -notin '.mp4','.pdf','.wav' } |
    ForEach-Object {
      $rel = $_.FullName.Substring($src.Length).TrimStart('\')
      $target = Join-Path $dst $rel
      $dir = Split-Path $target -Parent
      if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
      Copy-Item $_.FullName $target -Force
    }
  if (Test-Path $dst) { $copied++ }
}

# 顶层资产
Copy-Item (Join-Path $Root "WORKFLOW.md") $Staging
Copy-Item (Join-Path $Root "design-picker.html") $Staging
robocopy (Join-Path $Root "paperpipe") (Join-Path $Staging "paperpipe") /E /XD __pycache__ /XF *.pyc /NFL /NDL /NJH /NBS | Out-Null
Copy-Item (Join-Path $Root "pack\paper-explain-skills-pack.json") $Staging
Copy-Item (Join-Path $Root "pack\README.md") $Staging

$missing = @($skillDirs | Where-Object { -not (Test-Path (Join-Path $Root ".zcode\skills\$_")) })
if ($missing.Count -gt 0) { Write-Host "中止：manifest 里有本地缺失的技能: $($missing -join ', ')"; exit 1 }
if ($copied -ne $skillDirs.Count) { Write-Host "中止：复制数 $copied != 清单数 $($skillDirs.Count)"; exit 1 }
if (Test-Path $Zip) { Remove-Item $Zip }
Compress-Archive -Path (Join-Path $Staging "*") -DestinationPath $Zip -CompressionLevel Optimal

Write-Host "打包完成: $Zip"
Write-Host "复制技能数: $copied / $($skillDirs.Count)"
if ($skipped.Count) { Write-Host "缺失跳过: $($skipped -join ', ')" }
$size = (Get-Item $Zip).Length / 1MB
Write-Host ("ZIP 体积: {0:N1} MB" -f $size)
