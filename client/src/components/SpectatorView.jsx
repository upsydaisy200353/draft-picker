export default function SpectatorView({ state }) {
  const turn = state.turn;
  const round = state.round;

  if (state.status === 'idle') {
    return (
      <div className="panel">
        <div className="waiting-msg">
          <div className="big">观看模式</div>
          <p>等待管理员开始抽卡</p>
        </div>
      </div>
    );
  }

  if (state.status === 'round_complete') {
    return (
      <div className="panel">
        <div className="waiting-msg">
          <div className="big">第 {round} 轮已完成</div>
          <p>等待下一轮开始</p>
        </div>
      </div>
    );
  }

  if (state.status === 'complete') {
    return (
      <div className="panel">
        <div className="waiting-msg">
          <div className="big">全部抽卡已完成</div>
          <p>剩余选手已编入第六队</p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="draft-area">
        <h2>观看模式</h2>
        <p className="hint">
          当前 <strong>{state.currentCaptain?.name}</strong> 正在抽卡
        </p>
        {turn?.phase === 'selecting' && turn.drawnCards?.length > 0 && (
          <>
            <p className="hint">R1 · 三选一</p>
            <div className="card-row">
              {turn.drawnCards.map((p) => (
                <div key={p.id} className="player-card disabled">{p.name}</div>
              ))}
            </div>
          </>
        )}
        {turn?.phase === 'confirming' && turn.currentDraw && (
          <>
            <p className="hint">R{round} · 待确认</p>
            <div className="card-row">
              <div className="player-card large disabled">{turn.currentDraw.name}</div>
            </div>
          </>
        )}
        {!turn && <p className="hint">等待队长或管理员抽卡…</p>}
        <p style={{ marginTop: 16, fontSize: 13, color: 'var(--muted)' }}>
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
