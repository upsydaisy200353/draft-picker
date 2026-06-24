import { useState } from 'react';

export default function LoginPage({ onLogin, onSpectator }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onLogin(username, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>选人抽卡</h1>
        <p className="subtitle">管理员 / 队长 / 队员登录</p>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>用户名</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="账号（admin / captain1 / player1）"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密码"
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
        <div className="login-divider">或</div>
        <button type="button" className="btn-secondary login-spectator-btn" onClick={onSpectator}>
          观看模式（无需登录）
        </button>
        <p className="login-spectator-hint">实时查看抽卡进度与各队阵容，无法操作</p>
      </div>
    </div>
  );
}
