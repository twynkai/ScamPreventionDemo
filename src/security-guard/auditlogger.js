async function computeHash(data) {
  const msgUint8 = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function writeAuditLog(eventType, metadata = {}) {
  const logs = JSON.parse(localStorage.getItem('sec_audit_log') || '[]');
  const prevHash = logs.length > 0 ? logs[logs.length - 1].currentHash : 'GENESIS_HASH';
  
  const timestamp = new Date().toISOString();
  const payloadString = JSON.stringify({ timestamp, eventType, metadata, prevHash });
  const currentHash = await computeHash(payloadString);

  const newEntry = {
    index: logs.length,
    timestamp,
    eventType,
    metadata,
    prevHash,
    currentHash
  };

  logs.push(newEntry);
  localStorage.setItem('sec_audit_log', JSON.stringify(logs));
  return newEntry;
}

export async function verifyAuditLogChain() {
  const logs = JSON.parse(localStorage.getItem('sec_audit_log') || '[]');
  for (let i = 0; i < logs.length; i++) {
    const entry = logs[i];
    const expectedPrev = i === 0 ? 'GENESIS_HASH' : logs[i - 1].currentHash;
    if (entry.prevHash !== expectedPrev) return false;

    const payloadString = JSON.stringify({
      timestamp: entry.timestamp,
      eventType: entry.eventType,
      metadata: entry.metadata,
      prevHash: entry.prevHash
    });
    const recomputedHash = await computeHash(payloadString);
    if (recomputedHash !== entry.currentHash) return false;
  }
  return true;
}