// Sensor detail drawer — opens from a marker, an alert or a feed row.
// Holds everything about one sensor: live value and limits, its alert, the
// trend, what it tells you, the rest of its location, recent samples,
// telemetry, and the raw reading as the API returned it.

(() => {

const { useState, useRef, useEffect } = React;
const { CATEGORIES, SENSOR_TYPES, ZONES } = window.Catalog;
const { STATUS_LABEL, STATUS_RANK, fmtValue, fmtTime, fmtUnit, limitText } = window.Fmt;

function Sparkline({ data, typeKey }) {
  const [hi, setHi] = useState(null);
  const ref = useRef(null);
  const VW = 400, VH = 130, PAD_L = 4, PAD_R = 4, PAD_T = 8, PAD_B = 8;
  const pts = data.filter(d => d.value != null);
  if (pts.length < 2) return <div className="spark-empty mono">Collecting data…</div>;

  const t = SENSOR_TYPES[typeKey];
  let lo = Math.min(...pts.map(p => p.value)), up = Math.max(...pts.map(p => p.value));
  const span = Math.max(up - lo, Math.abs(up) * 0.02, 0.5);
  const lims = [];
  if (t.limits?.hi) lims.push(["warning", t.limits.hi[0]], ["alarm", t.limits.hi[1]]);
  if (t.limits?.lo) lims.push(["warning", t.limits.lo[0]], ["alarm", t.limits.lo[1]]);
  const shown = lims.filter(([, v]) => v >= lo - span * 1.2 && v <= up + span * 1.2);
  shown.forEach(([, v]) => { lo = Math.min(lo, v); up = Math.max(up, v); });
  const pad = (up - lo) * 0.1 || 1;
  lo -= pad; up += pad;

  const t0 = pts[0].simT, t1 = pts[pts.length - 1].simT;
  const x = s => PAD_L + (VW - PAD_L - PAD_R) * (t1 === t0 ? 0 : (s - t0) / (t1 - t0));
  const y = v => PAD_T + (VH - PAD_T - PAD_B) * (1 - (v - lo) / (up - lo));
  const d = pts.map((p, i) => `${i ? "L" : "M"}${x(p.simT).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");

  const onMove = e => {
    const r = ref.current.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * VW;
    let best = 0;
    pts.forEach((p, i) => { if (Math.abs(x(p.simT) - sx) < Math.abs(x(pts[best].simT) - sx)) best = i; });
    setHi(best);
  };
  const hp = hi != null ? pts[hi] : null;
  const last = pts[pts.length - 1];

  return (
    <div className="spark" ref={ref} onMouseMove={onMove} onMouseLeave={() => setHi(null)}>
      <svg viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none" className="spark-svg">
        {shown.map(([k, v], i) => (
          <line key={i} x1={PAD_L} x2={VW - PAD_R} y1={y(v)} y2={y(v)} className={`lim lim-${k}`} />
        ))}
        <path d={d} className="spark-line" />
        <circle cx={x(last.simT)} cy={y(last.value)} r="3" className="spark-dot" />
        {hp && <line x1={x(hp.simT)} x2={x(hp.simT)} y1={PAD_T} y2={VH - PAD_B} className="spark-cross" />}
        {hp && <circle cx={x(hp.simT)} cy={y(hp.value)} r="3.5" className="spark-dot hov" />}
      </svg>
      <div className="spark-axis mono">
        <span>{fmtTime(pts[0].ts)}</span>
        <span>{(t1 - t0).toFixed(0)} s window</span>
        <span>{fmtTime(last.ts)}</span>
      </div>
      {shown.length > 0 && (
        <div className="spark-legend mono">
          {shown.some(s => s[0] === "warning") && <span><i className="lim-key warning" /> warn limit</span>}
          {shown.some(s => s[0] === "alarm") && <span><i className="lim-key alarm" /> alarm limit</span>}
        </div>
      )}
      {hp && (
        <div className="spark-tip mono" style={{ left: `${(x(hp.simT) / VW) * 100}%` }}>
          {fmtValue(hp.value, typeKey)} {fmtUnit(typeKey)} · {fmtTime(hp.ts)}
        </div>
      )}
    </div>
  );
}

function Section({ title, children, aside }) {
  return (
    <section className="dr-sec">
      <h3 className="dr-h">{title}{aside && <span className="dr-aside">{aside}</span>}</h3>
      {children}
    </section>
  );
}

function SensorDrawer({
  sensor, reading, history, alert, sensors, latest, alerts,
  onSelect, onClose, onAck, feedFollow, setFeedFollow,
}) {
  const closeRef = useRef(null);
  useEffect(() => { closeRef.current?.focus(); }, []);

  const type = SENSOR_TYPES[sensor.type];
  const cat = CATEGORIES[sensor.category];
  const zone = ZONES[sensor.zone];
  const status = reading?.status || "normal";

  const neighbours = sensors
    .filter(s => s.zone === sensor.zone && s.id !== sensor.id)
    .map(s => ({ s, r: latest[s.id] }))
    .sort((a, b) => STATUS_RANK[b.r?.status || "normal"] - STATUS_RANK[a.r?.status || "normal"] || a.s.label.localeCompare(b.s.label));
  const zoneAlerts = alerts.filter(a => a.zone === sensor.zone && a.sensorId !== sensor.id);
  const recent = history.slice(-8).reverse();

  return (
    <aside className={`drawer st-${status}`} role="dialog" aria-label={`${sensor.label} details`}>
      <header className="dr-head">
        <div className="dr-row">
          <CategoryIcon category={sensor.category} size={18} />
          <span className="panel-title">{cat.label}</span>
          <span className="mono muted">{sensor.id}</span>
          <button ref={closeRef} className="btn icon dr-close" aria-label="Close details (Esc)" onClick={onClose}>×</button>
        </div>
        <h2 className="dr-name">{sensor.label}</h2>
        <div className="detail-type">{type.name} · {zone.label}</div>
        <div className="detail-reading">
          <span className="detail-value mono">{fmtValue(reading?.value, sensor.type)}</span>
          <span className="detail-unit">{fmtUnit(sensor.type)}</span>
          <span className={`pill st-${status}`}><StatusIcon status={status} size={10} /> {STATUS_LABEL[status]}</span>
        </div>
        <div className="detail-limits mono">{limitText(sensor.type)}</div>
        <div className="dr-actions">
          {alert && !alert.acked && (
            <button className="btn small primary" onClick={() => onAck(alert.id)}>Acknowledge {alert.priority}</button>
          )}
          <button className={`btn small ${feedFollow ? "on" : ""}`} aria-pressed={feedFollow}
                  onClick={() => setFeedFollow(!feedFollow)}>
            {feedFollow ? "Feed: this sensor only" : "Show only this sensor in the feed"}
          </button>
        </div>
      </header>

      <div className="dr-body">
        {alert && (
          <Section title="Alert" aside={alert.id}>
            <dl className="detail-kv mono">
              <dt>Priority</dt><dd className={alert.priority === "fault" ? "muted" : `st-text-${alert.priority}`}>{alert.priority.toUpperCase()}</dd>
              <dt>State</dt><dd>{alert.state === "rtn" ? "Returned to normal" : alert.acked ? "Acknowledged" : "Unacknowledged"}</dd>
              <dt>Raised</dt><dd>{fmtTime(alert.raisedAt)}</dd>
              <dt>Updated</dt><dd>{fmtTime(alert.updatedAt)}</dd>
              {alert.limit != null && (
                <><dt>Limit</dt><dd>{type.binary ? `when ${type.binary[1]}` : `${alert.dir === "lo" ? "≤" : "≥"} ${alert.limit} ${alert.unit}`}</dd></>
              )}
              {alert.peak != null && <><dt>Peak</dt><dd>{fmtValue(alert.peak, sensor.type)} {fmtUnit(sensor.type)}</dd></>}
            </dl>
          </Section>
        )}

        <Section title="Trend">
          <Sparkline data={history} typeKey={sensor.type} />
        </Section>

        <Section title="What it measures">
          <p>{type.measures}</p>
        </Section>
        <Section title="What it tells you">
          <ul>{type.tells.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </Section>

        <Section title={`Also at ${zone.label}`} aside={`${neighbours.length} sensors`}>
          {neighbours.length === 0 ? <p className="muted">No other sensors here.</p> : (
            <ul className="dr-list">
              {neighbours.map(({ s, r }) => (
                <li key={s.id}>
                  <button className={`dr-item st-${r?.status || "normal"}`} onClick={() => onSelect(s.id)}>
                    <CategoryIcon category={s.category} size={13} />
                    <span className="dr-item-label">{s.label}</span>
                    <span className="mono dr-item-val">
                      {r?.status && r.status !== "normal" && <StatusIcon status={r.status} size={10} />} {fmtValue(r?.value, s.type)} {fmtUnit(s.type)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {zoneAlerts.length > 0 && (
            <p className="dr-note mono">
              {zoneAlerts.length} other open alert{zoneAlerts.length > 1 ? "s" : ""} in this location
            </p>
          )}
        </Section>

        <Section title="Recent samples" aside={`every ${type.sim.period} s`}>
          <table className="dr-table mono">
            <tbody>
              {recent.map(r => (
                <tr key={r.seq} className={`st-${r.status}`}>
                  <td>{fmtTime(r.ts, true)}</td>
                  <td className="num">{fmtValue(r.value, r.type)} {fmtUnit(r.type)}</td>
                  <td>{r.status !== "normal" && <StatusIcon status={r.status} size={10} />} {STATUS_LABEL[r.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="Telemetry">
          <dl className="detail-kv mono">
            <dt>Node</dt><dd>{sensor.node}</dd>
            <dt>Link</dt><dd>{sensor.link}</dd>
            <dt>Period</dt><dd>{type.sim.period} s</dd>
            <dt>Latency</dt><dd>{reading?.latencyMs ?? "—"} ms</dd>
            <dt>Last</dt><dd>{reading ? fmtTime(reading.ts, true) : "—"}</dd>
            <dt>Quality</dt><dd>{reading?.quality || "—"}</dd>
          </dl>
        </Section>

        <Section title="Raw reading">
          <details className="dr-raw">
            <summary>Latest sample as returned by the API</summary>
            <pre className="mono">{reading ? JSON.stringify(reading, null, 2) : "—"}</pre>
          </details>
        </Section>
      </div>
    </aside>
  );
}

window.SensorDrawer = SensorDrawer;

})();
