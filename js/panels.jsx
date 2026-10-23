// Side panels: filter rail, category/ops strip, alerts list.

(() => {

const { useState, useMemo } = React;
const { CATEGORIES, SENSOR_TYPES, ZONES } = window.Catalog;
const { STATUS_RANK, fmtValue, fmtTime } = window.Fmt;

const toggleIn = (set, key) => {
  const next = new Set(set);
  next.has(key) ? next.delete(key) : next.add(key);
  return next;
};

// ---------------- Filter rail ----------------

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "attention", label: "Warn+" },
  { value: "alarm", label: "Alarm" },
  { value: "offline", label: "Offline" },
];

function FilterRail({ filters, setFilters, sensors, latest, onZoneHover, showZones, setShowZones, sim, children }) {
  const counts = useMemo(() => {
    const cat = {}, zone = {};
    sensors.forEach(s => {
      cat[s.category] = (cat[s.category] || 0) + 1;
      zone[s.zone] = (zone[s.zone] || 0) + 1;
    });
    return { cat, zone };
  }, [sensors]);

  const zoneAttention = useMemo(() => {
    const z = {};
    sensors.forEach(s => {
      const st = latest[s.id]?.status || "normal";
      if (STATUS_RANK[st] > STATUS_RANK[z[s.zone] || "normal"]) z[s.zone] = st;
    });
    return z;
  }, [sensors, latest]);

  const typeOptions = Object.entries(SENSOR_TYPES)
    .filter(([, t]) => filters.categories.size === 0 || filters.categories.has(t.category))
    .sort((a, b) => a[1].name.localeCompare(b[1].name));

  const set = patch => setFilters(f => ({ ...f, ...patch }));
  const active = filters.categories.size || filters.zones.size || filters.type !== "all" || filters.status !== "all" || filters.q;

  return (
    <aside className="rail" aria-label="Filters">
      {children}
      <div className="rail-section">
        <label className="rail-title" htmlFor="q">Search</label>
        <input id="q" className="input" placeholder="ID, name or type…" value={filters.q}
               onChange={e => set({ q: e.target.value })} />
      </div>

      <div className="rail-section">
        <div className="rail-title">Status</div>
        <div className="seg" role="radiogroup">
          {STATUS_FILTERS.map(o => (
            <button key={o.value} role="radio" aria-checked={filters.status === o.value}
                    className={filters.status === o.value ? "on" : ""} onClick={() => set({ status: o.value })}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rail-section">
        <div className="rail-title">Category</div>
        {Object.entries(CATEGORIES).map(([key, c]) => (
          <label key={key} className={`check ${filters.categories.has(key) ? "on" : ""}`}>
            <input type="checkbox" checked={filters.categories.has(key)}
                   onChange={() => set({ categories: toggleIn(filters.categories, key), type: "all" })} />
            <CategoryIcon category={key} />
            <span className="check-label">{c.label}</span>
            <span className="count mono">{counts.cat[key] || 0}</span>
          </label>
        ))}
      </div>

      <div className="rail-section">
        <label className="rail-title" htmlFor="type">Sensor type</label>
        <select id="type" className="input" value={filters.type} onChange={e => set({ type: e.target.value })}>
          <option value="all">All types ({typeOptions.length})</option>
          {typeOptions.map(([key, t]) => <option key={key} value={key}>{t.name}</option>)}
        </select>
      </div>

      <div className="rail-section">
        <div className="rail-title">
          Location
          <label className="mini-toggle">
            <input type="checkbox" checked={showZones} onChange={e => setShowZones(e.target.checked)} /> outline
          </label>
        </div>
        {Object.entries(ZONES).map(([key, z]) => {
          const st = zoneAttention[key] || "normal";
          return (
            <label key={key} className={`check ${filters.zones.has(key) ? "on" : ""}`}
                   onMouseEnter={() => onZoneHover(key)} onMouseLeave={() => onZoneHover(null)}>
              <input type="checkbox" checked={filters.zones.has(key)}
                     onChange={() => set({ zones: toggleIn(filters.zones, key) })} />
              <span className="zone-code mono">{key}</span>
              <span className="check-label">{z.label}</span>
              {st !== "normal" && <StatusIcon status={st} size={11} />}
              <span className="count mono">{counts.zone[key] || 0}</span>
            </label>
          );
        })}
      </div>

      {active ? (
        <button className="btn ghost full" onClick={() => setFilters(window.EMPTY_FILTERS())}>Clear all filters ×</button>
      ) : null}

      <SimControls {...sim} />
    </aside>
  );
}

// Demo-only controls for driving the simulation
function SimControls({ clock, scenarios, speed, setSpeed, seek }) {
  if (!clock) return null;
  const loopT = clock.loopT;
  const mmss = t => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  return (
    <div className="rail-section sim">
      <div className="rail-title">Simulation <span className="tag">demo</span></div>
      <div className="sim-clock mono">
        LOOP {mmss(loopT)} / {mmss(clock.loopSeconds)}
        <div className="sim-bar"><div style={{ width: `${(loopT / clock.loopSeconds) * 100}%` }} /></div>
      </div>
      <div className="seg">
        {[1, 2, 5, 10].map(s => (
          <button key={s} className={speed === s ? "on" : ""} onClick={() => setSpeed(s)}>{s}×</button>
        ))}
      </div>
      <div className="scenario-list">
        {scenarios.map(sc => {
          const live = clock.activeScenarios.includes(sc.id);
          return (
            <button key={sc.id} className={`scenario ${live ? "live" : ""}`} onClick={() => seek(Math.max(0, sc.window[0] - 5))}
                    title={sc.story}>
              <CategoryIcon category={sc.category} size={14} />
              <span className="sc-title">{sc.title}</span>
              <span className="sc-time mono">{live ? "LIVE" : mmss(sc.window[0])}</span>
            </button>
          );
        })}
      </div>
      <div className="hint">Click a scenario to jump the loop to just before it starts.</div>
    </div>
  );
}

// ---------------- Category + ops strip ----------------

function deriveOps(latest) {
  const v = (id, d = null) => latest[id]?.value ?? d;
  const st = id => latest[id]?.status || "normal";
  const byType = prefix => Object.keys(latest).filter(id => id.startsWith(prefix));

  // Well state
  const gas = v("FT-GAS-MTR-01", 0), water = v("FT-WTR-SEP-01", 0);
  const plunger = v("PLUNGER-WH-01", 0), csg = v("PT-CSG-WH-01", 0), ssv = v("SSV-WH-01", 100);
  let well = { status: "normal", value: "FLOWING", why: `${gas.toLocaleString()} Mcf/d · ${water} bbl/d water` };
  if (ssv <= 10) well = { status: "alarm", value: "SHUT IN", why: "Surface safety valve closed" };
  else if (plunger >= 30 || csg >= 900) well = { status: "warning", value: "LOADING UP", why: `plunger ${plunger.toFixed(0)} min · ${gas.toLocaleString()} Mcf/d` };

  // Trucks & site work
  const lightning = v("LIGHTNING-MET-01", 75), gust = v("GUST-MET-01", 0), wind = v("WIND-MET-01", 0), berm = v("BERM-TNK-01", 0);
  const stop = [lightning <= 10 && `lightning ${lightning.toFixed(0)} mi`, gust >= 58 && `gusts ${gust.toFixed(0)} mph`, berm >= 6 && "berm full"].filter(Boolean);
  const limit = [lightning <= 20 && `lightning ${lightning.toFixed(0)} mi`, wind >= 30 && "wind", gust >= 40 && "gusts", berm >= 2 && "drain berm"].filter(Boolean);
  let ops = { status: "normal", value: "OPEN", why: "Hauling and gauging OK" };
  if (stop.length) ops = { status: "alarm", value: "SUSPENDED", why: stop.join(", ") };
  else if (limit.length) ops = { status: "warning", value: "LIMITED", why: limit.join(", ") };

  // Access
  const pers = v("PERS-GTE-01", 0), gateOpen = v("GATE-GTE-01", 0) >= 0.5, unticketed = v("HAUL-VAR-TNK-01", 0);
  let access = { status: "normal", value: "SECURE", why: "Gate closed · nobody on pad" };
  if (pers > 0) access = { status: "normal", value: `${pers} ON PAD`, why: `Lease operator · gate ${gateOpen ? "open" : "closed"}` };
  if (gateOpen && pers === 0) access = { status: "alarm", value: "UNBADGED ENTRY", why: "Gate open, nobody badged in" };
  else if (unticketed >= 5) access = { status: st("HAUL-VAR-TNK-01"), value: "NO HAUL TICKET", why: `${unticketed.toFixed(0)} bbl left T3 unticketed` };

  // Emissions
  const comb = v("COMB-T-CMB-01", 1450), ogi = v("OGI-CMB-01", 0);
  const emi = [];
  byType("HATCH-").forEach(id => { if (v(id, 0) >= 0.5) emi.push("thief hatch open"); });
  if (comb < 1200) emi.push("combustor pilot out");
  if (ogi >= 40) emi.push("plume on camera");
  const fence = [...byType("CH4-FL-"), ...byType("VOC-FL-")].filter(id => st(id) !== "normal");
  if (fence.length) emi.push("fenceline elevated");
  const emAlarm = comb <= 1000 || ogi >= 70 || fence.some(id => st(id) === "alarm");
  const emissions = emi.length
    ? { status: emAlarm ? "alarm" : "warning", value: emAlarm ? "VENTING" : "ELEVATED", why: [...new Set(emi)].join(", ") }
    : { status: "normal", value: "CONTROLLED", why: "Combustor lit · fenceline at background" };

  // Neighbours
  const noise = v("NOISE-RES-COM-01", 0), benzene = v("BTEX-COM-01", 0), pm = v("PM25-COM-01", 0);
  const nb = [st("NOISE-RES-COM-01") !== "normal" && "noise over limit", st("BTEX-COM-01") !== "normal" && "benzene", st("PM25-COM-01") !== "normal" && "dust"].filter(Boolean);
  const nbWorst = ["NOISE-RES-COM-01", "BTEX-COM-01", "PM25-COM-01"].reduce((w, id) => (STATUS_RANK[st(id)] > STATUS_RANK[w] ? st(id) : w), "normal");
  const neighbours = {
    status: nbWorst === "offline" ? "normal" : nbWorst,
    value: `${noise.toFixed(0)} dBA`,
    why: nb.length ? nb.join(", ") : `benzene ${benzene.toFixed(1)} ppb · PM2.5 ${pm.toFixed(0)}`,
  };

  return [
    { key: "well", label: "Well", ...well },
    { key: "ops", label: "Site work", ...ops },
    { key: "access", label: "Access", ...access },
    { key: "emissions", label: "Emissions", ...emissions },
    { key: "neighbours", label: "Neighbours", ...neighbours },
  ];
}

function StatusStrip({ sensors, latest, filters, setFilters }) {
  const byCat = useMemo(() => {
    const out = {};
    Object.keys(CATEGORIES).forEach(k => (out[k] = { total: 0, alarm: 0, warning: 0, offline: 0 }));
    sensors.forEach(s => {
      const st = latest[s.id]?.status || "normal";
      out[s.category].total++;
      if (out[s.category][st] != null && st !== "total") out[s.category][st]++;
    });
    return out;
  }, [sensors, latest]);
  const ops = deriveOps(latest);

  return (
    <section className="strip" aria-label="Status by category">
      <div className="strip-group cats">
        {Object.entries(CATEGORIES).map(([key, c]) => {
          const n = byCat[key];
          const worst = n.alarm ? "alarm" : n.warning ? "warning" : n.offline ? "offline" : "normal";
          const on = filters.categories.has(key);
          return (
            <button key={key} className={`tile st-${worst} ${on ? "on" : ""}`}
                    aria-pressed={on}
                    onClick={() => setFilters(f => ({ ...f, type: "all", categories: toggleIn(f.categories, key) }))}>
              <div className="tile-head">
                <CategoryIcon category={key} size={18} />
                <span className="tile-label">{c.label}</span>
              </div>
              <div className="tile-counts mono">
                {n.alarm > 0 && <span className="cnt st-alarm"><StatusIcon status="alarm" size={10} />{n.alarm}</span>}
                {n.warning > 0 && <span className="cnt st-warning"><StatusIcon status="warning" size={10} />{n.warning}</span>}
                {n.offline > 0 && <span className="cnt st-offline"><StatusIcon status="offline" size={10} />{n.offline}</span>}
                {worst === "normal" && <span className="cnt ok">all normal</span>}
                <span className="cnt total">{n.total}</span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="strip-group ops">
        {ops.map(o => (
          <div key={o.key} className={`op st-${o.status}`} title={o.why}>
            <div className="op-label">{o.label}</div>
            <div className="op-value mono">
              {o.status !== "normal" && <StatusIcon status={o.status} size={11} />} {o.value}
            </div>
            <div className="op-why">{o.why}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------- Alerts ----------------

const PRIORITY_RANK = { alarm: 3, warning: 2, fault: 1 };

function alertMessage(a) {
  const t = SENSOR_TYPES[a.type];
  if (a.priority === "fault") return "No data — sensor not reporting (comms fault)";
  if (t.binary) return `${t.name}: ${t.binary[1].toLowerCase()}`;
  const cmp = a.dir === "lo" ? "≤" : "≥";
  return `${fmtValue(a.value, a.type)} ${t.unit} ${a.state === "rtn" ? "(now normal)" : `${cmp} ${a.limit}`}`;
}

function AlertsPanel({ alerts, sensorsById, onSelect, onAck, onAckAll, selectedId, isVisible }) {
  const [matchFilters, setMatchFilters] = useState(false);
  const list = alerts
    .filter(a => !matchFilters || isVisible(sensorsById[a.sensorId]))
    .sort((a, b) =>
      (a.state === "rtn") - (b.state === "rtn") ||
      PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] ||
      b.raisedAt.localeCompare(a.raisedAt));
  const unacked = alerts.filter(a => !a.acked).length;

  return (
    <section className="alerts" aria-label="Alerts">
      <header className="panel-head">
        <span className="panel-title">Alerts</span>
        <span className="mono muted">{alerts.length} open · {unacked} unack</span>
        <button className="btn small" disabled={!unacked} onClick={onAckAll}>Ack all</button>
      </header>
      <label className="mini-toggle pad">
        <input type="checkbox" checked={matchFilters} onChange={e => setMatchFilters(e.target.checked)} />
        Only alerts matching filters
      </label>
      <ul className="alert-list">
        {list.length === 0 && <li className="empty">No open alerts{matchFilters ? " for these filters" : ""}.</li>}
        {list.map(a => {
          const s = sensorsById[a.sensorId];
          const statusForIcon = a.state === "rtn" ? "normal" : a.priority;
          return (
            <li key={a.id}
                className={`alert pr-${a.priority} ${a.acked ? "acked" : "unacked"} ${a.state} ${selectedId === a.sensorId ? "sel" : ""}`}
                onClick={() => onSelect(a.sensorId)}>
              <div className="alert-row1">
                <StatusIcon status={statusForIcon === "normal" ? "normal" : a.priority} size={13} />
                <span className="alert-pr mono">{a.priority.toUpperCase()}</span>
                <span className="alert-state mono">{a.state === "rtn" ? "RTN" : a.acked ? "ACK" : "UNACK"}</span>
                <span className="alert-time mono">{fmtTime(a.raisedAt)}</span>
              </div>
              <div className="alert-name">{s?.label}</div>
              <div className="alert-msg mono">
                <CategoryIcon category={a.category} size={13} /> {a.sensorId} · {alertMessage(a)}
              </div>
              {!a.acked && (
                <button className="btn small ack" onClick={e => { e.stopPropagation(); onAck(a.id); }}>Ack</button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

Object.assign(window, { FilterRail, StatusStrip, AlertsPanel });

})();
