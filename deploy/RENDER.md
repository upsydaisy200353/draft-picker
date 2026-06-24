# Render 一键部署

仓库已配置 `render.yaml`，按以下步骤完成上线。

## 1. 打开部署页

https://render.com/deploy?repo=https://github.com/upsydaisy200353/draft-picker

## 2. 登录 Render

- 推荐点 **GitHub** 登录（账号 `upsydaisy200353`）
- 首次使用需授权 Render 访问你的 GitHub 仓库

## 3. 应用 Blueprint

- 确认服务名：`draft-picker`
- 区域：`Singapore`（离国内较近）
- 计划：`Free`
- 点击 **Apply** / **Create**

## 4. 等待构建（约 3–5 分钟）

构建命令（已写在 render.yaml）：

```
npm install && cd client && npm install && cd .. && npm run build
```

启动命令：

```
node server/index.js
```

## 5. 访问

部署成功后地址类似：

```
https://draft-picker-xxxx.onrender.com
```

## 登录账号

| 角色 | 账号 | 密码 |
|------|------|------|
| 管理员 | admin | admin123 |
| 队长1~5 | captain1~captain5 | hd01~hd05 |

## 注意

- 免费版 **15 分钟无访问会休眠**，首次打开需等待约 30 秒唤醒
- 数据存在服务器本地文件，**重新部署会清空抽卡进度**（名单 `config.json` 不受影响）
