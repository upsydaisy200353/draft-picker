#!/bin/bash
# 腾讯云/阿里云轻量服务器一键部署（Ubuntu 22.04 / Debian）
set -euo pipefail

APP_DIR="/opt/draft-picker"
APP_USER="${SUDO_USER:-root}"

echo "==> 安装 Node.js 20..."
if ! command -v node >/dev/null || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "==> Node $(node -v), npm $(npm -v)"

echo "==> 安装 PM2 和 Nginx..."
npm install -g pm2
apt-get update
apt-get install -y nginx

echo "==> 部署应用目录: $APP_DIR"
mkdir -p "$APP_DIR"
if [ -f "/tmp/draft-picker.tar.gz" ]; then
  tar -xzf /tmp/draft-picker.tar.gz -C "$APP_DIR" --strip-components=1
elif [ ! -f "$APP_DIR/package.json" ]; then
  echo "错误: 请先将 draft-picker.tar.gz 上传到 /tmp/ 或把代码放到 $APP_DIR"
  exit 1
fi

cd "$APP_DIR"

echo "==> 安装依赖并构建..."
npm install --omit=dev
cd client && npm install && cd ..
npm run build

echo "==> 配置 Nginx..."
cp deploy/nginx.conf /etc/nginx/sites-available/draft-picker
ln -sf /etc/nginx/sites-available/draft-picker /etc/nginx/sites-enabled/draft-picker
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl restart nginx

echo "==> 启动 PM2..."
pm2 delete draft-picker 2>/dev/null || true
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

echo ""
echo "=========================================="
echo "  部署完成！"
echo "  访问: http://$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}'):80"
echo "  管理员: admin / admin123"
echo "=========================================="
echo ""
echo "请在云控制台安全组放行: TCP 80 (和 443 如需 HTTPS)"
