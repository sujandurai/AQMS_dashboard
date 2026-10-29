const mqtt = require('mqtt');

// ─────────────────────────────────────────────────────────────────────────────
// AQMS Simulator — publishes to HiveMQ (same broker as ESP32 hardware)
// Topic format: aqms/<nodeId>/data   (matches backend wildcard)
// ─────────────────────────────────────────────────────────────────────────────
const BROKER_URL = process.env.HIVEMQ_URL || 'mqtt://broker.hivemq.com:1883';
const PUBLISH_INTERVAL_MS = 120000; // 2 minutes between telemetry refreshes

const STATIC_NODES  = ['alpha-001', 'beta-002', 'gamma-003', 'delta-004'];
const WORKER_NODES  = ['worker_01_john', 'worker_02_sarah', 'worker_03_mike'];
const ALL_NODES     = [...STATIC_NODES, ...WORKER_NODES];

const client = mqtt.connect(BROKER_URL, {
  clientId: `aqms-simulator-${Math.random().toString(16).slice(2, 8)}`,
  clean: true,
  reconnectPeriod: 5000,
});

client.on('connect', () => {
  console.log(`[Simulator] ✅ Connected to HiveMQ at ${BROKER_URL}`);

  // Publish initial online status for all nodes
  for (const nodeId of ALL_NODES) {
    publishStatus(nodeId, 'online');
  }

  // Begin periodic telemetry simulation
  for (const nodeId of ALL_NODES) {
    simulateNode(nodeId);
  }
});

client.on('error', (err) => {
  console.error('[Simulator] ❌ Connection error:', err.message);
});

client.on('reconnect', () => {
  console.log('[Simulator] Reconnecting to HiveMQ...');
});

function simulateNode(nodeId) {
  // Add random startup jitter so nodes don't all fire simultaneously
  const jitter = Math.random() * 2000;
  setTimeout(() => {
    setInterval(() => {
      publishData(nodeId);
    }, PUBLISH_INTERVAL_MS + jitter);
  }, jitter);
}

function publishStatus(nodeId, status) {
  // New topic format: aqms/<nodeId>/status
  const topic = `aqms/${nodeId}/status`;
  client.publish(topic, status, { retain: true, qos: 1 });
  console.log(`[${nodeId}] 📡 Status → ${status}`);
}

function randomRange(min, max) {
  return min + (Math.random() * (max - min));
}

function generateDemoTelemetry(nodeId) {
  const isWorker = nodeId.startsWith('worker_');
  const pm25 = Number(randomRange(0.3, 0.5).toFixed(2));
  const co = Number(randomRange(0.2, 0.3).toFixed(2));
  const temperature = Number(randomRange(26, 34).toFixed(1));
  const humidity = Number(randomRange(45, 65).toFixed(1));
  const co2 = Number(randomRange(isWorker ? 500 : 450, isWorker ? 700 : 650).toFixed(0));
  const aqi = Number(randomRange(50, 55).toFixed(0));

  return {
    timestamp: new Date().toISOString(),
    aqi,
    pm1_0: Number((pm25 * 0.8).toFixed(2)),
    pm2_5: pm25,
    pm10: Number((pm25 * 1.7).toFixed(2)),
    co,
    co2,
    temperature,
    humidity,
  };
}

function publishData(nodeId) {
  const payload = generateDemoTelemetry(nodeId);

  // New topic format: aqms/<nodeId>/data  ← matches ESP32 and backend wildcard
  const topic = `aqms/${nodeId}/data`;
  client.publish(topic, JSON.stringify(payload), { qos: 1 });
  console.log(`[${nodeId}] 📊 AQI=${payload.aqi}  PM2.5=${payload.pm2_5}  CO=${payload.co}  TEMP=${payload.temperature}C  HUM=${payload.humidity}%`);
}

// EPA-standard AQI from PM2.5
function calculateAQI(pm25) {
  if (pm25 <= 12)    return Math.floor((50  / 12)           * pm25);
  if (pm25 <= 35.4)  return Math.floor((49  / 23.3)         * (pm25 - 12.1)  + 51);
  if (pm25 <= 55.4)  return Math.floor((49  / 19.9)         * (pm25 - 35.5)  + 101);
  if (pm25 <= 150.4) return Math.floor((49  / 94.9)         * (pm25 - 55.5)  + 151);
  if (pm25 <= 250.4) return Math.floor((99  / 99.9)         * (pm25 - 150.5) + 201);
  return               Math.floor((199 / 249.9)             * (pm25 - 250.5) + 301);
}

// Graceful shutdown — mark all nodes offline before exiting
process.on('SIGINT', () => {
  console.log('\n[Simulator] Shutting down — marking all nodes offline...');
  for (const nodeId of ALL_NODES) {
    publishStatus(nodeId, 'offline');
  }
  setTimeout(() => {
    client.end();
    process.exit(0);
  }, 1500);
});
