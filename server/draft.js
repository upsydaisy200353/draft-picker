import {
  getState,
  updateState,
  drawRandom,
  getPublicState,
  initState,
  getConfig,
  LEFTOVER_TEAM_ID,
} from './store.js';

function assertDrafting() {
  const s = getState();
  if (s.status !== 'drafting') throw new Error('当前不在抽卡阶段');
  return s;
}

function getCurrentCaptainId(s = getState()) {
  return s.captainOrder[s.currentIndex];
}

function assertCurrentCaptain(captainId) {
  const s = assertDrafting();
  const current = getCurrentCaptainId(s);
  if (current !== captainId) throw new Error('还没轮到你抽卡');
  return s;
}

function finishCaptainTurn() {
  updateState((s) => {
    s.turn = null;
    s.currentIndex += 1;
    if (s.currentIndex >= s.captainOrder.length) {
      s.currentIndex = 0;
      if (s.round === 4) {
        if (!s.teams[LEFTOVER_TEAM_ID]) s.teams[LEFTOVER_TEAM_ID] = [];
        for (const pid of s.availablePlayerIds) {
          s.teams[LEFTOVER_TEAM_ID].push(pid);
        }
        s.availablePlayerIds = [];
        s.status = 'complete';
      } else {
        s.status = 'round_complete';
      }
    }
  });
}

function pickPlayer(captainId, playerId) {
  updateState((s) => {
    if (!s.availablePlayerIds.includes(playerId)) {
      throw new Error('该选手不在卡池中');
    }
    s.availablePlayerIds = s.availablePlayerIds.filter((id) => id !== playerId);
    s.teams[captainId].push(playerId);
  });
}

export function startRound(round, captainOrder) {
  if (![1, 2, 3, 4].includes(round)) throw new Error('轮次必须是 1-4');
  if (!captainOrder?.length) throw new Error('请设置队长顺序');

  const ids = new Set(captainOrder);
  if (ids.size !== captainOrder.length) throw new Error('队长顺序不能有重复');

  updateState((s) => {
    s.round = round;
    s.captainOrder = [...captainOrder];
    s.currentIndex = 0;
    s.status = 'drafting';
    s.turn = null;
  });

  return getPublicState();
}

export function beginDraw(captainId) {
  const s = assertCurrentCaptain(captainId);

  if (s.turn) throw new Error('请先完成当前抽卡操作');

  if (s.round === 1) {
    const cards = drawRandom(3);
    if (!cards) throw new Error('卡池选手不足');
    updateState((st) => {
      st.turn = {
        phase: 'selecting',
        drawnCards: cards,
        rerollUsed: false,
      };
    });
  } else {
    const card = drawRandom(1);
    if (!card) throw new Error('卡池选手不足');
    updateState((st) => {
      st.turn = {
        phase: 'confirming',
        currentDraw: card[0],
        rejectUsed: false,
      };
    });
  }

  return getPublicState();
}

export function selectCard(captainId, playerId) {
  const s = assertCurrentCaptain(captainId);
  if (s.round !== 1) throw new Error('仅第一轮可以选择卡牌');
  if (!s.turn || s.turn.phase !== 'selecting') throw new Error('请先抽卡');

  const valid = s.turn.drawnCards.some((p) => p.id === playerId);
  if (!valid) throw new Error('只能选择本次抽到的卡牌');

  pickPlayer(captainId, playerId);
  finishCaptainTurn();
  return getPublicState();
}

export function rerollCard(captainId, playerId) {
  const s = assertCurrentCaptain(captainId);
  if (s.round !== 1) throw new Error('仅第一轮可以重抽');
  if (!s.turn || s.turn.phase !== 'selecting') throw new Error('请先抽卡');
  if (s.turn.rerollUsed) throw new Error('本轮重抽机会已用完');

  const idx = s.turn.drawnCards.findIndex((p) => p.id === playerId);
  if (idx === -1) throw new Error('只能重抽本次抽到的卡牌');

  const exclude = new Set(s.turn.drawnCards.map((p) => p.id));
  const available = drawRandom(getState().availablePlayerIds.length) ?? [];
  const replacement = available.find((p) => !exclude.has(p.id));
  if (!replacement) throw new Error('没有可替换的选手');

  updateState((st) => {
    st.turn.drawnCards[idx] = replacement;
    st.turn.rerollUsed = true;
  });

  return getPublicState();
}

export function acceptDraw(captainId) {
  const s = assertCurrentCaptain(captainId);
  if (s.round === 1) throw new Error('第一轮请使用选择卡牌');
  if (!s.turn || s.turn.phase !== 'confirming') throw new Error('请先抽卡');
  if (!s.turn.currentDraw) throw new Error('没有待确认的卡牌');

  pickPlayer(captainId, s.turn.currentDraw.id);
  finishCaptainTurn();
  return getPublicState();
}

export function rejectDraw(captainId) {
  const s = assertCurrentCaptain(captainId);
  if (s.round === 1) throw new Error('第一轮不能拒绝');
  if (!s.turn || s.turn.phase !== 'confirming') throw new Error('请先抽卡');
  if (s.turn.rejectUsed) throw new Error('本轮拒绝机会已用完');

  const exclude = new Set([s.turn.currentDraw.id]);
  const available = drawRandom(getState().availablePlayerIds.length) ?? [];
  const replacement = available.find((p) => !exclude.has(p.id));
  if (!replacement) throw new Error('卡池选手不足');

  updateState((st) => {
    st.turn.currentDraw = replacement;
    st.turn.rejectUsed = true;
  });

  return getPublicState();
}

export function resetDraft() {
  initState();
  return getPublicState();
}

export function getSuggestedOrder() {
  return getConfig()
    .captains.slice()
    .sort((a, b) => a.strength - b.strength)
    .map((c) => c.id);
}
