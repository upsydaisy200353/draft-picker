# 选人抽卡系统

多人在线实时选人抽卡网页，支持队长独立登录、管理员控制每轮顺序。

## 功能

- **R1**：每位队长抽 3 人选 1 人，可重抽 1 张卡
- **R2~R4**：每位队长抽 1 人，可拒绝并重抽 1 次
- **实时同步**：Socket.io 推送，多用户同时操作界面自动更新
- **队长账号**：每位队长独立用户名/密码
- **管理员**：设置每轮队长抽卡顺序、开始/重置轮次

## 快速开始

```bash
# 安装依赖
npm install
cd client && npm install && cd ..

# 开发模式（前后端同时启动）
npm run dev
```

- 前端：http://localhost:5173
- 后端：http://localhost:3001

生产环境先构建前端再启动：

```bash
cd client && npm run build && cd ..
npm start
# 访问 http://localhost:3001
```

## 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
| 队长A | captain_a | pass1 |
| 队长B | captain_b | pass2 |
| 队长C | captain_c | pass3 |
| 队长D | captain_d | pass4 |

## 修改名单

编辑 `data/config.json`：

```json
{
  "admin": { "username": "admin", "password": "你的密码" },
  "captains": [
    {
      "id": "c1",
      "name": "队长名称",
      "username": "登录用户名",
      "password": "登录密码",
      "strength": 1
    }
  ],
  "players": [
    { "id": "p1", "name": "选手名称" }
  ]
}
```

- `strength` 数字越小表示实力越弱（弱→强先抽），管理员面板可一键应用此排序
- 修改后点击管理员面板的「重载名单配置」，或重启服务

## 使用流程

1. 管理员登录，设置本轮轮次（R1~R4）和队长顺序，点击「开始」
2. 各队长用自己的账号登录，轮到自己时进行抽卡操作
3. 所有人界面实时显示当前轮次、阵容、卡池状态
4. 一轮结束后，管理员设置下一轮顺序并继续
