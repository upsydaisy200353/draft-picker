# 用法（在拿到 GitHub Token 后）:
#   $env:GITHUB_TOKEN = "ghp_xxxx"
#   .\deploy\push-github.ps1
#
# 或指定仓库名:
#   .\deploy\push-github.ps1 -RepoName "draft-picker" -Visibility public

param(
    [string]$RepoName = "draft-picker",
    [ValidateSet("public", "private")]
    [string]$Visibility = "public"
)

$ErrorActionPreference = "Stop"
$env:Path = "C:\Program Files\GitHub CLI;$env:Path"
$Root = Split-Path $PSScriptRoot -Parent

Push-Location $Root

if (-not $env:GITHUB_TOKEN) {
    Write-Host @"

缺少 GITHUB_TOKEN。请按以下步骤操作:

1. 浏览器打开 https://github.com/settings/tokens/new
   (若打不开 GitHub，需开代理/VPN)

2. Note 填 draft-picker，勾选 repo 权限，生成 token

3. 在本终端执行:
   `$env:GITHUB_TOKEN = "ghp_你的token"
   .\deploy\push-github.ps1

"@
    exit 1
}

$env:GITHUB_TOKEN | gh auth login --with-token
gh auth status

$remote = git remote get-url origin 2>$null
if (-not $remote) {
    gh repo create $RepoName --$Visibility --source=. --remote=origin --push
} else {
    git push -u origin main
}

$repoUrl = gh repo view --json url -q .url
Write-Host ""
Write-Host "完成! 仓库地址: $repoUrl"
Write-Host "下一步: 打开 https://dashboard.render.com 连接此仓库部署"

Pop-Location
