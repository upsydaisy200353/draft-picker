import { useState, useEffect } from 'react';

export default function AdminPanel({ state, api, onError }) {
  const [round, setRound] = useState(1);
  const [order, setOrder] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (state.captains?.length && order.length === 0) {
      api('/api/suggested-order')
        .then((data) => setOrder(data.order))
        .catch(() => {
          setOrder(
            [...state.captains]
              .sort((a, b) => a.strength - b.strength)
              .map((c) => c.id),
          );
        });
    }
  }, [state.captains, order.length, api]);

  const getCaptainName = (id) => state.captains.find((c) => c.id === id)?.name ?? id;

  const moveUp = (index) => {
    if (index === 0) return;
    const next = [...order];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    setOrder(next);
  };

  const moveDown = (index) => {
    if (index >= order.length - 1) return;
    const next = [...order];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    setOrder(next);
  };

  const useSuggestedOrder = async () => {
    try {
      const data = await api('/api/suggested-order');
      setOrder(data.order);
    } catch (e) {
      onError(e.message);
    }
  };

  const startRound = async () => {
    setLoading(true);
    onError('');
    try {
      await api('/api/admin/start-round', {
        method: 'POST',
        body: JSON.stringify({ round, captainOrder: order }),
      });
    } catch (e) {
      onError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const resetDraft = async () => {
    if (!confirm('确定要重置整个抽卡？所有已选队员将清空。')) return;
    setLoading(true);
    onError('');
    try {
      await api('/api/admin/reset', { method: 'POST' });
      setOrder([]);
    } catch (e) {
      onError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const reloadConfig = async () => {
    if (!confirm('重新加载 data/config.json？将重置当前抽卡进度。')) return;
    setLoading(true);
    onError('');
    try {
      await api('/api/admin/reload-config', { method: 'POST' });
      setOrder([]);
    } catch (e) {
      onError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel" style={{ marginBottom: 20 }}>
      <h2>管理员控制台</h2>

      <div className="admin-section">
        <h3>选择轮次</h3>
        <div className="round-select">
          {[1, 2, 3, 4].map((r) => (
            <button
              key={r}
              className={`round-btn ${round === r ? 'active' : ''}`}
              onClick={() => setRound(r)}
              disabled={state.status === 'drafting'}
            >
              R{r}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-section">
        <h3>本轮队长抽卡顺序（先抽 = 列表上方）</h3>
        <div className="order-list">
          {order.map((id, i) => (
            <div key={id} className="order-item">
              <span className="num">{i + 1}</span>
              <span style={{ flex: 1 }}>{getCaptainName(id)}</span>
              <div className="order-controls" style={{ marginTop: 0, flex: 'none' }}>
                <button className="btn-secondary" onClick={() => moveUp(i)} disabled={i === 0 || state.status === 'drafting'}>
                  ↑
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => moveDown(i)}
                  disabled={i === order.length - 1 || state.status === 'drafting'}
                >
                  ↓
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="action-row" style={{ justifyContent: 'flex-start', marginTop: 12 }}>
          <button className="btn-secondary" onClick={useSuggestedOrder} disabled={state.status === 'drafting'}>
            按实力弱→强排序
          </button>
        </div>
      </div>

      <div className="action-row" style={{ justifyContent: 'flex-start' }}>
        <button
          className="btn-primary"
          onClick={startRound}
          disabled={loading || state.status === 'drafting' || state.status === 'complete' || order.length === 0}
        >
          {state.status === 'round_complete' ? `开始第 ${round} 轮` : state.status === 'idle' ? `开始第 ${round} 轮` : '抽卡进行中...'}
        </button>
        <button className="btn-danger" onClick={resetDraft} disabled={loading}>
          重置抽卡
        </button>
        <button className="btn-secondary" onClick={reloadConfig} disabled={loading}>
          重载名单配置
        </button>
      </div>

      {state.status === 'round_complete' && (
        <p style={{ marginTop: 12, fontSize: 13, color: 'var(--warning)' }}>
          第 {state.round} 轮已完成，请设置下一轮顺序后点击开始。
        </p>
      )}

      {state.status === 'complete' && (
        <p style={{ marginTop: 12, fontSize: 13, color: 'var(--success)' }}>
          四轮全部完成，剩余选手已自动编入第六队。如需重新抽卡请点击「重置抽卡」。
        </p>
      )}
    </div>
  );
}
