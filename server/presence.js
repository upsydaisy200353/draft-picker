const onlineCounts = new Map();

export function captainConnected(captainId) {
  onlineCounts.set(captainId, (onlineCounts.get(captainId) || 0) + 1);
}

export function captainDisconnected(captainId) {
  const next = (onlineCounts.get(captainId) || 0) - 1;
  if (next <= 0) onlineCounts.delete(captainId);
  else onlineCounts.set(captainId, next);
}

export function getOnlineCaptainIds() {
  return [...onlineCounts.keys()];
}
