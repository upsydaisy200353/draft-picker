param(
    [Parameter(Mandatory = $true)]
    [string]$ServerIP,
    [string]$User = "root",
    [string]$Password = "",
    [int]$Port = 22
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$Archive = Join-Path $env:TEMP "draft-picker.tar.gz"

Write-Host "==> 打包项目..."
Push-Location $ProjectRoot
if (Get-Command tar -ErrorAction SilentlyContinue) {
    tar -czf $Archive --exclude=node_modules --exclude=client/node_modules --exclude=.git --exclude=client/dist .
} else {
    Write-Error "需要 Windows 10+ 自带的 tar 命令"
}
Pop-Location

$InstallScript = Join-Path $ProjectRoot "deploy\install.sh"

if ($Password) {
    if (-not (Get-Command pscp -ErrorAction SilentlyContinue)) {
        Write-Host ""
        Write-Host "未检测到 pscp。请手动操作："
        Write-Host "  1. 用 WinSCP 上传: $Archive -> /tmp/draft-picker.tar.gz"
        Write-Host "  2. 上传: $InstallScript -> /tmp/install.sh"
        Write-Host "  3. SSH 登录服务器执行: chmod +x /tmp/install.sh && sudo /tmp/install.sh"
        exit 0
    }
    Write-Host "==> 上传到 $User@${ServerIP}..."
    echo y | pscp -P $Port $Archive "${User}@${ServerIP}:/tmp/draft-picker.tar.gz"
    pscp -P $Port $InstallScript "${User}@${ServerIP}:/tmp/install.sh"
    plink -P $Port "${User}@${ServerIP}" "chmod +x /tmp/install.sh && sudo /tmp/install.sh"
} else {
    Write-Host ""
    Write-Host "==> 打包完成: $Archive"
    Write-Host ""
    Write-Host "请用 SSH 上传并安装："
    Write-Host "  scp $Archive ${User}@${ServerIP}:/tmp/draft-picker.tar.gz"
    Write-Host "  scp $InstallScript ${User}@${ServerIP}:/tmp/install.sh"
    Write-Host "  ssh ${User}@${ServerIP} 'chmod +x /tmp/install.sh && sudo /tmp/install.sh'"
}
