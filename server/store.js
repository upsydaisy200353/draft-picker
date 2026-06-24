import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { getOnlineCaptainIds } from './presence.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, '../data/config.json');
const STATE_PATH = path.join(__dirname, '../data/state.json');

let config = null;
let state = null;
let passwordHashes = new Map();

export function loadConfig() {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  config = JSON.parse(raw);
  passwordHashes.clear();
  passwordHashes.set(`admin:${config.admin.username}`, bcrypt.hashSync(config.admin.password, 10));
  for (const c of config.captains) {
    passwordHashes.set(`captain:${c.username}`, bcrypt.hashSync(c.password, 10));
  }
  return config;
}

export function getConfig() {
  if (!config) loadConfig();
  return config;
}

export function reloadConfig() {
  loadConfig();
  initState();
  return { config, state: getPublicState() };
}

const LEFTOVER_TEAM_ID = 'leftover';
const LEFTOVER_TEAM_NAME = '第六队（余剩）';

export { LEFTOVER_TEAM_ID, LEFTOVER_TEAM_NAME };

function createInitialState() {
  const cfg = getConfig();
  const available = new Set(cfg.players.map((p) => p.id));
  const teams = {};
  for (const c of cfg.captains) {
    teams[c.id] = [];
  }
  teams[LEFTOVER_TEAM_ID] = [];
  return {
    round: 0,
    status: 'idle',
    captainOrder: [],
    currentIndex: 0,
    availablePlayerIds: [...available],
    teams,
    turn: null,
  };
}

export function initState() {
  state = createInitialState();
  saveState();
  return state;
}

export function loadState() {
  if (fs.existsSync(STATE_PATH)) {
    try {
      state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
      if (state.teams && state.teams[LEFTOVER_TEAM_ID] === undefined) {
        state.teams[LEFTOVER_TEAM_ID] = [];
      }
      return state;
    } catch {
      state = createInitialState();
    }
  } else {
    state = createInitialState();
  }
  return state;
}

function saveState() {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
}

export function getState() {
  if (!state) loadState();
  return state;
}

export function updateState(mutator) {
  mutator(state);
  saveState();
  return state;
}

export function verifyPassword(role, username, password) {
  const key = `${role}:${username}`;
  const hash = passwordHashes.get(key);
  if (!hash) return false;
  return bcrypt.compareSync(password, hash);
}

export function getCaptainById(id) {
  return getConfig().captains.find((c) => c.id === id);
}

export function getCaptainByUsername(username) {
  return getConfig().captains.find((c) => c.username === username);
}

export function getPlayerById(id) {
  return getConfig().players.find((p) => p.id === id);
}

export function getAvailablePlayers() {
  const cfg = getConfig();
  return cfg.players.filter((p) => state.availablePlayerIds.includes(p.id));
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function drawRandom(count) {
  const pool = getAvailablePlayers();
  if (pool.length < count) return null;
  return shuffle(pool).slice(0, count);
}

export function assignLeftoverTeam() {
  updateState((s) => {
    if (!s.teams[LEFTOVER_TEAM_ID]) s.teams[LEFTOVER_TEAM_ID] = [];
    for (const pid of s.availablePlayerIds) {
      s.teams[LEFTOVER_TEAM_ID].push(pid);
    }
    s.availablePlayerIds = [];
    s.status = 'complete';
  });
}

export function getPublicState(forUser = null) {
  const cfg = getConfig();
  const s = getState();
  const currentCaptainId = s.captainOrder[s.currentIndex] ?? null;
  const currentCaptain = currentCaptainId ? getCaptainById(currentCaptainId) : null;

  const turn = s.turn
    ? {
        phase: s.turn.phase,
        drawnCards: s.turn.drawnCards?.map((p) => ({ id: p.id, name: p.name })) ?? [],
        currentDraw: s.turn.currentDraw
          ? { id: s.turn.currentDraw.id, name: s.turn.currentDraw.name }
          : null,
        rerollUsed: s.turn.rerollUsed ?? false,
        rejectUsed: s.turn.rejectUsed ?? false,
      }
    : null;

  const isAdmin = forUser?.role === 'admin';
  const isCurrentCaptain = forUser?.role === 'captain' && forUser.captainId === currentCaptainId;
  const onlineCaptainIds = new Set(getOnlineCaptainIds());

  return {
    round: s.round,
    status: s.status,
    captainOrder: s.captainOrder.map((id) => {
      const c = getCaptainById(id);
      return c ? { id: c.id, name: c.name, strength: c.strength } : { id };
    }),
    currentIndex: s.currentIndex,
    currentCaptain: currentCaptain
      ? { id: currentCaptain.id, name: currentCaptain.name, strength: currentCaptain.strength }
      : null,
    availableCount: s.availablePlayerIds.length,
    teams: [
      ...cfg.captains.map((c) => ({
        id: c.id,
        name: c.name,
        strength: c.strength,
        isLeftover: false,
        online: onlineCaptainIds.has(c.id),
        players: (s.teams[c.id] || []).map((pid) => {
          const p = getPlayerById(pid);
          return p ? { id: p.id, name: p.name } : { id: pid, name: '?' };
        }),
      })),
      {
        id: LEFTOVER_TEAM_ID,
        name: LEFTOVER_TEAM_NAME,
        strength: null,
        isLeftover: true,
        players: (s.teams[LEFTOVER_TEAM_ID] || []).map((pid) => {
          const p = getPlayerById(pid);
          return p ? { id: p.id, name: p.name } : { id: pid, name: '?' };
        }),
      },
    ],
    turn: isAdmin || isCurrentCaptain ? turn : turn ? { phase: turn.phase } : null,
    canAct: isAdmin || isCurrentCaptain,
    isMyTurn: isCurrentCaptain && s.status === 'drafting',
    allPlayers: cfg.players.map((p) => ({
      id: p.id,
      name: p.name,
      available: s.availablePlayerIds.includes(p.id),
      draftedBy: (() => {
        for (const [cid, pids] of Object.entries(s.teams)) {
          if (pids.includes(p.id)) {
            if (cid === LEFTOVER_TEAM_ID) return LEFTOVER_TEAM_NAME;
            const cap = getCaptainById(cid);
            return cap?.name ?? cid;
          }
        }
        return null;
      })(),
    })),
    captains: cfg.captains.map((c) => ({
      id: c.id,
      name: c.name,
      strength: c.strength,
      username: c.username,
      online: onlineCaptainIds.has(c.id),
    })),
  };
}
