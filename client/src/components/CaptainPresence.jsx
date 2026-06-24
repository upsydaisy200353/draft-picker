export default function CaptainPresence({ captains }) {
  const onlineCount = captains.filter((c) => c.online).length;

  return (
    <div className="captain-presence">
      <div className="captain-presence-header">
        <span>队长在线</span>
        <span className="captain-presence-count">{onlineCount}/{captains.length}</span>
      </div>
      <div className="captain-presence-list">
        {captains.map((c) => (
          <div key={c.id} className={`captain-presence-item ${c.online ? 'online' : 'offline'}`}>
            <span className="presence-dot" />
            <span className="presence-name">{c.name}</span>
            <span className="presence-label">{c.online ? '在线' : '离线'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
