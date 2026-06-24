import { useState, useEffect } from 'react';

export default function AdminPanel({ state, api, onError }) {
  const [order, setOrder] = useState([]);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState(null);

  const nextRound = state.nextRound;
  const canEditOrder = state.status !== 'drafting' && !!nextRound;
  const orderRoundLabel = nextRound ?? state.round ?? 1;

  useEffect(() => {
    if (!state.captains?.length || order.length > 0) return;

    if (state.captainOrder?.length > 0) {
      setOrder(state.captainOrder.map((c) => c.id));
      return;
    }

    api('/api/suggested-order')
      .then((data) => setOrder(data.order))
      .catch(() => {
        setOrder(
          [...state.captains]
            .sort((a, b) => a.strength - b.strength)
            .map((c) => c.id),
        );
      });
  }, [state.captains, state.captainOrder, order.length, api]);

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
        body: JSON.stringify({ captainOrder: order }),
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
        <h3>轮次进度</h3>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 8 }}>
          固定顺序：R1 → R2 → R3 → R4，不可跳轮
        </p>
        <div className="round-select">
          {[1, 2, 3, 4].map((r) => (
            <span
              key={r}
              className={`round-btn ${state.round === r && state.status === 'drafting' ? 'active' : ''} ${state.round > r || state.status === 'complete' ? 'done' : ''}`}
              style={{ cursor: 'default', pointerEvents: 'none' }}
            >
              R{r}
              {state.round > r || (state.status === 'complete' && r <= 4) ? ' ✓' : ''}
            </span>
          ))}
        </div>
      </div>

      <div className="admin-section">
        <h3>第 {orderRoundLabel} 轮队长抽卡顺序（先抽 = 列表上方）</h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>
          {canEditOrder
            ? '每轮开始前可单独调整顺序，与上一轮互不影响；调整完毕后点击「开始第 N 轮」。'
            : '抽卡进行中，顺序已锁定；本轮结束后可重新设置下一轮顺序。'}
        </p>
        <div className="order-list">
          {order.map((id, i) => (
            <div key={id} className="order-item">
              <span className="num">{i + 1}</span>
              <span style={{ flex: 1 }}>{getCaptainName(id)}</span>
              <div className="order-controls" style={{ marginTop: 0, flex: 'none' }}>
                <button className="btn-secondary" onClick={() => moveUp(i)} disabled={!canEditOrder || i === 0}>
                  ↑
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => moveDown(i)}
                  disabled={!canEditOrder || i === order.length - 1}
                >
                  ↓
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="action-row" style={{ justifyContent: 'flex-start', marginTop: 12 }}>
          <button className="btn-secondary" onClick={useSuggestedOrder} disabled={!canEditOrder}>
            按实力弱→强排序
          </button>
        </div>
      </div>

      <div className="action-row" style={{ justifyContent: 'flex-start' }}>
        <button
          className="btn-primary"
          onClick={startRound}
          disabled={loading || !nextRound || state.status === 'drafting' || order.length === 0}
        >
          {state.status === 'drafting'
            ? `第 ${state.round} 轮抽卡进行中...`
            : nextRound
              ? `开始第 ${nextRound} 轮`
              : '全部完成'}
        </button>
        <button className="btn-danger" onClick={resetDraft} disabled={loading}>
          重置抽卡
        </button>
        <button className="btn-secondary" onClick={reloadConfig} disabled={loading}>
          重载名单配置
        </button>
      </div>

      {state.status === 'round_complete' && nextRound && (
        <p style={{ marginTop: 12, fontSize: 13, color: 'var(--warning)' }}>
          第 {state.round} 轮已完成，请设置第 {nextRound} 轮顺序后点击开始。
        </p>
      )}

      {state.status === 'complete' && (
        <p style={{ marginTop: 12, fontSize: 13, color: 'var(--success)' }}>
          四轮全部完成，剩余选手已自动编入第六队。如需重新抽卡请点击「重置抽卡」。
        </p>
      )}

      <div className="admin-section" style={{ marginTop: 20 }}>
        <h3>账号列表</h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>
          抽卡进行中时，管理员可在左侧代当前队长操作。队员账号仅供观战。
        </p>
        <button
          className="btn-secondary"
          onClick={() => api('/api/admin/accounts').then(setAccounts).catch((e) => onError(e.message))}
        >
          查看全部账号密码
        </button>
        {accounts && (
          <div style={{ marginTop: 12, fontSize: 13, maxHeight: 240, overflow: 'auto' }}>
            <p><strong>管理员</strong> {accounts.admin.username} / {accounts.admin.password}</p>
            <p style={{ marginTop: 8 }}><strong>队长</strong></p>
            <ul>
              {accounts.captains.map((c) => (
                <li key={c.username}>{c.name} — {c.username} / {c.password}</li>
              ))}
            </ul>
            <p style={{ marginTop: 8 }}><strong>队员</strong></p>
            <ul>
              {accounts.players.map((p) => (
                <li key={p.username}>{p.name} — {p.username} / {p.password}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
