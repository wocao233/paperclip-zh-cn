# Paperclip 简体中文汉化 —— 一键安装 (Windows PowerShell)
# 用法: .\install.ps1 -Repo "C:\path\to\paperclip"
param(
  [Parameter(Mandatory = $true)]
  [string]$Repo
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path (Join-Path $Repo "ui\src"))) {
  Write-Error "在 $Repo 下未找到 ui\src，请确认为 Paperclip 仓库根目录。"
  exit 1
}

$PkgDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Files  = Join-Path $PkgDir "files"
$Backup = Join-Path $Repo "paperclip-zh-cn-backup"

Write-Host "==> 目标仓库: $Repo"
New-Item -ItemType Directory -Force -Path $Backup | Out-Null

# 收集包内相对路径
$relFiles = Get-ChildItem "$Files" -Recurse -File | ForEach-Object {
  $_.FullName.Substring($Files.Length).TrimStart('\', '/')
}

# 1) 备份
Write-Host "==> 备份原文件到 $Backup"
foreach ($rel in $relFiles) {
  $src = Join-Path $Repo ($rel -replace '/', '\')
  if (Test-Path $src) {
    $dst = Join-Path $Backup ($rel -replace '/', '\')
    New-Item -ItemType Directory -Force -Path (Split-Path $dst -Parent) | Out-Null
    Copy-Item $src $dst -Force
  }
}

# 2) 删除多余语言包
Write-Host "==> 删除多余语言包（仅保留 en / zh-CN / zh-TW）"
Get-Content (Join-Path $PkgDir "locales-to-remove.txt") | Where-Object { $_.Trim() } | ForEach-Object {
  $loc = $_.Trim()
  $target = Join-Path $Repo "ui\src\i18n\locales\$loc"
  if (Test-Path $target) { Remove-Item $target -Force }
}

# 3) 覆盖汉化文件
Write-Host "==> 覆盖汉化文件"
foreach ($rel in $relFiles) {
  $src = Join-Path $Files ($rel -replace '/', '\')
  $dst = Join-Path $Repo ($rel -replace '/', '\')
  New-Item -ItemType Directory -Force -Path (Split-Path $dst -Parent) | Out-Null
  Copy-Item $src $dst -Force
}

# 4) 默认语言
Write-Host "==> 设置默认语言 zh-CN (ui\.env.local)"
Copy-Item (Join-Path $PkgDir "env.local.template") (Join-Path $Repo "ui\.env.local") -Force

Write-Host ""
Write-Host "OK 汉化完成！在仓库根目录运行:  pnpm dev" -ForegroundColor Green
Write-Host "   回滚：将 $Backup 内容拷回 ui\src，并删除 ui\.env.local"
