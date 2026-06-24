# 服务器部署说明（方案 C：国内轻量云）

## 你需要准备

1. 腾讯云 / 阿里云 **轻量应用服务器**（2核2G 够用）
2. 系统选 **Ubuntu 22.04**
3. 控制台 **安全组** 放行 **TCP 80**（HTTP）

## 方式一：本机脚本自动上传（推荐）

在 Windows 项目目录 PowerShell 执行（把 IP 和密码换成你的）：

```powershell
cd C:\Users\32828\Projects\draft-picker
.\deploy\upload.ps1 -ServerIP "你的公网IP" -User root -Password "你的密码"
```

## 方式二：手动上传

### 1. 打包（本机）

```powershell
cd C:\Users\32828\Projects\draft-picker
tar -czf draft-picker.tar.gz --exclude=node_modules --exclude=client/node_modules --exclude=.git .
```

### 2. 上传到服务器

用 WinSCP / 腾讯云网页终端，把 `draft-picker.tar.gz` 和 `deploy/install.sh` 传到服务器 `/tmp/`

### 3. 服务器执行

```bash
chmod +x /tmp/install.sh
sudo /tmp/install.sh
```

## 访问

- 浏览器打开：`http://你的公网IP`
- 管理员：`admin` / `admin123`
- 队长：`captain1`~`captain5` / `hd01`~`hd05`

## 常用运维命令

```bash
pm2 status              # 查看进程
pm2 logs draft-picker     # 查看日志
pm2 restart draft-picker  # 重启
```

## 更新名单后

```bash
# 本机重新导入后，上传 data/config.json 到服务器 /opt/draft-picker/data/
# 然后在网页管理员面板点「重载名单配置」
```
