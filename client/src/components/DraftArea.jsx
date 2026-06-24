import { useState } from 'react';

export default function DraftArea({
  state,
  user,
  onBegin,
  onSelect,
  onReroll,
  onAccept,
  onReject,
}) {
  const [selectedId, setSelectedId] = useState(null);
  const isCaptain = user.role === 'captain';
  const isAdmin = user.role === 'admin';
  const isMyTurn = state.isMyTurn;
  const turn = state.turn;
  const round = state.round;

  const adminBanner = isAdmin && state.adminDrafting && (
    <p className="hint admin-draft-banner">
      管理员代抽 · 当前队长：<strong>{state.currentCaptain?.name}</strong>
    </p>
  );

  if (state.status === 'idle') {
    return (
      <div className="panel">
        <div className="waiting-msg">
          <div className="big">等待管理员开始新一轮抽卡</div>
          <p>管理员将设置本轮队长顺序后开启</p>
        </div>
      </div>
    );
  }

  if (state.status === 'round_complete') {
    return (
      <div className="panel">
        <div className="waiting-msg">
          <div className="big">第 {round} 轮抽卡已完成</div>
          <p>等待管理员开启下一轮</p>
        </div>
      </div>
    );
  }

  if (state.status === 'complete') {
    return (
      <div className="panel">
        <div className="waiting-msg">
          <div className="big">全部四轮抽卡已完成</div>
          <p>卡池剩余选手已自动编入第六队（余剩）</p>
        </div>
      </div>
    );
  }

  if (!isMyTurn && isCaptain) {
    return (
      <div className="panel">
        <div className="waiting-msg">
          <div className="big">请等待其他队长抽卡</div>
          <p>
            当前轮到：<strong>{state.currentCaptain?.name}</strong>
          </p>
          <p style={{ marginTop: 12, fontSize: 13 }}>
            顺序：{state.captainOrder.map((c, i) => (
              <span key={c.id}>
                {i > 0 && ' → '}
                <span style={{ color: i === state.currentIndex ? 'var(--gold)' : undefined }}>
                  {c.name}
                </span>
              </span>
            ))}
          </p>
        </div>
      </div>
    );
  }

  if (!isMyTurn && isAdmin) {
    return (
      <div className="panel">
        <div className="waiting-msg">
          <div className="big">等待抽卡开始</div>
          <p>当前未在抽卡阶段，或暂无轮到的队长</p>
        </div>
      </div>
    );
  }

  if (!turn) {
    return (
      <div className="panel">
        <div className="draft-area">
          <h2>{isAdmin ? '代队长抽卡' : '轮到你了！'}</h2>
          {adminBanner}
          <p className="hint">
            {round === 1
              ? '点击抽卡，将从池中获得 3 位选手，选择 1 位加入队伍（可重抽 1 张）'
              : '点击抽卡，将从池中随机获得 1 位选手（可拒绝并重抽 1 次）'}
          </p>
          <button className="btn-primary" onClick={onBegin} style={{ padding: '14px 32px', fontSize: 16 }}>
            抽卡
          </button>
        </div>
      </div>
    );
  }

  if (round === 1 && turn.phase === 'selecting') {
    return (
      <div className="panel">
        <div className="draft-area">
          <h2>{isAdmin ? '代选选手' : '选择一名选手'}</h2>
          {adminBanner}
          <p className="hint">
            {turn.rerollUsed ? '重抽机会已用完' : '你可以重抽其中一张卡牌（仅一次）'}
          </p>
          <div className="card-row">
            {turn.drawnCards.map((p) => (
              <div
                key={p.id}
                className={`player-card ${selectedId === p.id ? 'selected' : ''}`}
                onClick={() => setSelectedId(p.id)}
              >
                {p.name}
              </div>
            ))}
          </div>
          <div className="action-row">
            <button
              className="btn-primary"
              disabled={!selectedId}
              onClick={() => onSelect(selectedId)}
            >
              确认选择
            </button>
            <button
              className="btn-warning"
              disabled={turn.rerollUsed || !selectedId}
              onClick={() => onReroll(selectedId)}
            >
              重抽此卡
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (round >= 2 && turn.phase === 'confirming') {
    return (
      <div className="panel">
        <div className="draft-area">
          <h2>抽到了</h2>
          {adminBanner}
          <div className="card-row">
            <div className="player-card large">{turn.currentDraw.name}</div>
          </div>
          <p className="hint">
            {turn.rejectUsed ? '拒绝机会已用完，请确认收下' : '你可以拒绝一次并重新抽取'}
          </p>
          <div className="action-row">
            <button className="btn-primary" onClick={onAccept}>
              确认收下
            </button>
            <button className="btn-warning" disabled={turn.rejectUsed} onClick={onReject}>
              拒绝并重抽
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
