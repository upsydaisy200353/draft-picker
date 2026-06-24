export default function PlayerPool({ players }) {
  return (
    <div className="panel">
      <h2>选手卡池</h2>
      <table className="pool-table">
        <thead>
          <tr>
            <th>选手</th>
            <th>状态</th>
            <th>归属</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td className={p.available ? 'available' : 'drafted'}>
                {p.available ? '在池中' : '已选走'}
              </td>
              <td className="drafted">{p.draftedBy || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
