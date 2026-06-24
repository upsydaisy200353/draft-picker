import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import LoginPage from './components/LoginPage';
import AdminPanel from './components/AdminPanel';
import DraftArea from './components/DraftArea';
import TeamBoard from './components/TeamBoard';
import PlayerPool from './components/PlayerPool';

const API = '';

function getStoredAuth() {
  try {
    const raw = localStorage.getItem('draft_auth');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [auth, setAuth] = useState(getStoredAuth);
  const [state, setState] = useState(null);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState(null);

  const api = useCallback(
    async (path, options = {}) => {
      const res = await fetch(`${API}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth?.token}`,
          ...options.headers,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '请求失败');
      return data;
    },
    [auth],
  );

  useEffect(() => {
    if (!auth?.token) return;

    api('/api/state')
      .then(setState)
      .catch((e) => setError(e.message));

    const socketUrl = import.meta.env.DEV ? 'http://localhost:3001' : undefined;
    const s = io(socketUrl, {
      auth: { token: auth.token },
      transports: ['websocket', 'polling'],
    });

    setSocket(s);
    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('state', setState);

    return () => s.disconnect();
  }, [auth, api]);

  const handleLogin = async (username, password) => {
    const res = await fetch(`${API}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '登录失败');
    localStorage.setItem('draft_auth', JSON.stringify(data));
    setAuth(data);
  };

  const handleLogout = () => {
    localStorage.removeItem('draft_auth');
    setAuth(null);
    setState(null);
    socket?.disconnect();
  };

  const draftAction = async (path, body) => {
    setError('');
    try {
      await api(path, { method: 'POST', body: JSON.stringify(body) });
    } catch (e) {
      setError(e.message);
    }
  };

  if (!auth) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const statusText = {
    idle: '等待开始',
    drafting: '抽卡进行中',
    round_complete: `第 ${state?.round} 轮已完成`,
    complete: '全部抽卡完成，第六队已自动组队',
  };

  const roundRules = {
    1: 'R1：抽3选1，可重抽1张',
    2: 'R2：抽1人，可拒绝重抽1次',
    3: 'R3：抽1人，可拒绝重抽1次',
    4: 'R4：抽1人，可拒绝重抽1次',
  };

  return (
    <div className="app">
      <header className="header">
        <h1>选人抽卡</h1>
        <div className="user-badge">
          <span>
            <span className="connected-dot" style={{ background: connected ? 'var(--success)' : 'var(--danger)' }} />
            {connected ? '已连接' : '未连接'}
          </span>
          <span>
            <strong>{auth.user.name}</strong>
            {auth.user.role === 'admin' ? '（管理员）' : '（队长）'}
          </span>
          <button className="btn-secondary" onClick={handleLogout}>
            退出
          </button>
        </div>
      </header>

      {error && <div className="error-msg">{error}</div>}

      {state && (
        <>
          <div className="status-bar">
            <span className={`status-pill ${state.status === 'drafting' ? 'active' : ''}`}>
              状态：{statusText[state.status] || state.status}
            </span>
            {state.round > 0 && (
              <span className="status-pill highlight">
                第 {state.round} 轮 · {roundRules[state.round]}
              </span>
            )}
            {state.currentCaptain && state.status === 'drafting' && (
              <span className="status-pill active">
                当前：{state.currentCaptain.name}
              </span>
            )}
            <span className="status-pill">卡池剩余：{state.availableCount} 人</span>
          </div>

          {auth.user.role === 'admin' && (
            <AdminPanel state={state} api={api} onError={setError} />
          )}

          <div className="grid-2" style={{ marginBottom: 20 }}>
            <DraftArea
              state={state}
              user={auth.user}
              onBegin={() => draftAction('/api/draft/begin')}
              onSelect={(playerId) => draftAction('/api/draft/select', { playerId })}
              onReroll={(playerId) => draftAction('/api/draft/reroll', { playerId })}
              onAccept={() => draftAction('/api/draft/accept')}
              onReject={() => draftAction('/api/draft/reject')}
            />
            <TeamBoard state={state} />
          </div>

          <PlayerPool players={state.allPlayers} />
        </>
      )}

      {!state && !error && <div className="waiting-msg">加载中...</div>}
    </div>
  );
}
