// App shell — loads reference data, polls the (simulated) API, owns filter
// state, and lays out strip / rail / schematic / alerts / feed.

(() => {

const { useState, useEffect, useMemo, useRef, useCallback } = React;
const API = window.SiteAPI;
const { SENSOR_TYPES, ZONES } = window.Catalog;
const { STATUS_RANK } = window.Fmt;

const POLL_MS = 1000;
const FEED_KEEP = 1500;

window.EMPTY_FILTERS = () => ({ categories: new Set(), zones: new Set(), type: "all", status: "all", q: "" });

function statusMatches(filter, status) {
  if (filter === "all") return true;
  if (filter === "attention") return status === "warning" || status === "alarm";
  if (filter === "alarm") return status === "alarm";
  if (filter === "offline") return status === "offline";
  return true;
}

function readTheme() {
  return document.documentElement.getAttribute("data-theme") || "dark";
}

function App() {
  const [site, setSite] = useState(null);
  const [sensors, setSensors] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [latest, setLatest] = useState({});
  const [feed, setFeed] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [clock, setClock] = useState(null);
  const [rate, setRate] = useState(0);
  const [pollMs, setPollMs] = useState(0);
  const [apiError, setApiError] = useState(null);

  const [filters, setFilters] = useState(window.EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState(null);
  const [history, setHistory] = useState([]);
  const [hoverZone, setHoverZone] = useState(null);
  const [showZones, setShowZones] = useState(false);
  const [feedCollapsed, setFeedCollapsed] = useState(false);
  const [feedFollow, setFeedFollow] = useState(false);
  const [speed, setSpeedState] = useState(1);
  const [theme, setTheme] = useState(readTheme);

  const cursor = useRef(0);
  const selectedRef = useRef(null);
  selectedRef.current = selectedId;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("wsm-theme", theme); } catch {}
  }, [theme]);

  // Initial load: reference data + current snapshot. ?t=<seconds> jumps the
  // scenario loop (handy for demos); ?speed=<n> sets sim speed.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const t = parseFloat(params.get("t")), sp = parseFloat(params.get("speed"));
    const prep = [];
    if (!isNaN(t)) prep.push(API.sim.seek(t));
    if (!isNaN(sp)) { prep.push(API.sim.setSpeed(sp)); setSpeedState(sp); }
    Promise.all(prep).then(() => Promise.all([API.getSite(), API.getSensors(), API.getScenarios(), API.getLatest(), API.getAlerts(), API.getReadings({ after: 0, limit: 400 })])
      .then(([si, s, sc, snap, al, recent]) => {
        setSite(si);
        setSensors(s);
        setScenarios(sc);
        setLatest(snap.readings);
        setClock(snap.clock);
        setAlerts(al);
        setFeed(recent.readings.slice().reverse());
        cursor.current = recent.cursor;
      }))
      .catch(err => setApiError(String(err)));
  }, []);

  // Poll loop
  useEffect(() => {
    if (!site) return;
    let alive = true;
    const tick = async () => {
      const t0 = performance.now();
      try {
        const [batch, al] = await Promise.all([API.getReadings({ after: cursor.current }), API.getAlerts()]);
        if (!alive) return;
        cursor.current = batch.cursor;
        setPollMs(performance.now() - t0);
        setClock(batch.clock);
        setAlerts(al);
        setRate(r => r * 0.6 + (batch.readings.length / (POLL_MS / 1000)) * 0.4);
        if (batch.readings.length) {
          setLatest(prev => {
            const next = { ...prev };
            batch.readings.forEach(r => { next[r.sensorId] = r; });
            return next;
          });
          setFeed(prev => batch.readings.slice().reverse().concat(prev).slice(0, FEED_KEEP));
          const sel = selectedRef.current;
          if (sel) {
            const mine = batch.readings.filter(r => r.sensorId === sel);
            if (mine.length) setHistory(h => h.concat(mine).slice(-180));
          }
        }
        setApiError(null);
      } catch (err) {
        setApiError(String(err));
      }
    };
    const id = setInterval(tick, POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, [site]);

  // Selection → fetch history
  useEffect(() => {
    if (!selectedId) { setHistory([]); setFeedFollow(false); return; }
    let alive = true;
    API.getHistory(selectedId).then(h => alive && setHistory(h));
    return () => { alive = false; };
  }, [selectedId]);

  const sensorsById = useMemo(() => Object.fromEntries(sensors.map(s => [s.id, s])), [sensors]);
  const alertBySensor = useMemo(() => Object.fromEntries(alerts.map(a => [a.sensorId, a])), [alerts]);

  const q = filters.q.trim().toLowerCase();
  const matchBase = useCallback((s) => {
    if (filters.categories.size && !filters.categories.has(s.category)) return false;
    if (filters.zones.size && !filters.zones.has(s.zone)) return false;
    if (filters.type !== "all" && s.type !== filters.type) return false;
    if (q) {
      const hay = `${s.id} ${s.label || ""} ${SENSOR_TYPES[s.type].name}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }, [filters, q]);

  const isVisible = useCallback(
    s => !!s && matchBase(s) && statusMatches(filters.status, latest[s.id]?.status || "normal"),
    [matchBase, filters.status, latest]);

  const matchSample = useCallback(
    r => matchBase({ ...sensorsById[r.sensorId], ...r }) && statusMatches(filters.status, r.status),
    [matchBase, filters.status, sensorsById]);

  const onSelect = useCallback(id => setSelectedId(prev => (prev === id ? null : id)), []);
  const onZoneClick = useCallback(z => setFilters(f => {
    const zones = new Set(f.zones);
    zones.has(z) ? zones.delete(z) : zones.add(z);
    return { ...f, zones };
  }), []);

  const ack = async id => { await API.acknowledgeAlert(id); setAlerts(await API.getAlerts()); };
  const ackAll = async () => { await API.acknowledgeAll(); setAlerts(await API.getAlerts()); };
  const setSpeed = async s => { setSpeedState(s); setClock(await API.sim.setSpeed(s)); };
  const seek = async t => { setClock(await API.sim.seek(t)); };

  if (apiError && !site) return <div className="loading mono">API error: {apiError}</div>;
  if (!site) return <div className="loading mono">Connecting to Sigil Watch API…</div>;

  const selected = selectedId ? sensorsById[selectedId] : null;
  const visibleCount = sensors.filter(isVisible).length;
  const offline = sensors.filter(s => latest[s.id]?.status === "offline").length;
  const unacked = alerts.filter(a => !a.acked).length;
  const worstAlert = alerts.reduce((w, a) => (a.state === "active" && STATUS_RANK[a.priority] > STATUS_RANK[w] ? a.priority : w), "normal");
  const stats = API.sim.stats();

  return (
    <div className={`app ${feedCollapsed ? "feed-collapsed" : ""}`}>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 22 22">
              <path d="M 11 2 L 20 19 L 2 19 Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="11" cy="13" r="2" fill="currentColor" />
            </svg>
          </div>
          <div>
            <div className="brand-name">sigilint</div>
            <div className="brand-sub mono">sigil watch // well site v0.1</div>
          </div>
        </div>
        <div className="site mono">
          <span className="site-name">{site.name}</span>
          <span className="sep">//</span><span>API {site.api}</span>
          <span className="sep hide-sm">//</span><span className="hide-sm">{site.formation}</span>
          <span className="sep hide-sm">//</span><span className="hide-sm">{site.county}</span>
          <span className="sep hide-md">//</span>
          <span className="hide-md" title={`Location: ${site.locationSource}`}>
            {site.lat.toFixed(5)}, {site.lon.toFixed(5)}
          </span>
        </div>
        <div className="topbar-right">
          <span className={`alarm-badge mono st-${worstAlert}`}>
            {worstAlert !== "normal" && <StatusIcon status={worstAlert} size={11} />} {unacked} UNACK
          </span>
          <span className="clock mono">{clock ? new Date(clock.now).toISOString().slice(11, 19) : "--:--:--"}Z</span>
          <button className="btn small" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  aria-label="Toggle light / dark theme">
            {theme === "dark" ? "☀ Light" : "☾ Dark"}
          </button>
        </div>
      </header>

      <StatusStrip sensors={sensors} latest={latest} filters={filters} setFilters={setFilters} />

      <div className="main">
        <FilterRail
          filters={filters} setFilters={setFilters} sensors={sensors} latest={latest}
          onZoneHover={setHoverZone} showZones={showZones} setShowZones={setShowZones}
          sim={{ clock, scenarios, speed, setSpeed, seek }}
        />

        <section className="stage" aria-label="Well site schematic">
          <SiteSchematic
            sensors={sensors} latest={latest} alertBySensor={alertBySensor} isVisible={isVisible}
            selectedId={selectedId} onSelect={onSelect}
            focusZones={filters.zones} hoverZone={hoverZone} onZoneHover={setHoverZone} onZoneClick={onZoneClick}
            showZones={showZones}
          >
            <MetCard latest={latest} />
            <div className="stage-note mono">
              {visibleCount}/{sensors.length} sensors shown · click a sensor for detail · click a module to filter by location
            </div>
          </SiteSchematic>
        </section>

        <div className="side">
          {selected && (
            <SensorDetail
              sensor={selected} reading={latest[selected.id]} history={history}
              onClose={() => setSelectedId(null)} feedFollow={feedFollow} setFeedFollow={setFeedFollow}
            />
          )}
          <AlertsPanel
            alerts={alerts} sensorsById={sensorsById} onSelect={onSelect} selectedId={selectedId}
            onAck={ack} onAckAll={ackAll} isVisible={isVisible}
          />
        </div>
      </div>

      <RawFeed
        rows={feed} matchSample={matchSample} rate={rate}
        collapsed={feedCollapsed} setCollapsed={setFeedCollapsed}
        follow={feedFollow} selectedId={selectedId}
      />

      <footer className="statusbar mono">
        <span>TELEMETRY: <b className={offline ? "st-text-warning" : "st-text-ok"}>{offline ? "DEGRADED" : "OK"}</b></span>
        <span>NODES {sensors.length - offline}/{sensors.length}</span>
        <span className="hide-sm">POLL {pollMs.toFixed(0)} ms</span>
        <span className="hide-sm">API CALLS {stats.calls}</span>
        <span className="hide-sm">SAMPLES {stats.samples.toLocaleString()}</span>
        <span>SIM {speed}×</span>
        <span className="disclaimer" title={site.source}>
          Well identity: RRC public GIS · equipment, readings &amp; events SIMULATED · demo thresholds
        </span>
        {apiError && <span className="st-text-alarm">API ERROR</span>}
      </footer>
    </div>
  );
}

// Weather card floating on the schematic
function MetCard({ latest }) {
  const v = (id, d) => latest[id]?.value ?? d;
  const dir = v("WDIR-MET-01", 170), wind = v("WIND-MET-01", 0), gust = v("GUST-MET-01", 0);
  const temp = v("AIRT-MET-01", 0), rain = v("RAIN-MET-01", 0), baro = v("BARO-MET-01", 0);
  const lightning = v("LIGHTNING-MET-01", 75);
  const compass = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(dir / 45) % 8];
  const st = id => latest[id]?.status || "normal";
  const Row = ({ id, label, value }) => (
    <div className={`met-row st-${st(id)}`}>
      <span>{label}</span>
      <span className="mono">{st(id) !== "normal" && <StatusIcon status={st(id)} size={9} />} {value}</span>
    </div>
  );
  return (
    <div className="met-card" aria-label="Weather summary">
      <div className="met-head mono">WEATHER · PAD</div>
      <div className="met-top">
        <svg width="54" height="54" viewBox="-27 -27 54 54" aria-hidden="true">
          <circle r="24" className="met-ring" />
          {["N", "E", "S", "W"].map((c, i) => (
            <text key={c} x={[0, 19, 0, -19][i]} y={[-17, 0, 19, 0][i]} className="met-cardinal"
                  textAnchor="middle" dominantBaseline="central">{c}</text>
          ))}
          {/* arrow points where the wind blows TO */}
          <g transform={`rotate(${dir + 180})`}>
            <line x1="0" y1="11" x2="0" y2="-12" className="met-arrow" />
            <path d="M0,-15 L4,-8 L-4,-8 Z" className="met-arrow-head" />
          </g>
        </svg>
        <div>
          <div className="met-wind mono">{wind.toFixed(0)}<span> mph</span></div>
          <div className="met-sub mono">from {compass} {dir.toFixed(0)}° · G{gust.toFixed(0)}</div>
        </div>
      </div>
      <Row id="AIRT-MET-01" label="Temperature" value={`${temp.toFixed(0)} °F`} />
      <Row id="RAIN-MET-01" label="Rain" value={rain > 0.01 ? `${rain.toFixed(2)} in/hr` : "none"} />
      <Row id="BARO-MET-01" label="Pressure" value={`${baro.toFixed(2)} inHg`} />
      <Row id="LIGHTNING-MET-01" label="Lightning" value={lightning >= 60 ? "none nearby" : `${lightning.toFixed(0)} mi`} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

})();
