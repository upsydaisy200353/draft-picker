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
} from './store.js';
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

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

app.get('/api/suggested-order', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: '仅管理员可操作' });
  res.json({ order: getSuggestedOrder() });
});

app.post('/api/admin/start-round', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: '仅管理员可操作' });
  try {
    const { round, captainOrder } = req.body;
    startRound(round, captainOrder);
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
  if (req.user.role !== 'captain') return res.status(403).json({ error: '仅队长可操作' });
  try {
    beginDraw(req.user.captainId);
    broadcastState();
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/draft/select', authMiddleware, (req, res) => {
  if (req.user.role !== 'captain') return res.status(403).json({ error: '仅队长可操作' });
  try {
    selectCard(req.user.captainId, req.body.playerId);
    broadcastState();
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/draft/reroll', authMiddleware, (req, res) => {
  if (req.user.role !== 'captain') return res.status(403).json({ error: '仅队长可操作' });
  try {
    rerollCard(req.user.captainId, req.body.playerId);
    broadcastState();
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/draft/accept', authMiddleware, (req, res) => {
  if (req.user.role !== 'captain') return res.status(403).json({ error: '仅队长可操作' });
  try {
    acceptDraw(req.user.captainId);
    broadcastState();
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/draft/reject', authMiddleware, (req, res) => {
  if (req.user.role !== 'captain') return res.status(403).json({ error: '仅队长可操作' });
  try {
    rejectDraw(req.user.captainId);
    broadcastState();
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('未登录'));
  const user = verifyToken(token);
  if (!user) return next(new Error('登录已过期'));
  socket.user = user;
  next();
});

io.on('connection', (socket) => {
  socket.emit('state', getStateForUser(socket.user));

  socket.on('request-state', () => {
    socket.emit('state', getStateForUser(socket.user));
  });
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  const indexPath = path.join(clientDist, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) res.status(404).send('请先运行 npm run build 构建前端，或使用 npm run dev 开发模式');
  });
});

httpServer.listen(PORT, () => {
  console.log(`选人抽卡服务已启动: http://localhost:${PORT}`);
});
