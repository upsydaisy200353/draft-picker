function formatTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '';
  }
}

function noteText(entry) {
  if (entry.auto) return '系统自动';
  if (entry.round === 1 && entry.drawnOptions?.length) return '三选一';
  const swaps = entry.rejectSwaps ?? (entry.rejectSwap ? [entry.rejectSwap] : []);
  if (swaps.length > 0) return '拒绝重抽';
  return '';
}

function swapChain(swaps) {
  if (!swaps?.length) return null;
  return swaps.map((s) => `${s.from.name}→${s.to.name}`).join('，');
}

function HistoryDetail({ entry }) {
  if (entry.auto) return null;

  const rerollSwaps = entry.rerollSwaps ?? (entry.rerollSwap ? [entry.rerollSwap] : []);
  const rejectSwaps = entry.rejectSwaps ?? (entry.rejectSwap ? [entry.rejectSwap] : []);

  if (entry.round === 1 && entry.drawnOptions?.length) {
    return (
      <div className="history-detail">
        <span className="history-detail-label">候选：</span>
        {entry.drawnOptions.map((o, i) => (
          <span key={o.id}>
            <span className={o.name === entry.playerName ? 'history-pick' : 'history-option'}>
              {o.name}
            </span>
            {i < entry.drawnOptions.length - 1 ? '、' : ''}
          </span>
        ))}
        {rerollSwaps.length > 0 && (
          <span className="history-swap">
            {' '}· 重抽 {swapChain(rerollSwaps)}
          </span>
        )}
      </div>
    );
  }

  if (rejectSwaps.length > 0) {
    return (
      <div className="history-detail">
        <span className="history-detail-label">过程：</span>
        拒绝重抽 {swapChain(rejectSwaps)}
        {' → '}
        收下 <span className="history-pick">{entry.playerName}</span>
      </div>
    );
  }

  return null;
}

export default function DraftHistory({ history }) {
  const items = history ?? [];
  const byRound = items.reduce((acc, h) => {
    const r = h.round || 0;
    if (!acc[r]) acc[r] = [];
    acc[r].push(h);
    return acc;
  }, {});

  const rounds = Object.keys(byRound)
    .map(Number)
    .sort((a, b) => a - b);

  if (items.length === 0) {
    return (
      <div className="panel draft-history">
        <h2>抽卡战报</h2>
        <p className="hint" style={{ padding: '8px 0' }}>暂无记录，开始抽卡后将在此显示</p>
      </div>
    );
  }

  return (
    <div className="panel draft-history">
      <h2>抽卡战报</h2>
      <p className="history-summary">共 {items.length} 条选人记录</p>
      <div className="history-timeline">
        {rounds.map((round) => (
          <div key={round} className="history-round-group">
            <div className="history-round-label">
              {round === 0 ? '其他' : `第 ${round} 轮`}
            </div>
            <ul className="history-list">
              {byRound[round].map((entry) => {
                const note = noteText(entry);
                const detail = <HistoryDetail entry={entry} />;
                return (
                  <li key={entry.id} className="history-item">
                    <div className="history-item-main">
                      <span className="history-time">{formatTime(entry.timestamp)}</span>
                      <span className="history-team">{entry.teamName}</span>
                      <span className="history-arrow">→</span>
                      <span className="history-player">{entry.playerName}</span>
                      {note && <span className="history-note">{note}</span>}
                    </div>
                    {detail}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
