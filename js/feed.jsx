// Raw data feed — every sample as it arrives from the API, newest first.
// Table view for scanning, JSON view for "what does the payload look like".

(() => {

const { useState, useRef } = React;
const { SENSOR_TYPES } = window.Catalog;
const { STATUS_LABEL, fmtValue, fmtTime, fmtUnit } = window.Fmt;

const MAX_SHOWN = 250;

function RawFeed({ rows, matchSample, rate, collapsed, setCollapsed, follow, selectedId }) {
  const [paused, setPaused] = useState(false);
  const [exceptionsOnly, setExceptionsOnly] = useState(false);
  const [view, setView] = useState("table");
  const frozen = useRef(rows);
  if (!paused) frozen.current = rows;

  const shown = [];
  for (const r of frozen.current) {
    if (follow && selectedId && r.sensorId !== selectedId) continue;
    if (exceptionsOnly && r.status === "normal") continue;
    if (!matchSample(r)) continue;
    shown.push(r);
    if (shown.length >= MAX_SHOWN) break;
  }

  return (
    <section className={`feed ${collapsed ? "collapsed" : ""}`} aria-label="Raw data feed">
      <header className="panel-head feed-head">
        <button className="btn icon" aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}
                aria-label={collapsed ? "Expand feed" : "Collapse feed"}>{collapsed ? "▴" : "▾"}</button>
        <span className="panel-title">Raw feed</span>
        <span className="mono muted">{rate.toFixed(1)} samples/s · showing {shown.length}</span>
        {follow && selectedId && <span className="tag mono">sensor: {selectedId}</span>}
        <div className="feed-controls">
          <label className="mini-toggle">
            <input type="checkbox" checked={exceptionsOnly} onChange={e => setExceptionsOnly(e.target.checked)} />
            Exceptions only
          </label>
          <div className="seg small">
            <button className={view === "table" ? "on" : ""} onClick={() => setView("table")}>Table</button>
            <button className={view === "json" ? "on" : ""} onClick={() => setView("json")}>JSON</button>
          </div>
          <button className={`btn small ${paused ? "on" : ""}`} onClick={() => setPaused(!paused)}>
            {paused ? "▶ Resume" : "❚❚ Pause"}
          </button>
        </div>
      </header>
      {!collapsed && (
        <div className="feed-body">
          {view === "table" ? (
            <table className="feed-table mono">
              <thead>
                <tr>
                  <th>Time</th><th>Sensor</th><th className="hide-sm">Type</th><th>Zone</th>
                  <th className="num">Value</th><th>Unit</th><th>Status</th>
                  <th className="hide-sm">Quality</th><th className="hide-sm">Node / link</th><th className="num hide-sm">Lat ms</th><th className="num hide-sm">Seq</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(r => (
                  <tr key={r.seq} className={`st-${r.status}`}>
                    <td>{fmtTime(r.ts, true)}</td>
                    <td className="cell-id"><CategoryIcon category={r.category} size={12} /> {r.sensorId}</td>
                    <td className="hide-sm muted">{SENSOR_TYPES[r.type].name}</td>
                    <td>{r.zone}</td>
                    <td className="num">{fmtValue(r.value, r.type)}</td>
                    <td className="muted">{fmtUnit(r.type)}</td>
                    <td className="cell-status">{r.status !== "normal" && <StatusIcon status={r.status} size={10} />} {STATUS_LABEL[r.status]}</td>
                    <td className="hide-sm">{r.quality}</td>
                    <td className="hide-sm muted">{r.node} / {r.link}</td>
                    <td className="num hide-sm">{r.latencyMs}</td>
                    <td className="num hide-sm muted">{r.seq}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <pre className="feed-json">
              {shown.slice(0, 80).map(r => (
                <div key={r.seq} className={`json-line st-${r.status}`}>{JSON.stringify(r)}</div>
              ))}
            </pre>
          )}
          {shown.length === 0 && <div className="empty">No samples match the current filters.</div>}
        </div>
      )}
    </section>
  );
}

window.RawFeed = RawFeed;

})();
