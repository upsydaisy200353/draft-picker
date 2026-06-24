import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { login, verifyToken, getStateForUser } from './auth.js';
import {
  loadConfig,
  loadState,
  reloadConfig,
  getPublicState,
  getConfig,
  getAdminRoster,
  saveRoster,
} from './store.js';
import {
  captainConnected,
  captainDisconnected,
} from './presence.js';
import {
  startRound,
  beginDraw,
  selectCard,
  rerollCard,
  acceptDraw,
  rejectDraw,
  resetDraft,
  getSuggestedOrder,
} from './draft.js';
import { getState } from './store.js';

function resolveCaptainIdForDraft(user) {
  if (user.role === 'captain') return user.captainId;
  if (user.role === 'admin') {
    const s = getState();
    if (s.status !== 'drafting') throw new Error('当前不在抽卡阶段');
    const captainId = s.captainOrder[s.currentIndex];
    if (!captainId) throw new Error('没有轮到的队长');
    return captainId;
  }
  throw new Error('无权操作');
}

function assertDraftActor(user) {
  if (user.role !== 'captain' && user.role !== 'admin') {
    throw new Error('无权操作');
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

loadConfig();
loadState();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: '未登录' });
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: '登录已过期' });
  req.user = user;
  next();
}

function broadcastState() {
  const sockets = io.sockets.sockets;
  for (const [, socket] of sockets) {
    if (socket.user) {
      socket.emit('state', getStateForUser(socket.user));
    }
  }
}

app.post('/api/login', (req, res) => {
  try {
    const { username, password } = req.body;
    const result = login(username, password);
    res.json(result);
  } catch (e) {
    res.status(401).json({ error: e.message });
  }
});

app.get('/api/state', authMiddleware, (req, res) => {
  res.json(getStateForUser(req.user));
});

app.get('/api/public/state', (req, res) => {
  res.json(getStateForUser({ role: 'spectator' }));
});

app.get('/api/suggested-order', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: '仅管理员可操作' });
  res.json({ order: getSuggestedOrder() });
});

app.get('/api/admin/roster', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: '仅管理员可操作' });
  res.json(getAdminRoster());
});

app.put('/api/admin/roster', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: '仅管理员可操作' });
  try {
    const roster = saveRoster(req.body);
    broadcastState();
    res.json(roster);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/admin/accounts', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: '仅管理员可操作' });
  const cfg = getConfig();
  res.json({
    admin: { username: cfg.admin.username, password: cfg.admin.password },
    captains: cfg.captains.map((c) => ({
      name: c.name,
      username: c.username,
      password: c.password,
    })),
    players: cfg.players.map((p) => ({
      name: p.name,
      username: p.username,
      password: p.password,
    })),
  });
});

app.post('/api/admin/start-round', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: '仅管理员可操作' });
  try {
    const { captainOrder } = req.body;
    startRound(captainOrder);
    broadcastState();
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/admin/reset', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: '仅管理员可操作' });
  resetDraft();
  broadcastState();
  res.json({ ok: true });
});

app.post('/api/admin/reload-config', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: '仅管理员可操作' });
  reloadConfig();
  broadcastState();
  res.json({ ok: true });
});

app.post('/api/draft/begin', authMiddleware, (req, res) => {
  assertDraftActor(req.user);
  try {
    beginDraw(resolveCaptainIdForDraft(req.user));
    broadcastState();
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/draft/select', authMiddleware, (req, res) => {
  assertDraftActor(req.user);
  try {
    selectCard(resolveCaptainIdForDraft(req.user), req.body.playerId);
    broadcastState();
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/draft/reroll', authMiddleware, (req, res) => {
  assertDraftActor(req.user);
  try {
    rerollCard(resolveCaptainIdForDraft(req.user), req.body.playerId);
    broadcastState();
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/draft/accept', authMiddleware, (req, res) => {
  assertDraftActor(req.user);
  try {
    acceptDraw(resolveCaptainIdForDraft(req.user));
    broadcastState();
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/draft/reject', authMiddleware, (req, res) => {
  assertDraftActor(req.user);
  try {
    rejectDraw(resolveCaptainIdForDraft(req.user));
    broadcastState();
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

io.use((socket, next) => {
  if (socket.handshake.auth?.spectator) {
    socket.user = { role: 'spectator' };
    return next();
  }
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('未登录'));
  const user = verifyToken(token);
  if (!user) return next(new Error('登录已过期'));
  socket.user = user;
  next();
});

io.on('connection', (socket) => {
  if (socket.user.role === 'captain') {
    captainConnected(socket.user.captainId);
    broadcastState();
  }

  socket.emit('state', getStateForUser(socket.user));

  socket.on('request-state', () => {
    socket.emit('state', getStateForUser(socket.user));
  });

  socket.on('disconnect', () => {
    if (socket.user?.role === 'captain') {
      captainDisconnected(socket.user.captainId);
      broadcastState();
    }
  });
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  const indexPath = path.join(clientDist, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) res.status(404).send('请先运行 npm run build 构建前端，或使用 npm run dev 开发模式');
  });
});

httpServer.listen(PORT, HOST, () => {
  console.log(`选人抽卡服务已启动: http://${HOST}:${PORT}`);
});
