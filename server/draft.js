import {
  getState,
  updateState,
  drawRandom,
  getPublicState,
  initState,
  getConfig,
  LEFTOVER_TEAM_ID,
  recordPick,
  recordLeftoverPicks,
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
  let leftoverIds = [];
  updateState((s) => {
    s.turn = null;
    s.currentIndex += 1;
    if (s.currentIndex >= s.captainOrder.length) {
      s.currentIndex = 0;
      if (s.round === 4) {
        if (!s.teams[LEFTOVER_TEAM_ID]) s.teams[LEFTOVER_TEAM_ID] = [];
        leftoverIds = [...s.availablePlayerIds];
        for (const pid of leftoverIds) {
          s.teams[LEFTOVER_TEAM_ID].push(pid);
        }
        s.availablePlayerIds = [];
        s.status = 'complete';
      } else {
        s.status = 'round_complete';
      }
    }
  });
  if (leftoverIds.length) recordLeftoverPicks(leftoverIds);
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

export function startRound(captainOrder) {
  if (!captainOrder?.length) throw new Error('请设置队长顺序');

  const ids = new Set(captainOrder);
  if (ids.size !== captainOrder.length) throw new Error('队长顺序不能有重复');

  const s = getState();
  let round;
  if (s.status === 'idle' && s.round === 0) {
    round = 1;
  } else if (s.status === 'round_complete' && s.round < 4) {
    round = s.round + 1;
  } else if (s.status === 'complete') {
    throw new Error('全部四轮已完成');
  } else {
    throw new Error('当前无法开始新一轮');
  }

  updateState((st) => {
    st.round = round;
    st.captainOrder = [...captainOrder];
    st.currentIndex = 0;
    st.status = 'drafting';
    st.turn = null;
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

  const rerolled = s.turn.rerollUsed ?? false;
  pickPlayer(captainId, playerId);
  recordPick(captainId, playerId, {
    rerolled,
    drawnOptions: s.turn.drawnCards.map((p) => ({ id: p.id, name: p.name })),
    rerollSwap: s.turn.rerollSwap ?? null,
  });
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

  const oldCard = s.turn.drawnCards[idx];
  const exclude = new Set(s.turn.drawnCards.map((p) => p.id));
  const available = drawRandom(getState().availablePlayerIds.length) ?? [];
  const replacement = available.find((p) => !exclude.has(p.id));
  if (!replacement) throw new Error('没有可替换的选手');

  updateState((st) => {
    st.turn.drawnCards[idx] = replacement;
    st.turn.rerollUsed = true;
    st.turn.rerollSwap = {
      from: { id: oldCard.id, name: oldCard.name },
      to: { id: replacement.id, name: replacement.name },
    };
  });

  return getPublicState();
}

export function acceptDraw(captainId) {
  const s = assertCurrentCaptain(captainId);
  if (s.round === 1) throw new Error('第一轮请使用选择卡牌');
  if (!s.turn || s.turn.phase !== 'confirming') throw new Error('请先抽卡');
  if (!s.turn.currentDraw) throw new Error('没有待确认的卡牌');

  const rejected = s.turn.rejectedThisPick ?? false;
  pickPlayer(captainId, s.turn.currentDraw.id);
  recordPick(captainId, s.turn.currentDraw.id, {
    rejected,
    rejectSwap: s.turn.rejectSwap ?? null,
  });
  finishCaptainTurn();
  return getPublicState();
}

export function rejectDraw(captainId) {
  const s = assertCurrentCaptain(captainId);
  if (s.round === 1) throw new Error('第一轮不能拒绝');
  if (!s.turn || s.turn.phase !== 'confirming') throw new Error('请先抽卡');
  if (s.captainRejectUsed?.[captainId]) throw new Error('R2-R4 拒绝机会已用完');

  const exclude = new Set([s.turn.currentDraw.id]);
  const available = drawRandom(getState().availablePlayerIds.length) ?? [];
  const replacement = available.find((p) => !exclude.has(p.id));
  if (!replacement) throw new Error('卡池选手不足');

  updateState((st) => {
    if (!st.captainRejectUsed) st.captainRejectUsed = {};
    st.captainRejectUsed[captainId] = true;
    st.turn.rejectSwap = {
      from: { id: s.turn.currentDraw.id, name: s.turn.currentDraw.name },
      to: { id: replacement.id, name: replacement.name },
    };
    st.turn.currentDraw = replacement;
    st.turn.rejectedThisPick = true;
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
