import jwt from 'jsonwebtoken';
import {
  getConfig,
  verifyPassword,
  getCaptainByUsername,
  getPlayerByUsername,
  getPlayerById,
  getPublicState,
} from './store.js';

const JWT_SECRET = process.env.JWT_SECRET || 'draft-picker-secret-change-in-production';

export function login(username, password) {
  const config = getConfig();

  if (username === config.admin.username && verifyPassword('admin', username, password)) {
    const token = jwt.sign({ role: 'admin', username }, JWT_SECRET, { expiresIn: '24h' });
    return {
      token,
      user: { role: 'admin', username, name: '管理员' },
    };
  }

  const captain = getCaptainByUsername(username);
  if (captain && verifyPassword('captain', username, password)) {
    const token = jwt.sign(
      { role: 'captain', username, captainId: captain.id },
      JWT_SECRET,
      { expiresIn: '24h' },
    );
    return {
      token,
      user: {
        role: 'captain',
        username,
        captainId: captain.id,
        name: captain.name,
      },
    };
  }

  const player = getPlayerByUsername(username);
  if (player && verifyPassword('player', username, password)) {
    const token = jwt.sign(
      { role: 'player', username, playerId: player.id },
      JWT_SECRET,
      { expiresIn: '24h' },
    );
    return {
      token,
      user: {
        role: 'player',
        username,
        playerId: player.id,
        name: player.name,
      },
    };
  }

  throw new Error('用户名或密码错误');
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function getStateForUser(user) {
  return getPublicState(user);
}
