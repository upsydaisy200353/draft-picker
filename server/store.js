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
  for (const p of config.players) {
    if (p.username && p.password) {
      passwordHashes.set(`player:${p.username}`, bcrypt.hashSync(p.password, 10));
    }
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

export function getAdminRoster() {
  const cfg = getConfig();
  const s = getState();
  return {
    canEdit: s.status !== 'drafting',
    captains: cfg.captains.map((c) => ({
      id: c.id,
      name: c.name,
      username: c.username,
      password: c.password,
      strength: c.strength,
      skill: c.skill ?? '',
      game_id: c.game_id ?? '',
    })),
    players: cfg.players.map((p) => ({
      id: p.id,
      name: p.name,
      username: p.username,
      password: p.password,
      skill: p.skill ?? '',
      game_id: p.game_id ?? '',
    })),
  };
}

function requireName(name, label) {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) throw new Error(`${label}姓名不能为空`);
  return trimmed;
}

export function saveRoster({ captains, players }) {
  const s = getState();
  if (s.status === 'drafting') {
    throw new Error('抽卡进行中无法修改名单，请等待本轮结束或重置抽卡');
  }
  if (!Array.isArray(captains) || captains.length !== 5) {
    throw new Error('队长必须为 5 人');
  }
  if (!Array.isArray(players) || players.length !== 25) {
    throw new Error('选手必须为 25 人');
  }

  const cfg = getConfig();
  const captainIds = new Set();
  const playerIds = new Set();

  const newCaptains = captains.map((c, i) => {
    const existing = cfg.captains.find((x) => x.id === c.id) ?? cfg.captains[i];
    const id = c.id || existing?.id || `c${i + 1}`;
    if (captainIds.has(id)) throw new Error('队长 ID 不能重复');
    captainIds.add(id);
    const strength = Number(c.strength);
    if (!Number.isFinite(strength) || strength < 1) {
      throw new Error(`队长 ${c.name || id} 的实力值无效`);
    }
    return {
      id,
      name: requireName(c.name, '队长'),
      username: existing?.username ?? `captain${i + 1}`,
      password: existing?.password ?? `hd${String(i + 1).padStart(2, '0')}`,
      strength,
      skill: String(c.skill ?? '').trim(),
      game_id: String(c.game_id ?? '').trim(),
    };
  });

  const newPlayers = players.map((p, i) => {
    const existing = cfg.players.find((x) => x.id === p.id) ?? cfg.players[i];
    const id = p.id || existing?.id || `p${i + 1}`;
    if (playerIds.has(id)) throw new Error('选手 ID 不能重复');
    playerIds.add(id);
    return {
      id,
      name: requireName(p.name, '选手'),
      username: existing?.username ?? `player${i + 1}`,
      password: existing?.password ?? `mp${String(i + 1).padStart(2, '0')}`,
      skill: String(p.skill ?? '').trim(),
      game_id: String(p.game_id ?? '').trim(),
    };
  });

  config = {
    ...cfg,
    captains: newCaptains,
    players: newPlayers,
  };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  loadConfig();
  initState();
  return getAdminRoster();
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
    history: [],
    captainRejectCount: {},
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
      if (!state.history) state.history = [];
      if (!state.captainRejectCount) {
        state.captainRejectCount = {};
        if (state.captainRejectUsed) {
          for (const [id, used] of Object.entries(state.captainRejectUsed)) {
            if (used) state.captainRejectCount[id] = 1;
          }
          delete state.captainRejectUsed;
        }
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

export function getPlayerByUsername(username) {
  return getConfig().players.find((p) => p.username === username);
}

export function getPlayerById(id) {
  return getConfig().players.find((p) => p.id === id);
}

export function getPlayerTeamInfo(playerId) {
  const s = getState();
  for (const [cid, pids] of Object.entries(s.teams)) {
    if (pids.includes(playerId)) {
      if (cid === LEFTOVER_TEAM_ID) {
        return { teamId: cid, teamName: LEFTOVER_TEAM_NAME };
      }
      const cap = getCaptainById(cid);
      return { teamId: cid, teamName: cap ? `${cap.name}队` : cid };
    }
  }
  return { teamId: null, teamName: null };
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

export function recordPick(captainId, playerId, extra = {}) {
  const cap = getCaptainById(captainId);
  const player = getPlayerById(playerId);
  const s = getState();
  const isLeftover = captainId === LEFTOVER_TEAM_ID;
  updateState((st) => {
    if (!st.history) st.history = [];
    st.history.push({
      id: `${Date.now()}_${st.history.length}`,
      round: s.round,
      captainId,
      captainName: isLeftover ? LEFTOVER_TEAM_NAME : (cap?.name ?? captainId),
      teamName: isLeftover ? LEFTOVER_TEAM_NAME : (cap ? `${cap.name}队` : captainId),
      playerId,
      playerName: player?.name ?? playerId,
      timestamp: new Date().toISOString(),
      ...extra,
    });
  });
}

export function recordLeftoverPicks(playerIds) {
  for (const pid of playerIds) {
    recordPick(LEFTOVER_TEAM_ID, pid, { auto: true });
  }
}

export function getDraftRules() {
  const cfg = getConfig();
  return {
    r1MaxRerolls: cfg.draft_rules?.r1_max_rerolls ?? 2,
    r2r4MaxRejects: cfg.draft_rules?.r2r4_max_rejects ?? 2,
  };
}

export function getPublicState(forUser = null) {
  const cfg = getConfig();
  const s = getState();
  const currentCaptainId = s.captainOrder[s.currentIndex] ?? null;
  const currentCaptain = currentCaptainId ? getCaptainById(currentCaptainId) : null;

  const { r1MaxRerolls, r2r4MaxRejects } = getDraftRules();
  const captainRejectCount =
    currentCaptainId && s.round >= 2
      ? (s.captainRejectCount?.[currentCaptainId] ?? 0)
      : 0;
  const rejectRemaining = Math.max(0, r2r4MaxRejects - captainRejectCount);

  const turn = s.turn
    ? {
        phase: s.turn.phase,
        drawnCards: s.turn.drawnCards?.map((p) => ({ id: p.id, name: p.name })) ?? [],
        currentDraw: s.turn.currentDraw
          ? { id: s.turn.currentDraw.id, name: s.turn.currentDraw.name }
          : null,
        rerollCount: s.turn.rerollCount ?? 0,
        rerollRemaining: Math.max(0, r1MaxRerolls - (s.turn.rerollCount ?? 0)),
        rejectRemaining: s.round >= 2 ? rejectRemaining : r2r4MaxRejects,
      }
    : null;

  const nextRound =
    s.status === 'idle' ? 1 : s.status === 'round_complete' && s.round < 4 ? s.round + 1 : null;

  const isAdmin = forUser?.role === 'admin';
  const isSpectator = forUser?.role === 'spectator';
  const isCurrentCaptain = forUser?.role === 'captain' && forUser.captainId === currentCaptainId;
  const isAdminDrafting = isAdmin && s.status === 'drafting';
  const canDraft = isCurrentCaptain || isAdminDrafting;
  const onlineCaptainIds = new Set(getOnlineCaptainIds());

  let myProfile = null;
  if (forUser?.role === 'player') {
    const player = getPlayerById(forUser.playerId);
    const team = getPlayerTeamInfo(forUser.playerId);
    myProfile = {
      id: forUser.playerId,
      name: player?.name ?? forUser.username,
      inPool: s.availablePlayerIds.includes(forUser.playerId),
      teamId: team.teamId,
      teamName: team.teamName,
    };
  }

  const myRejectCountR2R4 =
    forUser?.role === 'captain' ? (s.captainRejectCount?.[forUser.captainId] ?? 0) : 0;
  const myRejectRemainingR2R4 = Math.max(0, r2r4MaxRejects - myRejectCountR2R4);

  return {
    round: s.round,
    status: s.status,
    nextRound,
    draftRules: { r1MaxRerolls, r2r4MaxRejects },
    myRejectCountR2R4,
    myRejectRemainingR2R4,
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
    turn: canDraft || isSpectator ? turn : turn ? { phase: turn.phase } : null,
    canAct: canDraft,
    isMyTurn: canDraft,
    adminDrafting: isAdminDrafting,
    isSpectator,
    myProfile,
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
      ...(isSpectator ? {} : { username: c.username }),
      online: onlineCaptainIds.has(c.id),
    })),
    history: (s.history ?? []).map((h) => ({
      id: h.id,
      round: h.round,
      captainName: h.captainName,
      teamName: h.teamName,
      playerName: h.playerName,
      timestamp: h.timestamp,
      rerolled: h.rerolled ?? false,
      rejected: h.rejected ?? false,
      auto: h.auto ?? false,
      drawnOptions: h.drawnOptions ?? null,
      rerollSwaps: h.rerollSwaps ?? (h.rerollSwap ? [h.rerollSwap] : null),
      rejectSwaps: h.rejectSwaps ?? (h.rejectSwap ? [h.rejectSwap] : null),
    })),
  };
}
