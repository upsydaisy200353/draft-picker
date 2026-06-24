import { useState, useEffect } from 'react';

export default function RosterEditor({ api, onError, onSaved, draftStatus }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(true);
  const [captains, setCaptains] = useState([]);
  const [players, setPlayers] = useState([]);

  const loadRoster = async () => {
    setLoading(true);
    onError('');
    try {
      const data = await api('/api/admin/roster');
      setCanEdit(data.canEdit);
      setCaptains(data.captains);
      setPlayers(data.players);
    } catch (e) {
      onError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && captains.length === 0) {
      loadRoster();
    }
  }, [open]);

  const updateCaptain = (index, field, value) => {
    setCaptains((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };

  const updatePlayer = (index, field, value) => {
    setPlayers((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  const handleSave = async () => {
    if (!canEdit) {
      onError('抽卡进行中无法修改名单');
      return;
    }
    if (
      !confirm(
        '保存名单将写入配置并重置当前抽卡进度（卡池与已选队员清空）。确定继续？',
      )
    ) {
      return;
    }
    setSaving(true);
    onError('');
    try {
      const payload = {
        captains: captains.map(({ id, name, strength, skill, game_id }) => ({
          id,
          name,
          strength: Number(strength),
          skill,
          game_id,
        })),
        players: players.map(({ id, name, skill, game_id }) => ({
          id,
          name,
          skill,
          game_id,
        })),
      };
      const data = await api('/api/admin/roster', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setCaptains(data.captains);
      setPlayers(data.players);
      setCanEdit(data.canEdit);
      onSaved?.();
    } catch (e) {
      onError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-section roster-editor">
      <div className="roster-editor-header">
        <h3>编辑名单</h3>
        <button type="button" className="btn-secondary" onClick={() => setOpen((v) => !v)}>
          {open ? '收起' : '展开编辑'}
        </button>
      </div>
      {!open && (
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>
          修改队长与选手姓名、实力、游戏 ID 等；账号密码保持不变（5 队长 + 25 选手）。
        </p>
      )}
      {open && (
        <>
          {!canEdit && (
            <p className="roster-editor-warn">
              当前抽卡进行中，无法保存名单。请等待本轮结束或先重置抽卡。
            </p>
          )}
          {loading ? (
            <p className="hint">加载名单中...</p>
          ) : (
            <>
              <div className="roster-block">
                <h4>队长（5 人）</h4>
                <div className="roster-table-wrap">
                  <table className="roster-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>姓名</th>
                        <th>实力</th>
                        <th>标签</th>
                        <th>游戏 ID</th>
                        <th>登录账号</th>
                      </tr>
                    </thead>
                    <tbody>
                      {captains.map((c, i) => (
                        <tr key={c.id}>
                          <td>{i + 1}</td>
                          <td>
                            <input
                              value={c.name}
                              onChange={(e) => updateCaptain(i, 'name', e.target.value)}
                              disabled={!canEdit || saving}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min={1}
                              max={99}
                              value={c.strength}
                              onChange={(e) => updateCaptain(i, 'strength', e.target.value)}
                              disabled={!canEdit || saving}
                              className="roster-input-narrow"
                            />
                          </td>
                          <td>
                            <input
                              value={c.skill}
                              onChange={(e) => updateCaptain(i, 'skill', e.target.value)}
                              disabled={!canEdit || saving}
                              placeholder="能C能送"
                            />
                          </td>
                          <td>
                            <input
                              value={c.game_id}
                              onChange={(e) => updateCaptain(i, 'game_id', e.target.value)}
                              disabled={!canEdit || saving}
                            />
                          </td>
                          <td className="roster-readonly">{c.username}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="roster-block">
                <h4>选手卡池（25 人）</h4>
                <div className="roster-table-wrap roster-table-wrap-tall">
                  <table className="roster-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>姓名</th>
                        <th>标签</th>
                        <th>游戏 ID</th>
                        <th>登录账号</th>
                      </tr>
                    </thead>
                    <tbody>
                      {players.map((p, i) => (
                        <tr key={p.id}>
                          <td>{i + 1}</td>
                          <td>
                            <input
                              value={p.name}
                              onChange={(e) => updatePlayer(i, 'name', e.target.value)}
                              disabled={!canEdit || saving}
                            />
                          </td>
                          <td>
                            <input
                              value={p.skill}
                              onChange={(e) => updatePlayer(i, 'skill', e.target.value)}
                              disabled={!canEdit || saving}
                            />
                          </td>
                          <td>
                            <input
                              value={p.game_id}
                              onChange={(e) => updatePlayer(i, 'game_id', e.target.value)}
                              disabled={!canEdit || saving}
                            />
                          </td>
                          <td className="roster-readonly">{p.username}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="action-row" style={{ justifyContent: 'flex-start', marginTop: 12 }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSave}
                  disabled={!canEdit || saving || captains.length === 0}
                >
                  {saving ? '保存中...' : '保存名单'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={loadRoster}
                  disabled={loading || saving}
                >
                  重新加载
                </button>
              </div>
              {draftStatus !== 'idle' && canEdit && (
                <p style={{ fontSize: 12, color: 'var(--warning)', marginTop: 8 }}>
                  保存后将重置当前抽卡进度。
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
