@echo off
chcp 65001 >nul
echo ========================================
echo  选人抽卡 - 内网穿透快速分享
echo ========================================
echo.
echo [1/2] 启动服务...
cd /d "%~dp0"
start "draft-picker" cmd /k "npm start"
timeout /t 5 /nobreak >nul
echo.
echo [2/2] 启动 Cloudflare 隧道（需已安装 cloudflared）...
echo 安装: winget install Cloudflare.cloudflared
echo.
cloudflared tunnel --url http://localhost:3001
pause
