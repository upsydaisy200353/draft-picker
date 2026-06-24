export default function PlayerView({ state, user }) {
  const profile = state.myProfile;
  const statusText = {
    idle: '等待管理员开始抽卡',
    drafting: '抽卡进行中',
    round_complete: `第 ${state.round} 轮已完成`,
    complete: '全部抽卡已完成',
  };

  let statusDetail = statusText[state.status] || state.status;
  if (state.status === 'drafting' && state.currentCaptain) {
    statusDetail = `第 ${state.round} 轮 · 当前轮到 ${state.currentCaptain.name}`;
  }

  return (
    <div className="panel player-view">
      <h2>我的状态</h2>
      <div className="player-profile-card">
        <div className="player-profile-name">{user.name}</div>
        <div className="player-profile-status">{statusDetail}</div>
        {profile?.inPool && state.status !== 'complete' && (
          <span className="status-pill active" style={{ marginTop: 12 }}>
            我还在选手池中，等待被抽取
          </span>
        )}
        {profile?.teamName && (
          <span className="status-pill highlight" style={{ marginTop: 12 }}>
            已加入：{profile.teamName}
          </span>
        )}
        {state.status === 'complete' && !profile?.teamName && !profile?.inPool && (
          <span className="status-pill" style={{ marginTop: 12 }}>
            未被任何队伍选中
          </span>
        )}
      </div>
      <p className="hint" style={{ marginTop: 16 }}>
        队员账号为观战视角，可实时查看各队阵容与抽卡进度。
      </p>
    </div>
  );
}
