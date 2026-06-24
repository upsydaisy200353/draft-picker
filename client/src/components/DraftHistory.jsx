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
  if (entry.rerolled) return 'R1 重抽后';
  if (entry.rejected) return '拒绝后收下';
  return '';
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
                return (
                  <li key={entry.id} className="history-item">
                    <span className="history-time">{formatTime(entry.timestamp)}</span>
                    <span className="history-team">{entry.teamName}</span>
                    <span className="history-arrow">→</span>
                    <span className="history-player">{entry.playerName}</span>
                    {note && <span className="history-note">{note}</span>}
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
