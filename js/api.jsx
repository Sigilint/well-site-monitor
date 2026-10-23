// Simulated backend + API.
//
// Everything below `--- API ---` is the surface the UI uses: async functions
// returning JSON-shaped objects after a simulated network delay, the same way
// a fetch() to a real Sigil Watch service would. Swap the bodies for fetch()
// calls and the UI doesn't change.
//
// The "server" keeps a simulation clock, generates samples per sensor at each
// sensor's reporting period, evaluates thresholds, and runs an alert engine
// (active → acknowledged → returned-to-normal, loosely after ISA-18.2).

(() => {

const { CATEGORIES, SENSOR_TYPES, ZONES } = window.Catalog;
const { SITE, SENSORS, SCENARIOS } = window.SiteDef;

const SENSOR_BY_ID = Object.fromEntries(SENSORS.map(s => [s.id, s]));
const LOOP = SITE.loopSeconds;
const LINK_LATENCY = { wired: [30, 90], lora: [400, 1100], cellular: [180, 520] };
const ALLOWS_NEGATIVE = new Set(["CP", "WDIR"]);

// Catch typos in scenario sensor ids early
SCENARIOS.forEach(sc => sc.effects.forEach(e => {
  if (!SENSOR_BY_ID[e.sensor]) console.warn(`[sim] scenario ${sc.id}: unknown sensor ${e.sensor}`);
}));

// ---------- value generation ----------

function hash(a, b) {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function noise(i, t) {
  return 0.55 * Math.sin(t * 0.21 + i * 1.7)
       + 0.3  * Math.sin(t * 0.73 + i * 4.1)
       + 0.4  * (hash(i, Math.floor(t)) - 0.5);
}

const smooth = x => x * x * (3 - 2 * x);

function envelope(effect, window, t) {
  const [s, e] = effect.at || window;
  if (t < s || t > e) return 0;
  if (effect.kind === "ramp") return (t - s) / (e - s);
  const rise = effect.rise || 20;
  if (t < s + rise) return smooth((t - s) / rise);
  if (t > e - rise) return smooth((e - t) / rise);
  return 1;
}

// Pre-index effects by sensor
const EFFECTS = {};
SCENARIOS.forEach(sc => sc.effects.forEach(e => {
  (EFFECTS[e.sensor] = EFFECTS[e.sensor] || []).push({ ...e, window: sc.window, scenario: sc.id });
}));

function valueAt(sensor, loopT) {
  const type = SENSOR_TYPES[sensor.type];
  const sim = type.sim;
  let v = (sensor.base ?? sim.base) + noise(sensor.index, loopT) * sim.noise;
  let offline = false;
  for (const e of EFFECTS[sensor.id] || []) {
    const k = envelope(e, e.window, loopT);
    if (e.kind === "offline") { if (k > 0) offline = true; }
    else v += e.delta * k;
  }
  if (offline) return null;
  if (sensor.type === "WDIR") v = ((v % 360) + 360) % 360;
  if (type.binary) v = v >= 0.5 ? 1 : 0;
  if (!ALLOWS_NEGATIVE.has(sensor.type)) v = Math.max(0, v);
  const f = Math.pow(10, sim.dp);
  return Math.round(v * f) / f;
}

function evaluate(typeKey, value) {
  if (value == null) return { status: "offline" };
  const limits = SENSOR_TYPES[typeKey].limits;
  if (!limits) return { status: "normal" };
  if (limits.hi) {
    const [w, a] = limits.hi;
    if (value >= a) return { status: "alarm", dir: "hi", limit: a };
    if (value >= w) return { status: "warning", dir: "hi", limit: w };
  }
  if (limits.lo) {
    const [w, a] = limits.lo;
    if (value <= a) return { status: "alarm", dir: "lo", limit: a };
    if (value <= w) return { status: "warning", dir: "lo", limit: w };
  }
  return { status: "normal" };
}

// ---------- server state ----------

const server = {
  startWall: Date.now(),
  simT: 0,             // monotonic simulated seconds since start
  offset: 0,           // scenario-loop offset (changed by seek)
  speed: 1,
  lastWall: performance.now(),
  seq: 0,
  nextDue: SENSORS.map(s => (s.index % 5) * 0.2),
  feed: [],            // ring buffer of all samples
  history: {},         // sensorId -> recent samples
  latest: {},          // sensorId -> latest sample
  alerts: new Map(),   // sensorId -> alert
  alertSeq: 0,
  calls: 0,
};

const FEED_MAX = 4000;
const HISTORY_MAX = 300;
const loopTime = simT => ((simT + server.offset) % LOOP + LOOP) % LOOP;

function makeSample(sensor, simT) {
  const type = SENSOR_TYPES[sensor.type];
  const loopT = loopTime(simT);
  const value = valueAt(sensor, loopT);
  const ev = evaluate(sensor.type, value);
  const [lo, hi] = LINK_LATENCY[sensor.link];
  return {
    seq: ++server.seq,
    ts: new Date(server.startWall + simT * 1000).toISOString(),
    simT: Math.round(simT * 1000) / 1000,
    sensorId: sensor.id,
    type: sensor.type,
    category: type.category,
    zone: sensor.zone,
    value,
    unit: type.unit,
    status: ev.status,
    quality: value == null ? "NO_DATA" : "GOOD",
    node: sensor.node,
    link: sensor.link,
    latencyMs: Math.round(lo + hash(sensor.index, simT) * (hi - lo)),
  };
}

function updateAlert(sample) {
  const existing = server.alerts.get(sample.sensorId);
  const active = sample.status !== "normal";
  if (active) {
    const priority = sample.status === "offline" ? "fault" : sample.status;
    const ev = evaluate(sample.type, sample.value);
    if (!existing) {
      server.alerts.set(sample.sensorId, {
        id: `ALM-${String(++server.alertSeq).padStart(5, "0")}`,
        sensorId: sample.sensorId, type: sample.type, category: sample.category, zone: sample.zone,
        priority, state: "active", acked: false,
        raisedAt: sample.ts, updatedAt: sample.ts, clearedAt: null,
        value: sample.value, peak: sample.value, unit: sample.unit,
        dir: ev.dir || null, limit: ev.limit ?? null,
      });
    } else {
      const rank = { fault: 0, warning: 1, alarm: 2 };
      // Escalation re-requires acknowledgement
      if (rank[priority] > rank[existing.priority]) { existing.priority = priority; existing.acked = false; }
      if (existing.state === "rtn") { existing.state = "active"; existing.acked = false; existing.clearedAt = null; }
      existing.value = sample.value;
      if (sample.value != null && ev.dir === "hi") existing.peak = Math.max(existing.peak ?? -Infinity, sample.value);
      if (sample.value != null && ev.dir === "lo") existing.peak = Math.min(existing.peak ?? Infinity, sample.value);
      existing.dir = ev.dir || existing.dir;
      existing.limit = ev.limit ?? existing.limit;
      existing.updatedAt = sample.ts;
    }
  } else if (existing && existing.state === "active") {
    existing.state = "rtn";
    existing.value = sample.value;
    existing.clearedAt = sample.ts;
    if (existing.acked) server.alerts.delete(sample.sensorId);
  }
}

function advance() {
  const now = performance.now();
  server.simT += ((now - server.lastWall) / 1000) * server.speed;
  server.lastWall = now;
  const fresh = [];
  SENSORS.forEach(sensor => {
    const period = SENSOR_TYPES[sensor.type].sim.period;
    // Don't backfill more than a minute (e.g. after a backgrounded tab)
    if (server.simT - server.nextDue[sensor.index] > 60) server.nextDue[sensor.index] = server.simT - 60;
    while (server.nextDue[sensor.index] <= server.simT) {
      fresh.push([sensor, server.nextDue[sensor.index]]);
      server.nextDue[sensor.index] += period;
    }
  });
  // Emit in time order, as a gateway would
  fresh.sort((a, b) => a[1] - b[1]).forEach(([sensor, t]) => {
    const sample = makeSample(sensor, t);
    server.feed.push(sample);
    const h = (server.history[sensor.id] = server.history[sensor.id] || []);
    h.push(sample);
    if (h.length > HISTORY_MAX) h.shift();
    server.latest[sensor.id] = sample;
    updateAlert(sample);
  });
  if (server.feed.length > FEED_MAX) server.feed.splice(0, server.feed.length - FEED_MAX);
}

// Warm up a minute of history (loop t=0..60) so the first screen has trends
// to draw; "now" lands at loop t=60s, as the first scenario starts.
(() => {
  server.lastWall = performance.now() - 60000;
  server.simT = -60;
  server.nextDue = server.nextDue.map(d => d - 60);
  server.offset = 60;
  advance();
})();

function respond(payload, min = 40, max = 180) {
  server.calls++;
  const ms = min + Math.random() * (max - min);
  return new Promise(resolve =>
    setTimeout(() => resolve(JSON.parse(JSON.stringify(payload))), ms)
  );
}

function matches(sample, f = {}) {
  if (f.sensorIds && !f.sensorIds.includes(sample.sensorId)) return false;
  if (f.categories && !f.categories.includes(sample.category)) return false;
  if (f.zones && !f.zones.includes(sample.zone)) return false;
  return true;
}

function clockPayload() {
  const loopT = loopTime(server.simT);
  return {
    simT: server.simT,
    loopT,
    loopSeconds: LOOP,
    speed: server.speed,
    now: new Date(server.startWall + server.simT * 1000).toISOString(),
    activeScenarios: SCENARIOS.filter(s => loopT >= s.window[0] && loopT <= s.window[1]).map(s => s.id),
  };
}

// ---------- API ----------

const SiteAPI = {
  // GET /site
  getSite() {
    return respond({ ...SITE, zones: ZONES });
  },

  // GET /catalog
  getCatalog() {
    return respond({ categories: CATEGORIES, types: SENSOR_TYPES });
  },

  // GET /sensors
  getSensors() {
    return respond(SENSORS.map(s => ({
      id: s.id, type: s.type, category: SENSOR_TYPES[s.type].category,
      zone: s.zone, x: s.x, y: s.y, label: s.label, node: s.node, link: s.link,
    })));
  },

  // GET /readings/latest
  getLatest() {
    advance();
    return respond({ cursor: server.seq, readings: server.latest, clock: clockPayload() });
  },

  // GET /readings?after=<cursor> — incremental raw feed
  getReadings({ after = 0, limit = 800, ...filter } = {}) {
    advance();
    let out = server.feed.filter(s => s.seq > after && matches(s, filter));
    const truncated = out.length > limit;
    if (truncated) out = out.slice(-limit);
    return respond({ cursor: server.seq, truncated, readings: out, clock: clockPayload() });
  },

  // GET /sensors/:id/history
  getHistory(sensorId, { limit = 180 } = {}) {
    advance();
    return respond((server.history[sensorId] || []).slice(-limit));
  },

  // GET /alerts
  getAlerts() {
    advance();
    return respond([...server.alerts.values()]);
  },

  // POST /alerts/:id/ack
  acknowledgeAlert(alertId) {
    for (const [key, a] of server.alerts) {
      if (a.id !== alertId) continue;
      a.acked = true;
      if (a.state === "rtn") server.alerts.delete(key);
    }
    return respond({ ok: true }, 60, 220);
  },

  // POST /alerts/ack-all
  acknowledgeAll() {
    for (const [key, a] of server.alerts) {
      a.acked = true;
      if (a.state === "rtn") server.alerts.delete(key);
    }
    return respond({ ok: true }, 60, 220);
  },

  // GET /scenarios — demo-only
  getScenarios() {
    return respond(SCENARIOS.map(({ effects, ...rest }) => rest));
  },

  // Demo controls — these would not exist on a real service
  sim: {
    setSpeed(speed) {
      advance();
      server.speed = speed;
      return respond(clockPayload(), 10, 30);
    },
    // Jump the scenario loop to loopT without rewinding timestamps
    seek(loopT) {
      advance();
      server.offset += loopT - loopTime(server.simT);
      return respond(clockPayload(), 10, 30);
    },
    stats() {
      return { calls: server.calls, samples: server.seq };
    },
  },

  evaluate,
};

window.SiteAPI = SiteAPI;

})();
