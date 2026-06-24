import CaptainPresence from './CaptainPresence';

export default function TeamBoard({ state }) {
  const currentId = state.currentCaptain?.id;
  const isComplete = state.status === 'complete';

  return (
    <div className="panel">
      <h2>各队阵容</h2>
      {state.captains?.length > 0 && <CaptainPresence captains={state.captains} />}
      <div className="team-list">
        {state.teams.map((team) => (
          <div
            key={team.id}
            className={[
              'team-card',
              team.isLeftover ? 'leftover' : '',
              team.id === currentId && state.status === 'drafting' ? 'current' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <h3>
              {team.name}
              {!team.isLeftover && (
                <span className={`online-badge ${team.online ? 'on' : 'off'}`}>
                  <span className="presence-dot" />
                  {team.online ? '在线' : '离线'}
                </span>
              )}
              {team.strength != null && (
                <span className="strength">实力 {team.strength}</span>
              )}
              {team.isLeftover && !isComplete && (
                <span className="strength leftover-badge">自动组队</span>
              )}
              {team.id === currentId && state.status === 'drafting' && (
                <span className="strength" style={{ background: 'var(--gold)', color: '#1a1a1a' }}>
                  正在抽卡
                </span>
              )}
            </h3>
            {team.players.length === 0 ? (
              <ul>
                <li style={{ color: 'var(--muted)' }}>
                  {team.isLeftover
                    ? isComplete
                      ? '无剩余选手'
                      : `四轮抽完后，卡池剩余 ${state.availableCount} 人将自动入队`
                    : '暂无队员'}
                </li>
              </ul>
            ) : (
              <ul>
                {team.players.map((p) => (
                  <li key={p.id}>{p.name}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
