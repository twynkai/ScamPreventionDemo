let violationCount = 0;
let clusterConfig = {
  blockUnprotectedP2p: true,
  requireExplicitWarning: true,
  telemetryMode: 'STRICT'
};

// Fetch cluster configuration on worker initialization
async function loadClusterConfig() {
  try {
    const response = await fetch('http://localhost:3000/api/config');
    if (response.ok) {
      const configData = await response.json();
      clusterConfig = { ...clusterConfig, ...configData };
      console.log('Cluster configuration loaded successfully:', clusterConfig);
    }
  } catch (error) {
    console.warn('Failed to load cluster config, using fallback defaults:', error);
  }
}

loadClusterConfig();

self.onmessage = (event) => {
  const { type, payload, signature } = event.data;
  if (type === 'DISPATCH_EVENT') {
    processTelemetry(payload, signature);
  }
};

const processTelemetry = (payload, signature) => {
  console.log('Received signature in worker:', signature);
  
  // Only track high-risk anomalies locally
  if (payload.anomalyScore >= 0.8) {
    violationCount++;
    if (violationCount >= 2) {
      self.postMessage({ status: 'TRIGGER_LOCKOUT' });
      return;
    }
  }

  const throttledPayload = throttleSync(payload);

  if (throttledPayload) {
    syncWithServer(throttledPayload, signature);
  }
};

let lastSyncTime = 0;
const throttleSync = (data) => {
  const now = Date.now();
  // Drop rapid duplicate payloads locally if sent within 200ms to protect against flood spamming
  if (now - lastSyncTime > 200) {
    lastSyncTime = now;
    return data;
  }
  return null;
};

const syncWithServer = async (payload, signature) => {
  try {
    console.log('Sending telemetry payload:', payload);
    const response = await fetch('http://localhost:3000/api/telemetry', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Security-Integrity': signature || '' 
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
       console.warn('Telemetry sync rejected, reinforcing local threshold.');
       if ((response.status === 403 || response.status === 429) && payload.anomalyScore >= 0.8) {
        violationCount++;
        if (violationCount >= 2) {
          self.postMessage({ status: 'TRIGGER_LOCKOUT' });
        }
       }
    }
  } catch (error) {
    console.error('Telemetry pipeline interrupted.');
  }
};